'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, RotateCw, Shield, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUpload, FileUploadTrigger } from '@/components/ui/file-upload'
import { Topbar } from '@/components/layout/topbar'
import { saveAs } from 'file-saver'
import { generateDocx } from '@/lib/export/docx'
import { fetchProfile } from '@/lib/profile'
import { createClient } from '@/lib/supabase/client'
import { reportToPlate } from '@/lib/editor/report-to-plate'
import { plateToSections } from '@/lib/editor/plate-to-sections'
import { useAutoSave } from '@/hooks/use-auto-save'
import templateData from '@/lib/template.json'
import { PlateDocEditor, type PlateEditorHandle } from './plate-editor'
import { TocSidebar } from './toc-sidebar'
import { WorkspaceFooter } from './workspace-footer'
import { ClinicalAssistantPanel } from './clinical-assistant-panel'
import type { ReportSection, Flag, Participant } from '@/lib/workspace/types'
import type { Value } from 'platejs'

// Round-3 UA-4: list of sections the Resume loop will iterate over when
// continuing a failed-with-partial report. Mirrors the generatableSections
// filter in app/generate/page.tsx so a resume produces the same surface
// as a from-scratch generation would.
type GeneratableSection = { name: string; order: number; auto_generate?: boolean }
const RESUMABLE_SECTIONS = (templateData.sections as GeneratableSection[])
  .filter((s) => !s.auto_generate)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.name)
const STANDARDISED_FINALISE_SECTIONS = [
  'Part D: Assessment Findings',
  'Part E: Summary & Recommendations',
] as const

type Sections = Record<string, { title: string; content: string }>

interface ParsedStandardisedPayload {
  scores: Record<string, unknown>
  summaries?: string[]
  error?: string
}

interface Report {
  id: string
  sections: Sections
  status: string
  assessment_id: string | null
  planner_review: { flags?: PlannerFlag[] } | null
  updated_at: string | null
}

