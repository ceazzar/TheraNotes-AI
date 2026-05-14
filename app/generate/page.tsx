'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowUp,
  ArrowRight,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Upload,
  Sparkles,
  RefreshCw,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'
import { FileUpload, FileUploadTrigger } from '@/components/ui/file-upload'
import { useFormDraft } from '@/hooks/use-form-draft'
import { Topbar } from '@/components/layout/topbar'
import { AppRail } from '@/components/layout/app-rail'
import { ProgressScreen } from '@/components/generate/progress-screen'
import { FormattedReport } from '@/components/report/formatted-report'
import { ExportButton } from '@/components/report/export-button'
import templateData from '@/lib/template.json'

type SectionTemplate = {
  name: string
  order: number
  auto_generate?: boolean
}

type Sections = Record<
  string,
  {
    title: string
    content: string
    status?: 'ready' | 'pending'
    missing?: string[]
  }
>

interface ParsedStandardisedPayload {
  scores: Record<string, unknown>
  detectedTools?: string[]
  summaries?: string[]
}

type GenerationMode = 'first_draft' | 'full_report'

const ASSESSMENT_CONTEXT_CHIPS = [
  'In-person',
  'Telehealth',
  'Home visit',
  'Clinic',
  'Collateral',
  'File review',
  'Standardised assessments pending',
] as const

const generatableSections = (templateData.sections as SectionTemplate[])
  .filter((s) => !s.auto_generate)
  .sort((a, b) => a.order - b.order)

// Map template sections to progress display items
const progressSections = generatableSections.map((s, i) => ({
  id: s.name,
  title: s.name,
  duration: 3000 + i * 500,
}))

