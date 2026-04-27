'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { createClient } from '@/lib/supabase/client'
import { reportToPlate } from '@/lib/editor/report-to-plate'
import { plateToSections } from '@/lib/editor/plate-to-sections'
import { useAutoSave } from '@/hooks/use-auto-save'
import { PlateDocEditor, type PlateEditorHandle } from './plate-editor'
import { TocSidebar } from './toc-sidebar'
import { WorkspaceFooter } from './workspace-footer'
import { AssessmentUpload } from './assessment-upload'
import type { ReportSection, Flag, Participant } from '@/lib/workspace/types'
import type { Value } from 'platejs'

type Sections = Record<string, { title: string; content: string }>

interface Report {
  id: string
  sections: Sections
  status: string
  assessment_id: string | null
  planner_review: { flags?: PlannerFlag[] } | null
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

  const editorRef = useRef<PlateEditorHandle>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  // Fetch report data
  useEffect(() => {
    async function load() {
      const { data: reportData } = await supabase
        .from('reports')
        .select('id, sections, status, assessment_id, planner_review')
        .eq('id', reportId)
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
    await supabase
      .from('reports')
      .update({ sections })
      .eq('id', report.id)
  }, [report, sectionKeys, supabase])

  const { markDirty, saveStatus } = useAutoSave({ save: saveToSupabase })

  // Progress: sections that have real content (not empty or all INSUFFICIENT DATA)
  const touchedSections = useMemo(() => {
    if (!report) return new Set<string>()
    const touched = new Set<string>()
    for (const key of sectionKeys) {
      const sec = report.sections[key]
      if (!sec?.content) continue
      const stripped = sec.content.replace(/\[INSUFFICIENT DATA:[^\]]*\]/g, '').trim()
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

  const handleExportDocx = useCallback(async () => {
    const editor = editorRef.current?.editor
    if (!editor) return

    const sections = plateToSections(editor.children, sectionKeys, editor)
    const children: Paragraph[] = [
      new Paragraph({
        text: 'Functional Capacity Assessment Report',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ]

    for (const [, section] of Object.entries(sections)) {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          },
        })
      )
      for (const para of section.content.split('\n\n')) {
        if (!para.trim()) continue
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim(), size: 22 })],
            spacing: { after: 120 },
          })
        )
      }
    }

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `FCA-${participant?.name ?? 'Report'}.docx`)
  }, [sectionKeys, participant])

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
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3"
        style={{ background: 'var(--tn-bg)' }}
      >
        <p className="text-sm text-muted-foreground">
          Report not found or you don&apos;t have access.
        </p>
        <Link href="/reports" className="tn-btn tn-btn-outline tn-btn-sm">
          Back to Reports
        </Link>
      </div>
    )
  }

  return (
    <div
      className="tn-ws"
      data-sidebar-collapsed={sidebarCollapsed}
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
        {/* Topbar breadcrumbs */}
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
            <Link href="/reports" style={{ color: 'inherit', textDecoration: 'none' }}>Reports</Link>
            <span style={{ color: 'var(--tn-muted-3)' }}>/</span>
            <b>FCA &mdash; {participant?.name ?? 'Report'}</b>
            <span
              style={{
                color: 'var(--tn-muted-3)',
                marginLeft: 6,
                fontSize: 12,
              }}
            >
              {report.status === 'ready' ? 'Ready' : 'Draft'} &middot;{' '}
              {participant?.reportDate ?? ''}
            </span>
          </div>
          <div className="tn-ws-top-actions">
            <Button variant="ghost" size="xs">
              <Search size={13} /> Find
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleRunReview}
              disabled={isReviewing}
            >
              <Shield size={13} /> {isReviewing ? 'Reviewing...' : 'NDIS Review'}
            </Button>
          </div>
        </div>
        {reviewError && (
          <div className="tn-ws-error" role="status">
            {reviewError}
          </div>
        )}

        {/* Assessment upload for Parts D & E */}
        <AssessmentUpload
          reportId={reportId}
          hasSectionD={(() => {
            const dKey = sectionKeys.find(k => report.sections[k]?.title?.includes('Part D'))
            if (!dKey) return false
            const content = report.sections[dKey]?.content ?? ''
            return content.length > 0 && !content.includes('[INSUFFICIENT DATA: standardised assessment')
          })()}
          onGenerated={() => window.location.reload()}
        />

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
          saving={saveStatus === 'saving'}
          onExportDocx={handleExportDocx}
          onRunReview={handleRunReview}
          reviewing={isReviewing}
        />
      </div>
    </div>
  )
}