interface PlannerFlag {
  sectionId: string
  severity: 'critical' | 'warning' | 'suggestion'
  issue: string
  recommendation: string
  ndisRationale: string
  originalText?: string
  refined?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mapPlannerFlags(plannerFlags: PlannerFlag[]): Flag[] {
  return plannerFlags.map((f, i) => ({
    id: `flag-${i}`,
    sev: f.severity,
    section: f.sectionId,
    title: f.issue,
    desc: f.recommendation,
    fix: f.recommendation,
    rationale: f.ndisRationale,
    refined: f.refined ?? '',
    originalText: f.originalText ?? '',
    resolved: false,
  }))
}

interface WorkspaceLayoutProps {
  reportId: string
}

export function WorkspaceLayout({ reportId }: WorkspaceLayoutProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [plateValue, setPlateValue] = useState<Value | null>(null)
  const [sectionKeys, setSectionKeys] = useState<string[]>([])
  const [tocSections, setTocSections] = useState<ReportSection[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const [activeSection, setActiveSection] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [assistantCollapsed, setAssistantCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1180,
  )

  // Round-3 UA-4: Resume affordance state. `isResuming` gates the banner +
  // disables the button while the loop runs. `resumeProgress` surfaces
  // per-section progress because the loop can take 1-3 minutes for the
  // remaining 3-5 sections on a typical failed report.
  const [isResuming, setIsResuming] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeProgress, setResumeProgress] = useState<
    { current: number; total: number; sectionName: string } | null
  >(null)
  const [isFinalisingAssessments, setIsFinalisingAssessments] = useState(false)
  const [finaliseProgress, setFinaliseProgress] = useState<string | null>(null)
  const [finaliseError, setFinaliseError] = useState<string | null>(null)

  const editorRef = useRef<PlateEditorHandle>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  // Fetch report data
  useEffect(() => {
    async function load() {
      // Defense-in-depth: explicit user_id filter alongside RLS so a single
      // policy bug can't expose another clinician's data. Auth check runs
      // first because /workspace must never serve content to an anon user.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const { data: reportData } = await supabase
        .from('reports')
        .select('id, sections, status, assessment_id, planner_review, updated_at')
        .eq('id', reportId)
        .eq('user_id', user.id)
        .single()

      if (!reportData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const r: Report = {
        id: reportData.id,
        sections: (reportData.sections as Sections) ?? {},
        status: reportData.status,
        assessment_id: reportData.assessment_id,
        planner_review: reportData.planner_review as Report['planner_review'],
        updated_at: (reportData as { updated_at?: string | null }).updated_at ?? null,
      }
      setReport(r)

      // Convert sections to Plate nodes
      const { value, sectionKeys: keys } = reportToPlate(r.sections)
      setPlateValue(value)
      setSectionKeys(keys)

      // Build TOC sections
      const toc: ReportSection[] = keys.map((key) => ({
        id: key,
        title: r.sections[key]?.title ?? key,
      }))
      setTocSections(toc)
      if (toc.length > 0) setActiveSection(toc[0].id)

      // Convert planner flags
      setFlags(mapPlannerFlags(r.planner_review?.flags ?? []))

      // Fetch participant info
      if (reportData.assessment_id) {
        const { data: assessment } = await supabase
          .from('assessments')
          .select('participant_name, ndis_number, assessor_name')
          .eq('id', reportData.assessment_id)
          .single()

        if (assessment) {
          setParticipant({
            name: (assessment as Record<string, string>).participant_name ?? 'Participant',
            ndisNumber: (assessment as Record<string, string>).ndis_number ?? '',
            assessor: (assessment as Record<string, string>).assessor_name ?? '',
            reportDate: new Date().toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          })
        }
      }

      setLoading(false)
    }
    load()
  }, [reportId, supabase])

  // Auto-save
  const saveToSupabase = useCallback(async () => {
    const editor = editorRef.current?.editor
    if (!editor || !report) return

    const sections = plateToSections(editor.children, sectionKeys, editor)
    // Defense-in-depth: pin the update to this user even though RLS already
    // enforces it, so an audit log on the row will name the right clinician.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('reports')
      .update({ sections })
      .eq('id', report.id)
      .eq('user_id', user.id)
  }, [report, sectionKeys, supabase])

  const { markDirty, saveStatus, lastError, flush: retrySave } = useAutoSave({ save: saveToSupabase })

  // Progress: sections that have real content (not empty or all INSUFFICIENT DATA)
  const touchedSections = useMemo(() => {
    if (!report) return new Set<string>()
    const touched = new Set<string>()
    for (const key of sectionKeys) {
      const sec = report.sections[key]
      if (!sec?.content) continue
      const stripped = sec.content
        .replace(/\[INSUFFICIENT DATA:[^\]]*\]/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim()
      if (stripped.length > 0) touched.add(key)
    }
    return touched
  }, [report, sectionKeys])
  const progressPct = tocSections.length
    ? Math.round((touchedSections.size / tocSections.length) * 100)
    : 0

  const jumpTo = useCallback((id: string) => {
    setActiveSection(id)
    const headings = scrollRef.current?.querySelectorAll('h2')
    if (!headings) return
    for (const h of headings) {
      if (h.textContent?.includes(id) || h.textContent === id) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }, [])

  const reviewAll = useCallback(() => {
    const first = flags.find((f) => !f.resolved)
    if (first) jumpTo(first.section)
  }, [flags, jumpTo])

  const handleRunReview = useCallback(async () => {
    setIsReviewing(true)
    setReviewError(null)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to run NDIS review')
      }

      const nextFlags = mapPlannerFlags(data.flags ?? [])
      setFlags(nextFlags)
      setReport((prev) =>
        prev
          ? {
              ...prev,
              planner_review: {
                flags: data.flags ?? [],
                reviewed_at: new Date().toISOString(),
              },
            }
          : prev
      )
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to run NDIS review')
    } finally {
      setIsReviewing(false)
    }
  }, [reportId])

  // Round-3 UA-4: which template sections are missing from this report?
  // Used to decide whether to surface the Resume banner AND as the work
  // list for handleResume. We compute against RESUMABLE_SECTIONS (no
  // auto_generate sections) because the loop in /api/generate doesn't
  // synthesize those either.
  const missingSections = useMemo(() => {
    if (!report) return []
    return RESUMABLE_SECTIONS.filter((name) => !report.sections[name])
  }, [report])

  const canResume =
    !!report &&
    !!report.assessment_id &&
    (report.status === 'failed' || report.status === 'generating') &&
    Object.keys(report.sections).length > 0 &&
    missingSections.length > 0

  const handleResume = useCallback(async () => {
    if (!report || !report.assessment_id || isResuming) return
    setIsResuming(true)
    setResumeError(null)

    const total = missingSections.length

    try {
      for (let i = 0; i < missingSections.length; i++) {
        const sectionName = missingSections[i]
        setResumeProgress({ current: i + 1, total, sectionName })

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: report.assessment_id,
            reportId: report.id,
            sectionId: sectionName,
          }),
        })

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(
            errData.error || `Failed to generate "${sectionName}"`,
          )
        }

