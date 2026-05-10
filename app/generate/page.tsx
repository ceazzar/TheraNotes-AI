'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowUp,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'
import { useFormDraft } from '@/hooks/use-form-draft'
import { Topbar } from '@/components/layout/topbar'
import { ProgressScreen } from '@/components/generate/progress-screen'
import { FormattedReport } from '@/components/report/formatted-report'
import { ExportButton } from '@/components/report/export-button'
import templateData from '@/lib/template.json'

type SectionTemplate = {
  name: string
  order: number
  auto_generate?: boolean
}

type Sections = Record<string, { title: string; content: string }>

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

const SENSORY_OPTIONS = [
  '',
  'Much less than most people',
  'Less than most people',
  'Similar to most people',
  'More than most people',
  'Much more than most people',
] as const

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

  // NDIS goals (collapsible — unlocks Part E)
  const [goal1, setGoal1] = useState('')
  const [goal2, setGoal2] = useState('')
  const [goal3, setGoal3] = useState('')

  // Notes
  const [clinicalNotes, setClinicalNotes] = useState('')

  // UI state
  const [showBanner, setShowBanner] = useState(true)
  const [showValidation, setShowValidation] = useState(false)

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
  const router = useRouter()

  // User id is needed to scope the draft autosave key per account.
  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id)
    })
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
    }),
    [
      participantName, ndisNumber, assessor,
      participantDob, planStart, planEnd, address, nokName, nokPhone,
      assessorCredentials, assessorEmail, assessorCompany, assessmentDate, assessmentMode, reportDate,
      whodasUnderstanding, whodasMobility, whodasSelfCare, whodasGettingAlong, whodasLifeActivities, whodasParticipation,
      sensoryLowReg, sensoryAvoiding, sensorySensitivity, sensorySeeking,
      goal1, goal2, goal3,
      clinicalNotes,
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
    setRestoredAt(savedAt)
  }, [])

  const { clear: clearDraft } = useFormDraft({
    storageKey: 'theranotes:generate:draft',
    userId,
    state: formSnapshot,
    onRestore: handleDraftRestore,
    skipRestore: isGenerating || isDone,
    // Round-2 NEW-9: strip the highest-value PII from the persisted draft.
    // Participant name / NDIS# / DOB / address are typed from a referral
    // every time, so re-typing them costs the clinician seconds — but
    // leaving them in localStorage on a shared workstation costs the
    // participant a privacy breach. The narrative clinical notes are
    // retained because the editor takes 5-10 minutes to re-create them.
    redact: (s) => ({
      ...s,
      participantName: '',
      ndisNumber: '',
      participantDob: '',
      address: '',
      nokName: '',
      nokPhone: '',
    }),
  })

  // Redirect to workspace after generation completes
  useEffect(() => {
    if (isDone && reportId) {
      const timer = setTimeout(() => {
        router.push(`/reports/${reportId}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isDone, reportId, router])

  const placeholder = `Paste or dictate your clinical notes. Cover: diagnoses · ADLs · mobility & transfers · mental health · sensory & cognition · current supports.`

  // ---------------------------------------------------------------------------
  // Derived intake state — drives section status chips and the preview banner.
  // Mirror the lib/ai/intake.ts availability rules so what the UI shows matches
  // what the generator actually does.
  // ---------------------------------------------------------------------------
  const clientHasMinimum = Boolean(
    participantName.trim() && ndisNumber.trim() && participantDob.trim(),
  )
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
  // Part D: needs at least one assessment scored (WHODAS or sensory).
  // Part E: needs at least one NDIS goal.
  const headerWillGenerate = clientHasMinimum && assessorHasMinimum
  const partDWillGenerate = whodasHasAny || sensoryHasAny
  const partEWillGenerate = goalsHasAny
  // Overview, Assessment Process, Parts A/B/C — 5 narrative sections always run when notes present.
  const narrativeWillGenerate = clinicalNotes.trim().length > 50
  const sectionsThatWillGenerate =
    (headerWillGenerate ? 1 : 0) +
    (narrativeWillGenerate ? 5 : 0) +
    (partDWillGenerate ? 1 : 0) +
    (partEWillGenerate ? 1 : 0)
  const pendingLabels: string[] = []
  if (!headerWillGenerate) pendingLabels.push('Header')
  if (!partDWillGenerate) pendingLabels.push('Part D')
  if (!partEWillGenerate) pendingLabels.push('Part E')

  /** Core generation logic, shared by both paths */
  const runGeneration = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setSections({})
    setCompletedCount(0)
    setReportId(null)
    setIsDone(false)
    setShowValidation(false)

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

      const standardizedScores: Record<string, unknown> = {}
      if (whodasFilled) {
        standardizedScores.whodas = {
          understanding_communicating: parseScore(whodasUnderstanding),
          getting_around: parseScore(whodasMobility),
          self_care: parseScore(whodasSelfCare),
          getting_along: parseScore(whodasGettingAlong),
          life_activities: parseScore(whodasLifeActivities),
          participation: parseScore(whodasParticipation),
        }
      }
      if (sensoryFilled) {
        standardizedScores.sensory_profile = {
          low_registration: sensoryLowReg || null,
          sensation_avoiding: sensoryAvoiding || null,
          sensory_sensitivity: sensorySensitivity || null,
          sensation_seeking: sensorySeeking || null,
        }
      }

      const ndisGoals = [goal1, goal2, goal3]
        .map((g) => g.trim())
        .filter((g) => g.length > 0)

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          title: `${participant} FCA`,
          participant_name: participant,
          participant_dob: participantDob.trim() || null,
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

      let currentReportId: string | null = null
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
    if (!showValidation) {
      setShowValidation(true)
      return
    }
    runGeneration()
  }, [clinicalNotes, showValidation, runGeneration])

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

        {isDone && (
          <div className="mx-auto mb-6 mt-6 max-w-[800px] px-4">
            <div
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                background: 'var(--tn-ok-bg)',
                border: '1px solid var(--tn-ok-line)',
                color: 'var(--tn-ok)',
              }}
            >
              <CheckCircle2 className="size-4" />
              Report generated successfully. Review the document below and
              download when ready.
            </div>
          </div>
        )}

        <div ref={reportRef} className="px-4 pb-24">
          <FormattedReport sections={sections} />
        </div>

        {isDone && (
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
                    Open in workspace
                  </Link>
                )}
                <ExportButton sections={sections} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Generate input screen (default) ---
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar />

      <div className="tn-gen-screen">
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

        {/* Title */}
        <h1 className="tn-gen-title">
          Draft a Functional Capacity Assessment
        </h1>
        <p className="tn-gen-sub">
          Fill in the participant and paste your clinical notes &mdash;
          we&rsquo;ll draft Parts A through E.
        </p>

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

          {/* Collapsible intake sections — required where the section gates */}
          <div className="tn-intake-stack">
            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-title">Client Details</span>
                <span className="tn-intake-status">
                  {clientHasMinimum
                    ? '✓ Header will populate'
                    : 'Add DOB to populate Header'}
                </span>
              </summary>
              <div className="tn-intake-grid">
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Date of birth</span>
                  <Input
                    type="date"
                    className="tn-intake-input"
                    value={participantDob}
                    onChange={(e) => setParticipantDob(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Plan start</span>
                  <Input
                    type="date"
                    className="tn-intake-input"
                    value={planStart}
                    onChange={(e) => setPlanStart(e.target.value)}
                  />
                </Label>
                <Label className="tn-intake-field">
                  <span className="tn-intake-lbl">Plan end</span>
                  <Input
                    type="date"
                    className="tn-intake-input"
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
                <span className="tn-intake-title">Assessor & Assessment Details</span>
                <span className="tn-intake-status">
                  {assessorHasMinimum
                    ? '✓ Header will populate'
                    : 'Add credentials & company'}
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
                    type="date"
                    className="tn-intake-input"
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

            <details className="tn-intake-section">
              <summary className="tn-intake-summary">
                <span className="tn-intake-title">WHODAS 2.0 Scores</span>
                <span className="tn-intake-status">
                  {whodasHasAny
                    ? '✓ Part D will generate'
                    : '⏸ Part D will skip'}
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
                <span className="tn-intake-title">Adolescent / Adult Sensory Profile</span>
                <span className="tn-intake-status">
                  {sensoryHasAny
                    ? '✓ Part D will include sensory analysis'
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
                    {SENSORY_OPTIONS.filter(Boolean).map((opt) => (
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
                    {SENSORY_OPTIONS.filter(Boolean).map((opt) => (
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
                    {SENSORY_OPTIONS.filter(Boolean).map((opt) => (
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
                    {SENSORY_OPTIONS.filter(Boolean).map((opt) => (
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
                <span className="tn-intake-title">NDIS Goals (verbatim, participant-stated)</span>
                <span className="tn-intake-status">
                  {goalsHasAny
                    ? `✓ Part E will quote ${goalsCount} goal${goalsCount === 1 ? '' : 's'}`
                    : '⏸ Part E will skip'}
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
              Will generate{' '}
              <strong>{sectionsThatWillGenerate} of 8 sections</strong>.
              {pendingLabels.length > 0 && (
                <>
                  {' '}
                  Pending:{' '}
                  <strong>{pendingLabels.join(', ')}</strong> — add the
                  unlocking data above to include{' '}
                  {pendingLabels.length === 1 ? 'it' : 'them'}.
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
              aria-label={`Generate ${sectionsThatWillGenerate} sections`}
              title={`Generate ${sectionsThatWillGenerate} of 8 sections`}
            >
              Generate {sectionsThatWillGenerate || ''} {sectionsThatWillGenerate === 1 ? 'section' : 'sections'}
              <ArrowUp size={14} />
            </Button>
          </div>
        </div>

        {/* Quick-add chips removed (Day 1 review): they injected literal sample
            text into the clinical notes textarea ("hypersensitive to noise in
            community settings", "WHODAS 2.0 total 62", etc.), which is
            clinically contaminating and now redundant with the structured
            intake sections above (Sensory Profile / WHODAS Scores / NDIS Goals
            each have their own typed input). */}

        {/* Validation warning */}
        {showValidation && (
          <div className="tn-valid tn-fade-up">
            <div className="tn-valid-head">
              <AlertTriangle size={16} />
              Some domains look thin &mdash; the draft may contain
              &ldquo;insufficient data&rdquo; markers.
            </div>
            <ul className="tn-valid-list">
              <li>
                <b>Mental Health</b> &mdash; try adding triggers, coping
                strategies, treating clinician.
              </li>
              <li>
                <b>Standardised Scores</b> &mdash; include WHODAS domains and
                any FIM / sensory scores.
              </li>
              <li>
                <b>Sensory profile</b> &mdash; describe any hyper- or
                hypo-responsiveness.
              </li>
            </ul>
            <div className="tn-valid-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidation(false)}
              >
                Add more notes
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateAnyway}
              >
                Generate anyway
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

        {/* Footnote */}
        <div className="tn-gen-footnote">
          TheraNotes drafts clinical-grade reports &mdash; every line remains
          yours to edit and verify before sending to NDIS.
        </div>
      </div>
    </div>
  )
}