/** Format a Date as a short, relative description ("2 minutes ago", "3 hours ago"). */
function formatRelativeTime(d: Date): string {
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

/** Parse a score input as a number, returning null when blank or invalid. */
function parseScore(v: string): number | null {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function normaliseDateForDb(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (iso) return trimmed

  const au = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(trimmed)
  if (au) {
    const day = Number(au[1])
    const month = Number(au[2])
    const year = Number(au[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date.toISOString().slice(0, 10)
    }
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function normaliseGenerationMode(value: unknown): GenerationMode {
  return value === 'full_report' || value === 'finalise'
    ? 'full_report'
    : 'first_draft'
}

const SENSORY_OPTIONS = [
  'Much less than most people',
  'Less than most people',
  'Similar to most people',
  'More than most people',
  'Much more than most people',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedRecord(
  value: unknown,
  key: string,
): Record<string, unknown> | null {
  if (!isRecord(value)) return null
  const child = value[key]
  return isRecord(child) ? child : null
}

function getNestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value
  for (const segment of path) {
    if (!isRecord(current)) return null
    current = current[segment]
  }
  return typeof current === 'string' ? current : null
}

function getWhodasScore(
  parsedScores: Record<string, unknown>,
  domain: string,
): string {
  const whodas = getNestedRecord(parsedScores, 'whodas')
  const domains = getNestedRecord(whodas, 'domains')
  const row = getNestedRecord(domains, domain)
  const score = row?.score_0_to_100
  return typeof score === 'number' ? String(score) : ''
}

function getSensoryClassification(
  parsedScores: Record<string, unknown>,
  quadrant: string,
): string {
  return (
    getNestedString(parsedScores, [
      'sensory_profile',
      'quadrants',
      quadrant,
      'classification',
    ]) ?? ''
  )
}

function whodasDomain(
  parsedScores: Record<string, unknown>,
  key: string,
  manualScore: string,
) {
  const parsedDomain = getNestedRecord(
    getNestedRecord(parsedScores.whodas, 'domains'),
    key,
  )
  return {
    ...(parsedDomain ?? {}),
    score_0_to_100: parseScore(manualScore),
  }
}

function sensoryQuadrant(
  parsedScores: Record<string, unknown>,
  key: string,
  classification: string,
) {
  const parsedQuadrant = getNestedRecord(
    getNestedRecord(parsedScores.sensory_profile, 'quadrants'),
    key,
  )
  return {
    ...(parsedQuadrant ?? {}),
    classification: classification || null,
  }
}

function ContextChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="tn-context-chip"
      data-active={active ? 'true' : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function ProfileStatusStrip() {
  return (
    <div className="tn-profile-strip">
      <div className="tn-profile-status" data-state="ready">
        <span className="dot" />
        <span><b>Clinician profile</b> · ready</span>
        <Link href="/settings">Edit</Link>
      </div>
      <div className="tn-profile-status" data-state="ready">
        <span className="dot" />
        <span><b>Default FCA template</b> selected</span>
      </div>
      <div className="tn-profile-status" data-state="later">
        <span className="dot" />
        <span><b>Header defaults</b> can be added later</span>
      </div>
    </div>
  )
}

function FirstDraftEntry({
  participantName,
  setParticipantName,
  clinicalNotes,
  setClinicalNotes,
  assessmentContext,
  toggleContext,
  draftSavedAt,
  onCreate,
  onOpenReports,
  onStartComplete,
}: {
  participantName: string
  setParticipantName: (value: string) => void
  clinicalNotes: string
  setClinicalNotes: (value: string) => void
  assessmentContext: string[]
  toggleContext: (value: string) => void
  draftSavedAt: Date | null
  onCreate: () => void
  onOpenReports: () => void
  onStartComplete: () => void
}) {
  const canCreate = participantName.trim().length > 0 && clinicalNotes.trim().length > 0
  const wordCount = clinicalNotes.trim().split(/\s+/).filter(Boolean).length
  const shortNotes = clinicalNotes.trim().length > 0 && wordCount < 40

  return (
    <>
      <div className="tn-source-grid">
        <section className="tn-source-card" data-primary="true">
          <div className="tn-source-head">
            <div>
              <div className="tn-source-title">
                <Sparkles size={16} />
                Start new FCA draft
              </div>
              <p>
                Only the clinical inputs that affect the first draft. Header
                details, assessment reports, goals and export checks come later.
              </p>
            </div>
            <span className="tn-save-pill">
              <span className="dot" />
              {draftSavedAt ? `Saved ${formatRelativeTime(draftSavedAt)}` : 'Autosaves on this device'}
            </span>
          </div>

          <div className="tn-source-body">
            <Label className="tn-source-field">
              <span>Participant label <b>*</b></span>
              <Input
                className="tn-source-input"
                value={participantName}
                onChange={(event) => setParticipantName(event.target.value)}
                placeholder="e.g. Luka B, Participant A, or internal reference"
              />
              <small>
                Used to find this draft later. Not part of the report unless you
                add a full name in Header Details.
              </small>
            </Label>

            <Label className="tn-source-field">
              <span>
                Clinical notes <b>*</b>
                <em>ADLs, IADLs, supports, risks, functional impact</em>
              </span>
              <Textarea
                className="tn-source-notes"
                value={clinicalNotes}
                onChange={(event) => setClinicalNotes(event.target.value)}
                placeholder="Paste or dictate OT notes. Include ADLs, IADLs, mobility, cognition, sensory presentation, mental health, current supports, risks, and functional impact examples."
              />
              <small>
                {shortNotes ? (
                  <>
                    <AlertTriangle size={13} /> Short notes may produce a generic draft. You can continue and edit later.
                  </>
                ) : clinicalNotes.trim() ? (
                  `${wordCount.toLocaleString()} words · ready for first draft`
                ) : (
                  <>
                    <Mic size={13} /> You can also dictate, then edit before generating.
                  </>
                )}
              </small>
            </Label>

            <div className="tn-source-field">
              <span className="tn-source-label">
                Assessment context <em>optional, helps describe the assessment process</em>
              </span>
              <div className="tn-context-chips">
                {ASSESSMENT_CONTEXT_CHIPS.map((chip) => (
                  <ContextChip
                    key={chip}
                    label={chip}
                    active={assessmentContext.includes(chip)}
                    onClick={() => toggleContext(chip)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="tn-source-foot">
            <span>Creates a saved report workspace immediately.</span>
            <Button
              type="button"
              className="tn-create-draft-btn"
              disabled={!canCreate}
              onClick={onCreate}
            >
              Create draft workspace
              <ArrowRight size={14} />
            </Button>
          </div>
        </section>

        <aside className="tn-entry-side">
          <section className="tn-side-card">
            <div className="tn-side-card-head">
              <h2>Continue recent work</h2>
              <p>Open an existing draft to add assessments or finalise.</p>
            </div>
            <div className="tn-recent-list">
              <Link href="/reports" className="tn-recent-row">
                <span className="ini">LB</span>
                <span>
                  <b>Luka B. (sample)</b>
                  <small>Stage 1 · first draft ready, resume to add assessments</small>
                </span>
                <ArrowRight size={14} />
              </Link>
              <Link href="/reports" className="tn-recent-row">
                <span className="ini">MH</span>
                <span>
                  <b>Morgan H. (sample)</b>
                  <small>Stage 1 · awaiting OT review of clinical draft</small>
                </span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <button type="button" className="tn-side-link" onClick={onOpenReports}>
              View all reports <ArrowRight size={13} />
            </button>
          </section>

          <section className="tn-side-card tn-finalise-card">
            <div className="tn-finalise-icon">
              <RefreshCw size={16} />
            </div>
            <div>
              <h2>Finalise existing report</h2>
              <p>
                Open a draft to upload standardised OT assessment reports, add
                participant goals, and generate Part D plus final recommendations.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onOpenReports}>
              Open reports
              <ArrowRight size={13} />
            </Button>
          </section>

          <details className="tn-side-card tn-advanced-card">
            <summary>
              <span>Advanced</span>
              <b>Generate complete FCA from scratch</b>
            </summary>
            <p>
              For cases where notes, standardised OT assessment reports and
              participant goals are already available and no draft exists yet.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onStartComplete}>
              Start complete report
              <ArrowRight size={13} />
            </Button>
          </details>
        </aside>
      </div>

      <ProfileStatusStrip />
    </>
  )
}

export default function GeneratePage() {
  // Identity fields (visible at top)
  const [participantName, setParticipantName] = useState('')
  const [ndisNumber, setNdisNumber] = useState('')
  const [assessor, setAssessor] = useState('')

  // Extended client (collapsible)
  const [participantDob, setParticipantDob] = useState('')
  const [planStart, setPlanStart] = useState('')
  const [planEnd, setPlanEnd] = useState('')
  const [address, setAddress] = useState('')
  const [nokName, setNokName] = useState('')
  const [nokPhone, setNokPhone] = useState('')

  // Assessor & assessment (collapsible)
  const [assessorCredentials, setAssessorCredentials] = useState('')
  const [assessorEmail, setAssessorEmail] = useState('')
  const [assessorCompany, setAssessorCompany] = useState('')
  const [assessmentDate, setAssessmentDate] = useState('')
  const [assessmentMode, setAssessmentMode] = useState<'in-person' | 'telehealth' | 'hybrid' | ''>('')
  const [reportDate, setReportDate] = useState('')

  // WHODAS 2.0 scores (collapsible — unlocks Part D)
  const [whodasUnderstanding, setWhodasUnderstanding] = useState('')
  const [whodasMobility, setWhodasMobility] = useState('')
  const [whodasSelfCare, setWhodasSelfCare] = useState('')
  const [whodasGettingAlong, setWhodasGettingAlong] = useState('')
  const [whodasLifeActivities, setWhodasLifeActivities] = useState('')
  const [whodasParticipation, setWhodasParticipation] = useState('')

  // Sensory Profile quadrants (collapsible — unlocks Part D)
  const [sensoryLowReg, setSensoryLowReg] = useState('')
  const [sensoryAvoiding, setSensoryAvoiding] = useState('')
  const [sensorySensitivity, setSensorySensitivity] = useState('')
  const [sensorySeeking, setSensorySeeking] = useState('')
  const [parsedStandardisedScores, setParsedStandardisedScores] = useState<
    Record<string, unknown>
  >({})
  const [standardisedFileNames, setStandardisedFileNames] = useState<string[]>([])
  const [standardisedSummaries, setStandardisedSummaries] = useState<string[]>([])
  const [standardisedParseError, setStandardisedParseError] = useState<string | null>(null)
  const [isParsingStandardised, setIsParsingStandardised] = useState(false)

  // NDIS goals (collapsible — unlocks Part E)
  const [goal1, setGoal1] = useState('')
  const [goal2, setGoal2] = useState('')
  const [goal3, setGoal3] = useState('')

  // Notes
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [assessmentContext, setAssessmentContext] = useState<string[]>([])

  // UI state
  const [showBanner, setShowBanner] = useState(true)
  const [showValidation, setShowValidation] = useState(false)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('first_draft')
  const [workflowStarted, setWorkflowStarted] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)
  const [sections, setSections] = useState<Sections>({})
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const { push } = useRouter()

  // User id is needed to scope the draft autosave key per account.
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    let mounted = true
    void supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!mounted) return
        setUserId(user?.id)
      })
      .finally(() => {
        if (mounted) setAuthReady(true)
      })
    return () => {
      mounted = false
    }
  }, [supabase])

  // Auto-fill assessor + clinic fields from the clinician profile, but only
  // for fields the user hasn't typed into. Functional setters with empty
  // checks prevent any race where a profile fetch overwrites in-flight typing.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const { fetchProfile } = await import('@/lib/profile')
        const profile = await fetchProfile(supabase, userId)
        if (cancelled || !profile) return
        if (profile.display_name) setAssessor((v) => (v.trim() ? v : profile.display_name ?? ''))
        if (profile.credentials) setAssessorCredentials((v) => (v.trim() ? v : profile.credentials ?? ''))
        if (profile.contact_email) setAssessorEmail((v) => (v.trim() ? v : profile.contact_email ?? ''))
        if (profile.clinic_name) setAssessorCompany((v) => (v.trim() ? v : profile.clinic_name ?? ''))
      } catch {
        // Silent — auto-fill is a convenience, not a requirement.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, supabase])

  // Banner shown briefly when an existing draft is restored from localStorage.
  const [restoredAt, setRestoredAt] = useState<Date | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const dismissRestoredBanner = useCallback(() => setRestoredAt(null), [])

  // Snapshot all form fields for the autosave hook. Recomputes on every render
  // — that's fine because the hook itself debounces writes by 400ms.
  const formSnapshot = useMemo(
    () => ({
      participantName,
      ndisNumber,
      assessor,
      participantDob,
      planStart,
      planEnd,
      address,
      nokName,
      nokPhone,
      assessorCredentials,
      assessorEmail,
      assessorCompany,
      assessmentDate,
      assessmentMode,
      reportDate,
      whodasUnderstanding,
      whodasMobility,
      whodasSelfCare,
      whodasGettingAlong,
      whodasLifeActivities,
      whodasParticipation,
      sensoryLowReg,
      sensoryAvoiding,
      sensorySensitivity,
      sensorySeeking,
      goal1,
      goal2,
      goal3,
      clinicalNotes,
      assessmentContext,
      generationMode,
      workflowStarted,
    }),
    [
      participantName, ndisNumber, assessor,
      participantDob, planStart, planEnd, address, nokName, nokPhone,
      assessorCredentials, assessorEmail, assessorCompany, assessmentDate, assessmentMode, reportDate,
      whodasUnderstanding, whodasMobility, whodasSelfCare, whodasGettingAlong, whodasLifeActivities, whodasParticipation,
      sensoryLowReg, sensoryAvoiding, sensorySensitivity, sensorySeeking,
      goal1, goal2, goal3,
      clinicalNotes,
      assessmentContext,
      generationMode,
      workflowStarted,
    ],
  )

  type FormSnapshot = typeof formSnapshot

  const handleDraftRestore = useCallback((draft: FormSnapshot, savedAt: Date) => {
    // Restore each field. Using a function-form set isn't necessary because
    // this fires once on mount before any user input.
    setParticipantName(draft.participantName ?? '')
    setNdisNumber(draft.ndisNumber ?? '')
    setAssessor(draft.assessor ?? '')
    setParticipantDob(draft.participantDob ?? '')
    setPlanStart(draft.planStart ?? '')
    setPlanEnd(draft.planEnd ?? '')
    setAddress(draft.address ?? '')
    setNokName(draft.nokName ?? '')
    setNokPhone(draft.nokPhone ?? '')
    setAssessorCredentials(draft.assessorCredentials ?? '')
    setAssessorEmail(draft.assessorEmail ?? '')
    setAssessorCompany(draft.assessorCompany ?? '')
    setAssessmentDate(draft.assessmentDate ?? '')
    setAssessmentMode((draft.assessmentMode ?? '') as typeof assessmentMode)
    setReportDate(draft.reportDate ?? '')
    setWhodasUnderstanding(draft.whodasUnderstanding ?? '')
    setWhodasMobility(draft.whodasMobility ?? '')
    setWhodasSelfCare(draft.whodasSelfCare ?? '')
    setWhodasGettingAlong(draft.whodasGettingAlong ?? '')
    setWhodasLifeActivities(draft.whodasLifeActivities ?? '')
    setWhodasParticipation(draft.whodasParticipation ?? '')
    setSensoryLowReg(draft.sensoryLowReg ?? '')
    setSensoryAvoiding(draft.sensoryAvoiding ?? '')
    setSensorySensitivity(draft.sensorySensitivity ?? '')
    setSensorySeeking(draft.sensorySeeking ?? '')
    setGoal1(draft.goal1 ?? '')
    setGoal2(draft.goal2 ?? '')
    setGoal3(draft.goal3 ?? '')
    setClinicalNotes(draft.clinicalNotes ?? '')
    setAssessmentContext(Array.isArray(draft.assessmentContext) ? draft.assessmentContext : [])
    setGenerationMode(normaliseGenerationMode(draft.generationMode))
    setWorkflowStarted(Boolean(
      draft.workflowStarted ||
        draft.clinicalNotes ||
        draft.participantName ||
        draft.ndisNumber ||
        draft.assessor,
    ))
    setRestoredAt(savedAt)
    setDraftSavedAt(savedAt)
  }, [])

  const { clear: clearDraft, ready: draftReady } = useFormDraft({
    storageKey: 'theranotes:generate:draft',
    userId,
    state: formSnapshot,
    onRestore: handleDraftRestore,
    onSave: setDraftSavedAt,
    skipRestore: isGenerating || isDone || !authReady,
  })

  const toggleAssessmentContext = useCallback((value: string) => {
    setAssessmentContext((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
    setWorkflowStarted(true)
  }, [])

  const handleStandardisedFilesAdded = useCallback(async (files: File[]) => {
    if (files.length === 0 || isParsingStandardised) return

    setIsParsingStandardised(true)
    setStandardisedParseError(null)

    try {
      const formData = new FormData()
      for (const file of files) formData.append('files', file)

      const response = await fetch('/api/standardised-assessments/parse', {
        method: 'POST',
        body: formData,
      })
      const data = (await response.json().catch(() => ({}))) as Partial<
        ParsedStandardisedPayload & { error: string }
      >

      if (!response.ok) {
        throw new Error(data.error || 'Failed to read standardised assessment.')
      }

      const scores = data.scores ?? {}
      setParsedStandardisedScores((prev) => ({ ...prev, ...scores }))
      setStandardisedFileNames(files.map((file) => file.name))
      setStandardisedSummaries(data.summaries ?? [])
      setGenerationMode('full_report')
      setWorkflowStarted(true)

      const nextWhodasUnderstanding = getWhodasScore(scores, 'cognition')
      const nextWhodasMobility = getWhodasScore(scores, 'mobility')
      const nextWhodasSelfCare = getWhodasScore(scores, 'self_care')
      const nextWhodasGettingAlong = getWhodasScore(scores, 'getting_along')
      const nextWhodasLifeActivities = getWhodasScore(scores, 'life_activities')
      const nextWhodasParticipation = getWhodasScore(scores, 'participation')

      if (nextWhodasUnderstanding) setWhodasUnderstanding(nextWhodasUnderstanding)
      if (nextWhodasMobility) setWhodasMobility(nextWhodasMobility)
      if (nextWhodasSelfCare) setWhodasSelfCare(nextWhodasSelfCare)
      if (nextWhodasGettingAlong) setWhodasGettingAlong(nextWhodasGettingAlong)
      if (nextWhodasLifeActivities) setWhodasLifeActivities(nextWhodasLifeActivities)
      if (nextWhodasParticipation) setWhodasParticipation(nextWhodasParticipation)

      const nextLowReg = getSensoryClassification(scores, 'low_registration')
      const nextAvoiding = getSensoryClassification(scores, 'sensation_avoiding')
      const nextSensitivity = getSensoryClassification(scores, 'sensory_sensitivity')
      const nextSeeking = getSensoryClassification(scores, 'sensation_seeking')

      if (nextLowReg) setSensoryLowReg(nextLowReg)
      if (nextAvoiding) setSensoryAvoiding(nextAvoiding)
      if (nextSensitivity) setSensorySensitivity(nextSensitivity)
      if (nextSeeking) setSensorySeeking(nextSeeking)
    } catch (err) {
      setStandardisedParseError(
        err instanceof Error ? err.message : 'Failed to read standardised assessment.',
      )
    } finally {
      setIsParsingStandardised(false)
    }
  }, [isParsingStandardised])

  // Redirect to workspace after generation completes
  useEffect(() => {
    if (isDone && reportId) {
      const timer = setTimeout(() => {
        push(`/reports/${reportId}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isDone, reportId, push])

  const isCompleteReportMode = generationMode === 'full_report'
  const placeholder = isCompleteReportMode
    ? 'Paste the OT clinical notes and any final assessor comments. Use this path only when the report has not already been drafted.'
    : 'Paste or dictate your clinical notes. Cover: diagnoses, ADLs, IADLs, mobility and transfers, mental health, sensory/cognition, risks, and current supports.'

  // ---------------------------------------------------------------------------
  // Derived intake state — drives section status chips and the preview banner.
  // Mirror the lib/ai/intake.ts availability rules so what the UI shows matches
  // what the generator actually does.
  // ---------------------------------------------------------------------------
  const participantDobValid = Boolean(normaliseDateForDb(participantDob))
  const clientHasMinimum = Boolean(
    participantName.trim() && ndisNumber.trim() && participantDobValid,
  )
  const clientStatusLabel = clientHasMinimum
    ? 'Ready'
    : !participantName.trim()
      ? 'Needs name'
      : !ndisNumber.trim()
        ? 'Needs NDIS'
        : !participantDob.trim()
          ? 'Needs DOB'
          : 'Check DOB'
  const assessorHasMinimum = Boolean(
    assessor.trim() && assessorCredentials.trim(),
  )
  const whodasHasAny = [
    whodasUnderstanding,
    whodasMobility,
    whodasSelfCare,
    whodasGettingAlong,
    whodasLifeActivities,
    whodasParticipation,
  ].some((v) => v.trim().length > 0)
  const sensoryHasAny = [
    sensoryLowReg,
    sensoryAvoiding,
    sensorySensitivity,
    sensorySeeking,
  ].some((v) => v.trim().length > 0)
  const goalsCount = [goal1, goal2, goal3].filter((g) => g.trim().length > 0).length
  const goalsHasAny = goalsCount > 0

  // Map intake state to section-level outcomes for preview banner.
  // Header: needs client + assessor minimums.
  // Parts A/B/C/Overview/Process: always generate when clinical notes present.
  // Part D: needs at least one standardised assessment scored or uploaded.
  // Part E: generates as a functional-impairment summary first, then as the
  // full final section once standardised scores are available.
  const headerWillGenerate = clientHasMinimum && assessorHasMinimum
  const partDWillGenerate = whodasHasAny || sensoryHasAny
  // Overview, Assessment Process, Parts A/B/C — 5 narrative sections always run when notes present.
  const narrativeWillGenerate = clinicalNotes.trim().length > 50
  const partEWillGenerate = narrativeWillGenerate
  const partEFinalWillGenerate = partEWillGenerate && partDWillGenerate
  const sectionsThatWillGenerate =
    (headerWillGenerate ? 1 : 0) +
    (narrativeWillGenerate ? 5 : 0) +
    (partDWillGenerate ? 1 : 0) +
    (partEWillGenerate ? 1 : 0)
  const pendingLabels: string[] = []
  if (!headerWillGenerate) pendingLabels.push('Header')
  if (!partDWillGenerate) {
    pendingLabels.push(isCompleteReportMode ? 'assessment evidence' : 'Part D')
  }
  const primaryButtonLabel = !clinicalNotes.trim()
    ? 'Add clinical notes'
    : isCompleteReportMode
      ? partDWillGenerate
        ? 'Generate complete report'
        : 'Add assessment evidence'
      : 'Draft first OT report'
  const notesTitle = isCompleteReportMode
    ? 'Clinical notes and all evidence'
    : 'OT clinical evidence'
  const notesStatus = clinicalNotes.trim().length > 0
    ? `${clinicalNotes.trim().length} characters`
    : isCompleteReportMode
      ? 'Required for new report'
      : 'Required'

  /** Core generation logic, shared by both paths */
  const runGeneration = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setSections({})
    setCompletedCount(0)
    setReportId(null)
    setIsDone(false)
    setShowValidation(false)

    let createdAssessmentId: string | null = null
    let currentReportId: string | null = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to generate reports.')
        setIsGenerating(false)
        return
      }

      const participant = participantName.trim() || 'Quick Generate'
      const participantDobForDb = normaliseDateForDb(participantDob)

      // Assemble structured intake from all form sections.
      // Sparse fields are omitted entirely — the generator's INSUF flagging
      // and skip-pending logic both depend on absence vs. empty-string distinction.
      const intakeMetadata = {
        client: {
          ...(address.trim() && { address: address.trim() }),
          ...(planStart.trim() && { plan_start: planStart.trim() }),
          ...(planEnd.trim() && { plan_end: planEnd.trim() }),
          ...(nokName.trim() && { nok_name: nokName.trim() }),
          ...(nokPhone.trim() && { nok_phone: nokPhone.trim() }),
        },
        assessor: {
          ...(assessorEmail.trim() && { email: assessorEmail.trim() }),
          ...(assessorCompany.trim() && { company: assessorCompany.trim() }),
        },
        assessment: {
          ...(reportDate.trim() && { report_date: reportDate.trim() }),
          ...(assessmentMode && { mode: assessmentMode }),
          ...(assessmentContext.length > 0 && { context: assessmentContext }),
        },
      }

      // WHODAS / Sensory only included when at least one value is filled.
      const whodasFilled = [
        whodasUnderstanding,
        whodasMobility,
        whodasSelfCare,
        whodasGettingAlong,
        whodasLifeActivities,
        whodasParticipation,
      ].some((v) => v.trim().length > 0)

      const sensoryFilled = [
        sensoryLowReg,
        sensoryAvoiding,
        sensorySensitivity,
        sensorySeeking,
      ].some((v) => v.trim().length > 0)

      const standardizedScores: Record<string, unknown> = {
        ...parsedStandardisedScores,
      }
      if (whodasFilled) {
        standardizedScores.whodas = {
          ...(isRecord(parsedStandardisedScores.whodas)
            ? parsedStandardisedScores.whodas
            : {}),
          tool: getNestedString(parsedStandardisedScores, ['whodas', 'tool']) ?? 'WHODAS 2.0',
          domains: {
            ...(getNestedRecord(parsedStandardisedScores.whodas, 'domains') ?? {}),
            cognition: whodasDomain(parsedStandardisedScores, 'cognition', whodasUnderstanding),
            mobility: whodasDomain(parsedStandardisedScores, 'mobility', whodasMobility),
            self_care: whodasDomain(parsedStandardisedScores, 'self_care', whodasSelfCare),
            getting_along: whodasDomain(parsedStandardisedScores, 'getting_along', whodasGettingAlong),
            life_activities: whodasDomain(parsedStandardisedScores, 'life_activities', whodasLifeActivities),
            participation: whodasDomain(parsedStandardisedScores, 'participation', whodasParticipation),
          },
        }
      }
      if (sensoryFilled) {
        standardizedScores.sensory_profile = {
          ...(isRecord(parsedStandardisedScores.sensory_profile)
            ? parsedStandardisedScores.sensory_profile
            : {}),
          tool:
            getNestedString(parsedStandardisedScores, ['sensory_profile', 'tool']) ??
            'Adolescent/Adult Sensory Profile',
          quadrants: {
            ...(getNestedRecord(parsedStandardisedScores.sensory_profile, 'quadrants') ?? {}),
            low_registration: sensoryQuadrant(
              parsedStandardisedScores,
              'low_registration',
              sensoryLowReg,
            ),
            sensation_avoiding: sensoryQuadrant(
              parsedStandardisedScores,
              'sensation_avoiding',
              sensoryAvoiding,
            ),
            sensory_sensitivity: sensoryQuadrant(
              parsedStandardisedScores,
              'sensory_sensitivity',
              sensorySensitivity,
            ),
            sensation_seeking: sensoryQuadrant(
              parsedStandardisedScores,
              'sensation_seeking',
              sensorySeeking,
            ),
          },
        }
      }

      const ndisGoals = [goal1, goal2, goal3].reduce<string[]>((goals, goal) => {
        const trimmed = goal.trim()
        if (trimmed) goals.push(trimmed)
        return goals
      }, [])

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          title: `${participant} FCA`,
          participant_name: participant,
          participant_dob: participantDobForDb,
          ndis_number: ndisNumber.trim() || null,
          assessor_name: assessor.trim() || null,
          assessor_credentials: assessorCredentials.trim() || null,
          assessment_dates: assessmentDate.trim() || null,
          clinical_notes: clinicalNotes,
          functional_domains: {},
          intake_metadata: intakeMetadata,
          standardized_scores: standardizedScores,
          ndis_goals: ndisGoals,
          status: 'generating',
        })
        .select('id')
        .single()

      if (assessmentError || !assessment) {
        setError('Failed to create assessment. Please try again.')
        setIsGenerating(false)
        return
      }
      createdAssessmentId = assessment.id

      const accumulatedSections: Sections = {}

      for (let i = 0; i < generatableSections.length; i++) {
        const section = generatableSections[i]

        const response: Response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: assessment.id,
            reportId: currentReportId,
            sectionId: section.name,
            clinicalNotes,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(
            errData.error || `Failed to generate "${section.name}"`
          )
        }

        const data = await response.json()
        currentReportId = data.reportId
        setReportId(data.reportId)

        accumulatedSections[data.sectionId] = {
          title: data.sectionId,
          content: data.content,
          status: data.status,
          missing: data.missing,
        }
        setSections({ ...accumulatedSections })
        setCompletedCount(i + 1)

        if (i === 0 && reportRef.current) {
          reportRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      }

      // Run coherence check
      if (currentReportId) {
        const coherenceResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'coherence_check',
            reportId: currentReportId,
            clinicalNotes,
          }),
        })

        if (!coherenceResponse.ok) {
          const errData = await coherenceResponse.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to run coherence check')
        }
      }

      await supabase
        .from('assessments')
        .update({ status: 'complete' })
        .eq('id', assessment.id)

      // Generation succeeded — drop the draft so the next /generate visit
      // starts clean rather than rehydrating into stale fields.
      clearDraft()
      setIsDone(true)
    } catch (err) {
      if (currentReportId) {
        await supabase
          .from('reports')
          .update({ status: 'failed' })
          .eq('id', currentReportId)
        clearDraft()
      }
      if (createdAssessmentId) {
        await supabase
          .from('assessments')
          .update({ status: 'failed' })
          .eq('id', createdAssessmentId)
      }
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      )
    } finally {
      setIsGenerating(false)
    }
  }, [
    assessor,
    assessorCredentials,
    assessorEmail,
    assessorCompany,
    assessmentContext,
    address,
    assessmentDate,
    assessmentMode,
    clinicalNotes,
    goal1,
    goal2,
    goal3,
    ndisNumber,
    nokName,
    nokPhone,
    participantDob,
    participantName,
    planStart,
    planEnd,
    parsedStandardisedScores,
    reportDate,
    sensoryLowReg,
    sensoryAvoiding,
    sensorySensitivity,
    sensorySeeking,
    supabase,
    whodasUnderstanding,
    whodasMobility,
    whodasSelfCare,
    whodasGettingAlong,
    whodasLifeActivities,
    whodasParticipation,
    clearDraft,
  ])

  /** Send button click: show validation first, then generate */
  const handleGenerate = useCallback(() => {
    if (!clinicalNotes.trim()) return
    if (isCompleteReportMode && !partDWillGenerate) {
      setShowValidation(true)
      return
    }
    if (!showValidation) {
      setShowValidation(true)
      return
    }
    runGeneration()
  }, [clinicalNotes, isCompleteReportMode, partDWillGenerate, showValidation, runGeneration])

  /** "Generate anyway" bypasses validation */
  const handleGenerateAnyway = useCallback(() => {
    runGeneration()
  }, [runGeneration])

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const hasSections = Object.keys(sections).length > 0

  // --- Progress screen ---
  if (isGenerating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <ProgressScreen
          sections={progressSections}
          activeIndex={completedCount}
        />
      </div>
    )
  }

  // --- Report results screen ---
  if (hasSections) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tn-bg)' }}>
        <Topbar />
        <div ref={topRef} />

        {(isDone || error) && (
          <div className="mx-auto mb-6 mt-6 max-w-[800px] px-4">
            <div
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                background: isDone ? 'var(--tn-ok-bg)' : 'var(--tn-warn-bg)',
                border: `1px solid ${isDone ? 'var(--tn-ok-line)' : 'var(--tn-warn-line)'}`,
                color: isDone ? 'var(--tn-ok)' : 'var(--tn-warn)',
              }}
            >
              {isDone ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              {isDone
                ? 'Report generated successfully. Review the document below and download when ready.'
                : `Generation stopped after saving a partial draft. ${error ?? 'Open the workspace to resume the remaining sections.'}`}
            </div>
          </div>
        )}

        <div ref={reportRef} className="px-4 pb-24">
          <FormattedReport sections={sections} />
        </div>

        {(isDone || reportId) && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'var(--tn-bg)',
              borderTop: '1px solid var(--tn-line-soft)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <div className="mx-auto flex max-w-[800px] items-center justify-between px-6 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={scrollToTop}
              >
                <ArrowUp className="size-3.5" />
                Back to top
              </Button>
              <div className="flex items-center gap-3">
                {reportId && (
                  <Link
                    href={`/reports/${reportId}`}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--tn-muted-1)' }}
                  >
                    {isDone ? 'Open in workspace' : 'Open partial workspace'}
                  </Link>
                )}
                {isDone && <ExportButton sections={sections} />}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const draftHydrating = !authReady || (Boolean(userId) && !draftReady)

  if (draftHydrating) {
    return (
      <div className="tn-entry-shell">
        <AppRail />
        <main className="tn-gen-screen">
          <div className="tn-entry-loading" role="status" aria-live="polite">
            <Loader2 size={16} className="animate-spin" />
            <span>Preparing your draft workspace...</span>
          </div>
        </main>
      </div>
    )
  }

  // --- Generate input screen (default) ---
  return (
    <div className="tn-entry-shell">
      <AppRail />

      <main className="tn-gen-screen">
        {/* Draft-restored banner: shown once when localStorage hydrates state.
            Takes priority over the first-run tip so the user notices they're
            editing a saved draft, not starting fresh. */}
        {restoredAt && (
          <div className="tn-banner tn-fade-up" data-variant="info">
            <span className="tn-banner-dot" />
            <span>
              <strong>Draft restored</strong>&nbsp;&nbsp;Picked up your
              in-progress intake from {formatRelativeTime(restoredAt)}.
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto rounded-full"
              onClick={dismissRestoredBanner}
              aria-label="Dismiss draft notice"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        {/* First-run banner */}
        {showBanner && !restoredAt && (
          <div className="tn-banner tn-fade-up">
            <span className="tn-banner-dot" />
            <span>
              <strong>Tip</strong>&nbsp;&nbsp;Upload your previous FCA reports in{' '}
              <Link href="/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>
                Settings
              </Link>{' '}
              to personalise the AI&rsquo;s writing style.
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto rounded-full"
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        <div className="tn-gen-header">
          <div>
            <h1 className="tn-gen-title">
              Create a Functional Capacity Assessment
            </h1>
            <p className="tn-gen-sub">
              Start with the clinical draft. Add header details, assessment
              reports, goals and export checks later in the report workspace.
            </p>
          </div>
        </div>

        {!isCompleteReportMode ? (
          <FirstDraftEntry
            participantName={participantName}
            setParticipantName={(value) => {
              setParticipantName(value)
              setWorkflowStarted(true)
            }}
            clinicalNotes={clinicalNotes}
            setClinicalNotes={(value) => {
              setClinicalNotes(value)
              setWorkflowStarted(true)
            }}
            assessmentContext={assessmentContext}
            toggleContext={toggleAssessmentContext}
            draftSavedAt={draftSavedAt}
            onCreate={() => {
              setGenerationMode('first_draft')
              setWorkflowStarted(true)
              setShowValidation(false)
              runGeneration()
            }}
            onOpenReports={() => push('/reports')}
            onStartComplete={() => {
              setGenerationMode('full_report')
              setWorkflowStarted(true)
              setShowValidation(false)
            }}
          />
        ) : !workflowStarted ? (
          <div className="tn-workflow-entry">
            <div className="tn-workflow-grid">
              <section className="tn-workflow-card" data-priority="primary">
                <span className="tn-mode-kicker">Most common first step</span>
                <h2>Start a first OT draft</h2>
                <p>
                  Use clinical notes to draft Sections A-C and the
                  functional-impairment summary. Standardised OT assessment
                  reports can be added later from the report workspace.
                </p>
                <Button
                  type="button"
                  className="tn-generate-btn"
                  onClick={() => {
                    setGenerationMode('first_draft')
                    setWorkflowStarted(true)
                    setShowValidation(false)
                  }}
                >
                  Start draft
                  <ArrowUp size={14} />
                </Button>
              </section>

              <section className="tn-workflow-card">
                <span className="tn-mode-kicker">Already drafted</span>
                <h2>Finalise an existing report</h2>
                <p>
                  Open the report you already generated, then use Add
                  assessments to upload standardised OT assessment reports and
                  regenerate Part D plus final recommendations.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => push('/reports')}
                >
                  Open reports
                </Button>
              </section>

              <section className="tn-workflow-card">
                <span className="tn-mode-kicker">All evidence available now</span>
                <h2>Generate a complete FCA</h2>
                <p>
                  Use this only when the OT notes and standardised assessment
                  PDFs are already available before any draft report exists.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setGenerationMode('full_report')
                    setWorkflowStarted(true)
                    setShowValidation(false)
                  }}
                >
                  Start complete report
                </Button>
              </section>
            </div>
          </div>
        ) : (
          <>
            <div className="tn-form-context">
              <div>
                <span className="tn-mode-kicker">
                  {isCompleteReportMode ? 'Complete report' : 'First OT draft'}
                </span>
                <strong>
                  {isCompleteReportMode
                    ? 'Clinical notes plus standardised assessment evidence'
                    : 'Sections A-C plus functional-impairment summary'}
                </strong>
              </div>
              <div className="tn-form-actions">
                <span className="tn-save-state">
                  {draftSavedAt
                    ? `Saved ${formatRelativeTime(draftSavedAt)}`
                    : 'Autosaves on this device for 24 hours'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setWorkflowStarted(false)
                    setShowValidation(false)
                  }}
                >
                  Change workflow
                </Button>
              </div>
            </div>

        {/* Main input card */}
        <div className="tn-gen-card">
          {/* Identity row */}
          <div className="tn-identity-row">
            <Label className="tn-id-field">
              <span className="tn-id-label">Participant name</span>
              <Input
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 pt-0.5 text-[14.5px]"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Participant A"
              />
            </Label>
            <Label className="tn-id-field">
              <span className="tn-id-label">NDIS number</span>
              <Input
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 pt-0.5 text-[14.5px]"
                value={ndisNumber}
                onChange={(e) => setNdisNumber(e.target.value)}
                placeholder="430 xxx xxx"
              />
            </Label>
            <Label className="tn-id-field">
              <span className="tn-id-label">Assessor</span>
              <Input
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 pt-0.5 text-[14.5px]"
                value={assessor}
                onChange={(e) => setAssessor(e.target.value)}
                placeholder="Name, credentials"
              />
            </Label>
          </div>

          <div className="tn-gen-body">
          {/* Collapsible intake sections — required where the section gates */}
          <div className="tn-intake-stack">
            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-main">
                  <span className="tn-intake-kicker">Case setup</span>
                  <span className="tn-intake-title">Participant & plan</span>
                  <span className="tn-intake-desc">DOB, plan dates, address, primary contact</span>
                </span>
                <span className="tn-intake-status" data-state={clientHasMinimum ? 'ready' : 'missing'}>
                  {clientStatusLabel}
                </span>
              </summary>
              <div className="tn-intake-grid">
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Date of birth</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="13 Oct 2005 or 2005-10-13"
                    value={participantDob}
                    onChange={(e) => setParticipantDob(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Plan start</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="11 May 2026"
                    value={planStart}
                    onChange={(e) => setPlanStart(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Plan end</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="10 May 2027"
                    value={planEnd}
                    onChange={(e) => setPlanEnd(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field tn-intake-field-wide">
                  <span className="tn-intake-lbl">Address</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="Street, suburb, state, postcode"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Primary contact name</span>
                  <Input
                    className="tn-intake-input"
                    value={nokName}
                    onChange={(e) => setNokName(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Primary contact phone</span>
                  <Input
                    className="tn-intake-input"
                    value={nokPhone}
                    onChange={(e) => setNokPhone(e.target.value)}
                  />
                </Label>
              </div>
            </details>

            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-main">
                  <span className="tn-intake-kicker">Case setup</span>
                  <span className="tn-intake-title">Assessment context</span>
                  <span className="tn-intake-desc">Clinician identity, provider, assessment date, mode</span>
                </span>
                <span className="tn-intake-status" data-state={assessorHasMinimum ? 'ready' : 'missing'}>
                  {assessorHasMinimum
                    ? 'Ready'
                    : 'Needs credentials'}
                </span>
              </summary>
              <div className="tn-intake-grid">
                <Label className="tn-intake-field tn-intake-field-wide">
                  <span className="tn-intake-lbl">Credentials</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="Occupational Therapist, AHPRA: OCC..."
                    value={assessorCredentials}
                    onChange={(e) => setAssessorCredentials(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Email</span>
                  <Input
                    className="tn-intake-input"
                    type="email"
                    value={assessorEmail}
                    onChange={(e) => setAssessorEmail(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Provider / Company</span>
                  <Input
                    className="tn-intake-input"
                    value={assessorCompany}
                    onChange={(e) => setAssessorCompany(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Assessment date(s)</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="e.g. 20 Jan 2026"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Report date</span>
                  <Input
                    className="tn-intake-input"
                    placeholder="11 May 2026"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Mode</span>
                  <Select
                    value={assessmentMode}
                    onValueChange={(v) =>
                      setAssessmentMode(v as typeof assessmentMode)
                    }
                    placeholder="— select —"
                    aria-label="Assessment mode"
                  >
                    <SelectItem value="in-person">In-person</SelectItem>
                    <SelectItem value="telehealth">Telehealth</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </Select>
                </Label>
              </div>
            </details>

            {isCompleteReportMode ? (
              <>
            <details className="tn-intake-section" data-priority="standardised">
              <summary className="tn-intake-summary">
                <span className="tn-intake-main">
                  <span className="tn-intake-kicker">Assessment evidence</span>
                  <span className="tn-intake-title">Standardised OT assessment reports</span>
                  <span className="tn-intake-desc">Upload completed assessment PDFs for Part D and final recommendations</span>
                </span>
                <span className="tn-intake-status" data-state={standardisedFileNames.length > 0 || partDWillGenerate ? 'ready' : 'missing'}>
                  {standardisedFileNames.length > 0
                    ? `${standardisedFileNames.length} read`
                    : partDWillGenerate
                      ? 'Scores entered'
                      : 'Upload PDF'}
                </span>
              </summary>
              <div className="tn-intake-stack-tight">
                <FileUpload
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={isParsingStandardised}
                  onFilesAdded={handleStandardisedFilesAdded}
                >
                  <FileUploadTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isParsingStandardised}
                      className="w-fit gap-2"
                    >
                      {isParsingStandardised ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {isParsingStandardised ? 'Reading PDFs...' : 'Upload assessment PDFs'}
                    </Button>
                  </FileUploadTrigger>
                </FileUpload>
                {(standardisedSummaries.length > 0 || standardisedParseError) && (
                  <div className="tn-standardised-results">
                    {standardisedSummaries.map((summary) => (
                      <div key={summary}>{summary}</div>
                    ))}
                    {standardisedParseError && (
                      <div className="tn-standardised-error">
                        {standardisedParseError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>

            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-main">
                  <span className="tn-intake-kicker">Assessment evidence</span>
                  <span className="tn-intake-title">WHODAS 2.0 scores, if used</span>
                  <span className="tn-intake-desc">Cognition, mobility, self-care, social, activities, participation</span>
                </span>
                <span className="tn-intake-status" data-state={whodasHasAny ? 'ready' : 'pending'}>
                  {whodasHasAny
                    ? 'Part D ready'
                    : 'Pending'}
                </span>
              </summary>
              <div className="tn-intake-grid">
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Understanding & Communicating (0-100)</span>
                  <Input
                    className="tn-intake-input"
                    type="number"
                    min={0}
                    max={100}
                    value={whodasUnderstanding}
                    onChange={(e) => setWhodasUnderstanding(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Getting Around (0-100)</span>
                  <Input
                    className="tn-intake-input"
                    type="number"
                    min={0}
                    max={100}
                    value={whodasMobility}
                    onChange={(e) => setWhodasMobility(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Self-Care (0-100)</span>
                  <Input
                    className="tn-intake-input"
                    type="number"
                    min={0}
                    max={100}
                    value={whodasSelfCare}
                    onChange={(e) => setWhodasSelfCare(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Getting Along (0-100)</span>
                  <Input
                    className="tn-intake-input"
                    type="number"
                    min={0}
                    max={100}
                    value={whodasGettingAlong}
                    onChange={(e) => setWhodasGettingAlong(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Life Activities (0-100)</span>
                  <Input
                    className="tn-intake-input"
                    type="number"
                    min={0}
                    max={100}
                    value={whodasLifeActivities}
                    onChange={(e) => setWhodasLifeActivities(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Participation in Society (0-100)</span>
                  <Input
                    className="tn-intake-input"
                    type="number"
                    min={0}
                    max={100}
                    value={whodasParticipation}
                    onChange={(e) => setWhodasParticipation(e.target.value)}
                  />
                </Label>
              </div>
            </details>

            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-main">
                  <span className="tn-intake-kicker">Assessment evidence</span>
                  <span className="tn-intake-title">Sensory Profile quadrants, if used</span>
                  <span className="tn-intake-desc">Low registration, avoiding, sensitivity, seeking classifications</span>
                </span>
                <span className="tn-intake-status" data-state={sensoryHasAny ? 'ready' : 'optional'}>
                  {sensoryHasAny
                    ? 'Included'
                    : 'Optional'}
                </span>
              </summary>
              <div className="tn-intake-grid">
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Low Registration</span>
                  <Select
                    value={sensoryLowReg}
                    onValueChange={setSensoryLowReg}
                    placeholder="— select —"
                    aria-label="Low Registration"
                  >
                    {SENSORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </Select>
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Sensation Avoiding</span>
                  <Select
                    value={sensoryAvoiding}
                    onValueChange={setSensoryAvoiding}
                    placeholder="— select —"
                    aria-label="Sensation Avoiding"
                  >
                    {SENSORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </Select>
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Sensory Sensitivity</span>
                  <Select
                    value={sensorySensitivity}
                    onValueChange={setSensorySensitivity}
                    placeholder="— select —"
                    aria-label="Sensory Sensitivity"
                  >
                    {SENSORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </Select>
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Sensation Seeking</span>
                  <Select
                    value={sensorySeeking}
                    onValueChange={setSensorySeeking}
                    placeholder="— select —"
                    aria-label="Sensation Seeking"
                  >
                    {SENSORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </Select>
                </Label>
              </div>
            </details>

            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-main">
                  <span className="tn-intake-kicker">Final report</span>
                  <span className="tn-intake-title">NDIS goals</span>
                  <span className="tn-intake-desc">Verbatim participant-stated goals for final Part E</span>
                </span>
                <span className="tn-intake-status" data-state={goalsHasAny ? 'ready' : 'optional'}>
                  {goalsHasAny
                    ? `${goalsCount} goal${goalsCount === 1 ? '' : 's'}`
                    : partEFinalWillGenerate
                      ? 'Missing'
                      : 'Later'}
                </span>
              </summary>
              <div className="tn-intake-stack-tight">
                <Label className="tn-intake-field-wide">
                  <span className="tn-intake-lbl">Goal 1</span>
                  <Textarea
                    className="tn-intake-input"
                    placeholder="Quote the participant's first stated NDIS goal verbatim."
                    value={goal1}
                    onChange={(e) => setGoal1(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field-wide">
                  <span className="tn-intake-lbl">Goal 2 (optional)</span>
                  <Textarea
                    className="tn-intake-input"
                    value={goal2}
                    onChange={(e) => setGoal2(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field-wide">
                  <span className="tn-intake-lbl">Goal 3 (optional)</span>
                  <Textarea
                    className="tn-intake-input"
                    value={goal3}
                    onChange={(e) => setGoal3(e.target.value)}
                  />
                </Label>
              </div>
            </details>
              </>
            ) : (
              <div className="tn-later-card">
                <div>
                  <span className="tn-intake-kicker">Later step</span>
                  <strong>Standardised assessment evidence</strong>
                  <span>
                    Standardised OT assessment reports and NDIS goals are used
                    when the OT is ready to complete Part D and full
                    recommendations in the report workspace.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="tn-notes-panel">
            <div className="tn-notes-head">
              <span>{notesTitle}</span>
              <span>{notesStatus}</span>
            </div>
            <div className="tn-notes-guide" aria-label="Clinical evidence areas">
              {isCompleteReportMode ? (
                <>
                  <span>assessment findings</span>
                  <span>functional severity</span>
                  <span>goals</span>
                  <span>recommendations</span>
                  <span>risks</span>
                  <span>final caveats</span>
                </>
              ) : (
                <>
                  <span>Diagnoses</span>
                  <span>ADLs</span>
                  <span>IADLs</span>
                  <span>mobility</span>
                  <span>home</span>
                  <span>supports</span>
                  <span>mental health</span>
                  <span>sensory / cognition</span>
                </>
              )}
            </div>

          {/* Textarea */}
          <Textarea
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 resize-y min-h-[220px] px-[18px] pt-[18px] pb-2.5 text-[14.5px] leading-[1.65]"
            placeholder={placeholder}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />

          {/* Section preview — what the Generate button will actually produce */}
          {clinicalNotes.trim().length > 0 && (
            <div className="tn-section-preview">
              {isCompleteReportMode ? 'Complete report will generate ' : 'First draft will generate '}
              <strong>{sectionsThatWillGenerate} of 8 sections</strong>.
              {pendingLabels.length > 0 && (
                <>
                  {' '}
                  Pending:{' '}
                  <strong>{pendingLabels.join(', ')}</strong>
                  {isCompleteReportMode
                    ? ', upload or enter the standardised assessment evidence above.'
                    : ', add those later from the report workspace after standardised assessment upload.'}
                </>
              )}
              {partEWillGenerate && (
                <>
                  {' '}
                  Part E:{' '}
                  <strong>
                    {partEFinalWillGenerate
                      ? 'full summary and recommendations'
                      : 'functional-impairment summary only'}
                  </strong>
                  .
                </>
              )}
            </div>
          )}

          {/* Footer bar — Attach/Dictate/Template removed Round-2 NEW-4
              (false-affordance buttons with no onClick handlers, same pattern
              as the workspace dead buttons purged in Day-1). Reintroduce when
              the actual feature ships. */}
          <div className="tn-gen-footer">
            <div className="tn-gen-tools" />
            <Button
              className="tn-generate-btn"
              onClick={handleGenerate}
              disabled={!clinicalNotes.trim()}
              aria-label={primaryButtonLabel}
              title={`Generate ${sectionsThatWillGenerate} of 8 sections`}
            >
              {primaryButtonLabel}
              <ArrowUp size={14} />
            </Button>
          </div>
          </div>
          </div>
        </div>

        {/* Quick-add chips removed (Day 1 review): they injected literal sample
            text into the clinical notes textarea ("requires prompting with
            ADLs", "assessment score indicates severe impairment", etc.), which is
            clinically contaminating and now redundant with the structured
            intake sections above (standardised assessment evidence / NDIS goals
            each have their own typed input). */}

        {/* Validation warning */}
        {showValidation && (
          <div className="tn-valid tn-fade-up">
            <div className="tn-valid-head">
              <AlertTriangle size={16} />
              {isCompleteReportMode ? 'Review complete report inputs.' : 'Review first draft scope.'}
            </div>
            <ul className="tn-valid-list">
              {!clientHasMinimum && (
                <li>
                  <b>Header:</b> add participant name, NDIS number, and a valid
                  DOB if this draft needs the report header populated.
                </li>
              )}
              {!partDWillGenerate && isCompleteReportMode && (
                <li>
                  <b>Assessment evidence:</b> upload at least one standardised
                  OT assessment report, or enter scores manually where
                  supported, before generating Part D and recommendations.
                </li>
              )}
              {!partDWillGenerate && !isCompleteReportMode && (
                <li>
                  <b>Part D:</b> standardised assessment findings can be added
                  later from standardised OT assessment reports.
                </li>
              )}
              <li>
                <b>Clinical notes:</b> stronger drafts come from concrete
                examples of ADLs, IADLs, supports, risks, observations, and
                functional impact.
              </li>
            </ul>
            <div className="tn-valid-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidation(false)}
              >
                Keep editing
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateAnyway}
              >
                {isCompleteReportMode && !partDWillGenerate
                  ? 'Generate first draft anyway'
                  : 'Generate anyway'}
              </Button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div
            className="mt-4 w-full max-w-[720px] rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'var(--tn-crit-bg)',
              border: '1px solid var(--tn-crit-line)',
              color: 'var(--tn-crit)',
            }}
          >
            {error}
          </div>
        )}
          </>
        )}

        {/* Footnote */}
        <div className="tn-gen-footnote">
          TheraNotes drafts clinical-grade reports &mdash; every line remains
          yours to edit and verify before sending to NDIS.
        </div>
      </main>
    </div>
  )
}