        // Response body is intentionally not unpacked: the API already
        // wrote the section to the DB at line 204-208 of
        // app/api/generate/route.ts. We just need a successful return
        // before moving to the next section.
        await response.json().catch(() => null)
      }

      setResumeProgress({ current: total, total, sectionName: 'Final review' })
      const coherenceResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coherence_check',
          reportId: report.id,
          clinicalNotes: '',
        }),
      })
      if (!coherenceResponse.ok) {
        const errData = (await coherenceResponse.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(errData.error || 'Failed to finalise resumed report')
      }

      // The Plate editor is memoized after mount. A Next router refresh can
      // preserve this client state, so reload the page to remount the editor
      // with the newly persisted report sections.
      window.location.reload()
    } catch (err) {
      setResumeError(
        err instanceof Error ? err.message : 'Failed to resume generation',
      )
    } finally {
      setIsResuming(false)
      setResumeProgress(null)
    }
  }, [report, missingSections, isResuming])

  const handleStandardisedFinalise = useCallback(async (files: File[]) => {
    if (!report || !report.assessment_id || files.length === 0 || isFinalisingAssessments) {
      return
    }

    setIsFinalisingAssessments(true)
    setFinaliseError(null)

    try {
      setFinaliseProgress('Saving report edits')
      await saveToSupabase()

      setFinaliseProgress('Reading standardised assessment PDFs')
      const formData = new FormData()
      for (const file of files) formData.append('files', file)

      const parseResponse = await fetch('/api/standardised-assessments/parse', {
        method: 'POST',
        body: formData,
      })
      const parsed = (await parseResponse.json().catch(() => ({}))) as ParsedStandardisedPayload
      if (!parseResponse.ok) {
        throw new Error(parsed.error || 'Failed to read standardised assessment PDFs')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to finalise the report.')

      const { data: assessment } = await supabase
        .from('assessments')
        .select('standardized_scores')
        .eq('id', report.assessment_id)
        .eq('user_id', user.id)
        .single()

      const existingScores = isRecord(assessment?.standardized_scores)
        ? assessment.standardized_scores
        : {}
      const mergedScores = { ...existingScores, ...parsed.scores }

      const { error: assessmentError } = await supabase
        .from('assessments')
        .update({
          standardized_scores: mergedScores,
          status: 'generating',
        })
        .eq('id', report.assessment_id)
        .eq('user_id', user.id)

      if (assessmentError) throw new Error(assessmentError.message)

      for (let i = 0; i < STANDARDISED_FINALISE_SECTIONS.length; i++) {
        const sectionName = STANDARDISED_FINALISE_SECTIONS[i]
        setFinaliseProgress(
          `Generating ${sectionName} (${i + 1} of ${STANDARDISED_FINALISE_SECTIONS.length})`,
        )

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: report.assessment_id,
            reportId: report.id,
            sectionId: sectionName,
          }),
        })

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(errData.error || `Failed to generate "${sectionName}"`)
        }
      }

      setFinaliseProgress('Checking report coherence')
      const coherenceResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coherence_check',
          reportId: report.id,
        }),
      })
      if (!coherenceResponse.ok) {
        const errData = (await coherenceResponse.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(errData.error || 'Failed to run coherence check')
      }

      await supabase
        .from('assessments')
        .update({ status: 'complete' })
        .eq('id', report.assessment_id)
        .eq('user_id', user.id)

      // See handleResume: remount the client editor so the regenerated Part D
      // and final Part E are visible immediately after standardised evidence.
      window.location.reload()
    } catch (err) {
      setFinaliseError(
        err instanceof Error ? err.message : 'Failed to finalise assessment sections',
      )
    } finally {
      setIsFinalisingAssessments(false)
      setFinaliseProgress(null)
    }
  }, [
    report,
    isFinalisingAssessments,
    saveToSupabase,
    supabase,
  ])

  const handleExportDocx = useCallback(async () => {
    const editor = editorRef.current?.editor
    if (!editor) return

    const sections = plateToSections(editor.children, sectionKeys, editor)
    // Best-effort profile fetch for letterhead. Failure falls back to a
    // header-less document — never blocks export.
    const { data: { user } } = await supabase.auth.getUser()
    const profile = user
      ? await fetchProfile(supabase, user.id).catch(() => null)
      : null
    const blob = await generateDocx(sections, { profile })
    saveAs(blob, `FCA-${participant?.name ?? 'Report'}.docx`)
  }, [sectionKeys, participant, supabase])

  if (loading) {
    return (
      <div className="tn-ws animate-pulse">
        <aside className="tn-side">
          <div className="p-4 space-y-3">
            {[68, 76, 84, 92, 100].map((width) => (
              <div
                key={width}
                className="h-4 rounded bg-muted"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </aside>
        <main className="tn-ws-main">
          <div className="tn-ws-topbar">
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          <div className="flex-1 p-8">
            <div className="mx-auto max-w-[820px] space-y-6">
              <div className="h-6 w-64 rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
              </div>
              <div className="h-6 w-48 rounded bg-muted mt-8" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/6 rounded bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!report || !plateValue || notFound) {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar />
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3"
          style={{ background: 'var(--tn-bg)' }}
        >
          <p className="text-sm text-muted-foreground">
            Report not found or you don&apos;t have access.
          </p>
          <Link href="/reports" className="tn-btn tn-btn-outline tn-btn-sm">
            Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div
        className="tn-ws"
        data-sidebar-collapsed={sidebarCollapsed}
        data-ai-collapsed={assistantCollapsed ? 'true' : undefined}
        style={{ '--sidebar-w': '280px' } as React.CSSProperties}
      >
        {/* Sidebar */}
        <TocSidebar
          sections={tocSections}
          flags={flags}
          activeSection={activeSection}
          collapsed={sidebarCollapsed}
          touchedSections={touchedSections}
          progressPct={progressPct}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onJumpTo={jumpTo}
          onOpenFlag={(id) => jumpTo(id)}
          onReviewAll={reviewAll}
        />

        {/* Main content */}
        <div className="tn-ws-main">
          {/* Page-level breadcrumb (Topbar is global). Kept narrow:
              report context + a single primary action. The dead Find button
              and the duplicate Reports link were removed (QA review). */}
          <div className="tn-ws-topbar">
            <div className="tn-ws-crumbs">
              <Button
                variant="ghost"
                size="xs"
                style={{ marginRight: 4 }}
                onClick={() => router.push('/reports')}
              >
                <ChevronLeft size={13} /> Reports
              </Button>
              <b>{participant?.name ?? 'Report'}</b>
              <span
                style={{
                  color: 'var(--tn-muted-3)',
                  marginLeft: 6,
                  fontSize: 12,
                }}
              >
                {report.status === 'ready' ? 'Ready' : 'Draft'}
                {participant?.reportDate ? ` · ${participant.reportDate}` : ''}
              </span>
            </div>
            <div className="tn-ws-top-actions">
              {report.assessment_id && (
                <FileUpload
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={isFinalisingAssessments}
                  onFilesAdded={handleStandardisedFinalise}
                >
                  <FileUploadTrigger asChild>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={isFinalisingAssessments}
                    >
                      {isFinalisingAssessments ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      {isFinalisingAssessments ? 'Finalising...' : 'Add standardised reports'}
                    </Button>
                  </FileUploadTrigger>
                </FileUpload>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={handleRunReview}
                disabled={isReviewing}
              >
                <Shield size={13} /> {isReviewing ? 'Reviewing...' : 'NDIS Review'}
              </Button>
              {assistantCollapsed && (
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setAssistantCollapsed(false)}
                >
                  <Sparkles size={13} /> Open AI panel
                </Button>
              )}
            </div>
          </div>
        {reviewError && (
          <div className="tn-ws-error" role="status">
            {reviewError}
          </div>
        )}

        {(isFinalisingAssessments || finaliseError) && (
          <div className="tn-ws-resume" role="status" aria-live="polite">
            <div className="tn-ws-resume-body">
              {isFinalisingAssessments ? (
                <Loader2 size={14} className="tn-spin" />
              ) : (
                <Upload size={14} />
              )}
              <div>
                <div className="tn-ws-resume-title">
                  {isFinalisingAssessments
                    ? finaliseProgress ?? 'Finalising standardised assessment sections'
                    : 'Standardised assessment finalisation stopped.'}
                </div>
                {!isFinalisingAssessments && finaliseError && (
                  <div className="tn-ws-resume-error">{finaliseError}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Round-3 UA-4: Resume banner. Surfaces only when the report failed
            mid-generation but already has at least one section persisted —
            the recoverable case. Mirrors the per-section loop from
            /generate/page.tsx, just against the existing reportId so no
            new report/assessment row is inserted. */}
        {canResume && (
          <div
            className="tn-ws-resume"
            role="status"
            aria-live="polite"
          >
            <div className="tn-ws-resume-body">
              <RotateCw
                size={14}
                className={isResuming ? 'tn-spin' : undefined}
              />
              <div>
                <div className="tn-ws-resume-title">
                  {isResuming
                    ? resumeProgress
                      ? `Generating ${resumeProgress.sectionName} (${resumeProgress.current} of ${resumeProgress.total})…`
                      : 'Resuming generation…'
                    : `This report is incomplete with ${
                        Object.keys(report.sections).length
                      } of ${RESUMABLE_SECTIONS.length} sections complete.`}
                </div>
                {!isResuming && (
                  <div className="tn-ws-resume-sub">
                    Continue with the {missingSections.length} remaining
                    {missingSections.length === 1 ? ' section' : ' sections'}.
                    Existing sections will be kept.
                  </div>
                )}
                {resumeError && (
                  <div className="tn-ws-resume-error">{resumeError}</div>
                )}
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleResume}
              disabled={isResuming}
            >
              <RotateCw size={13} />
              {isResuming ? 'Resuming…' : 'Continue generation'}
            </Button>
          </div>
        )}

        {/* Paper scroll area */}
        <div className="tn-paper-scroll" ref={scrollRef}>
          <div className="tn-paper">
            <div className="tn-paper-inner">
              <PlateDocEditor
                ref={editorRef}
                initialValue={plateValue}
                onChange={markDirty}
              />
            </div>
          </div>
        </div>

          {/* Footer */}
          <WorkspaceFooter
            saveStatus={saveStatus}
            saveError={lastError}
            onRetrySave={retrySave}
            onExportDocx={handleExportDocx}
            onRunReview={handleRunReview}
            reviewing={isReviewing}
          />
        </div>

        <ClinicalAssistantPanel
          collapsed={assistantCollapsed}
          activeSection={activeSection}
          sections={tocSections}
          flags={flags}
          saveStatus={saveStatus}
          reviewing={isReviewing}
          finalising={isFinalisingAssessments}
          onCollapse={() => setAssistantCollapsed(true)}
          onExpand={() => setAssistantCollapsed(false)}
          onRunReview={handleRunReview}
          onAddAssessmentFiles={handleStandardisedFinalise}
        />
      </div>
    </div>
  )
}
