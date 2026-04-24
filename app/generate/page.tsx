'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Paperclip,
  Mic,
  FileText,
  ArrowUp,
  Sparkles,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export default function GeneratePage() {
  // Identity fields
  const [participantName, setParticipantName] = useState('')
  const [ndisNumber, setNdisNumber] = useState('')
  const [assessor, setAssessor] = useState('')

  // Notes
  const [clinicalNotes, setClinicalNotes] = useState('')

  // UI state
  const [showBanner, setShowBanner] = useState(true)
  const [showValidation, setShowValidation] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentSectionName, setCurrentSectionName] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [sections, setSections] = useState<Sections>({})
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCoherenceRunning, setIsCoherenceRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const placeholder = `Paste or dictate your clinical notes. Cover: diagnoses · ADLs · mobility & transfers · mental health · sensory & cognition · standardised scores (WHODAS, FIM) · current supports · participant goals.`

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

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          participant_name: participantName || 'Quick Generate',
          clinical_notes: clinicalNotes,
          domains: {},
          status: 'quick_generate',
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
        setCurrentSectionName(section.name)

        const response = await fetch('/api/generate', {
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
        setIsCoherenceRunning(true)
        setCurrentSectionName('Running coherence check...')

        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'coherence_check',
            reportId: currentReportId,
            clinicalNotes,
          }),
        })
      }

      setIsDone(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      )
    } finally {
      setIsGenerating(false)
      setIsCoherenceRunning(false)
      setCurrentSectionName('')
    }
  }, [clinicalNotes, supabase, participantName])

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
              <Sparkles className="size-4" />
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
                    href={`/report/${reportId}`}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--tn-muted-1)' }}
                  >
                    Open in report viewer
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
        {/* First-run banner */}
        {showBanner && (
          <div className="tn-banner tn-fade-up">
            <span className="tn-banner-dot" />
            <span>
              <strong>Tip</strong>&nbsp;&nbsp;Upload your previous FCA reports in
              Settings to personalise the AI&rsquo;s writing style.
            </span>
            <button
              className="tn-banner-close"
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
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
            <label className="tn-id-field">
              <span className="tn-id-label">Participant name</span>
              <input
                className="tn-id-input"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Participant A"
              />
            </label>
            <label className="tn-id-field">
              <span className="tn-id-label">NDIS number</span>
              <input
                className="tn-id-input"
                value={ndisNumber}
                onChange={(e) => setNdisNumber(e.target.value)}
                placeholder="430 xxx xxx"
              />
            </label>
            <label className="tn-id-field">
              <span className="tn-id-label">Assessor</span>
              <input
                className="tn-id-input"
                value={assessor}
                onChange={(e) => setAssessor(e.target.value)}
                placeholder="Name, credentials"
              />
            </label>
          </div>

          {/* Textarea */}
          <textarea
            className="tn-notes-area"
            placeholder={placeholder}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />

          {/* Footer bar */}
          <div className="tn-gen-footer">
            <div className="tn-gen-tools">
              <button
                className="tn-tool-chip"
                title="Attach transcripts or prior reports"
              >
                <Paperclip size={14} /> Attach
              </button>
              <button className="tn-tool-chip" title="Dictate">
                <Mic size={14} /> Dictate
              </button>
              <button className="tn-tool-chip" title="Use a template">
                <FileText size={14} /> Template
              </button>
            </div>
            <button
              className="tn-send-btn"
              onClick={handleGenerate}
              disabled={!clinicalNotes.trim()}
              aria-label="Generate report"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>

        {/* Quick-add chips (hidden when validation shows) */}
        {!showValidation && (
          <div className="tn-gen-helpers">
            <button
              className="tn-chip"
              onClick={() =>
                setClinicalNotes(
                  (n) =>
                    n +
                    '\n\nAdditional: sensory -- hypersensitive to noise in community settings.'
                )
              }
            >
              + Sensory
            </button>
            <button
              className="tn-chip"
              onClick={() =>
                setClinicalNotes(
                  (n) =>
                    n +
                    '\n\nStandardised scores: WHODAS 2.0 total 62, Domain 5 (Participation) 68; FIM Self-Care 3.'
                )
              }
            >
              + Scores
            </button>
            <button
              className="tn-chip"
              onClick={() =>
                setClinicalNotes(
                  (n) =>
                    n +
                    '\n\nMental health: chronic anxiety and low mood most days; fortnightly psych; triggers unstructured time.'
                )
              }
            >
              + Mental health
            </button>
            <button
              className="tn-chip"
              onClick={() =>
                setClinicalNotes(
                  (n) =>
                    n +
                    '\n\nGoals: 1) increase community access 2) return to part-time work 3) maintain tenancy.'
                )
              }
            >
              + Goals
            </button>
          </div>
        )}

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
              <button
                className="tn-btn tn-btn-outline tn-btn-sm"
                onClick={() => setShowValidation(false)}
              >
                Add more notes
              </button>
              <button
                className="tn-btn tn-btn-primary tn-btn-sm"
                onClick={handleGenerateAnyway}
              >
                Generate anyway
              </button>
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
          yours to edit and verify. Data stays in Australia.
        </div>
      </div>
    </div>
  )
}
