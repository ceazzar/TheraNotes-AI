'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  FileText,
  History,
  MessageSquare,
  PenLine,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUpload, FileUploadTrigger } from '@/components/ui/file-upload'
import type { Flag, ReportSection } from '@/lib/workspace/types'
import type { SaveStatus } from '@/hooks/use-auto-save'

type AssistantTab = 'ask' | 'improve' | 'evidence' | 'missing' | 'history'

interface ClinicalAssistantPanelProps {
  collapsed: boolean
  activeSection: string
  sections: ReportSection[]
  flags: Flag[]
  saveStatus: SaveStatus
  reviewing: boolean
  finalising: boolean
  onCollapse: () => void
  onExpand: () => void
  onRunReview: () => void
  onAddAssessmentFiles: (files: File[]) => void
}

const tabs: Array<{
  id: AssistantTab
  label: string
  icon: ReactNode
}> = [
  { id: 'ask', label: 'Ask', icon: <Sparkles size={13} /> },
  { id: 'improve', label: 'Improve', icon: <PenLine size={13} /> },
  { id: 'evidence', label: 'Evidence', icon: <FileText size={13} /> },
  { id: 'missing', label: 'Missing info', icon: <AlertTriangle size={13} /> },
  { id: 'history', label: 'History', icon: <History size={13} /> },
]

export function ClinicalAssistantPanel({
  collapsed,
  activeSection,
  sections,
  flags,
  saveStatus,
  reviewing,
  finalising,
  onCollapse,
  onExpand,
  onRunReview,
  onAddAssessmentFiles,
}: ClinicalAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<AssistantTab>('improve')
  const section = useMemo(
    () => sections.find((s) => s.id === activeSection) ?? sections[0],
    [activeSection, sections],
  )
  const sectionFlags = flags.filter((flag) => flag.section === section?.id && !flag.resolved)
  const hasBlockingFlag = sectionFlags.some((flag) => flag.sev === 'critical' || flag.sev === 'warning')

  if (collapsed) {
    return (
      <aside className="tn-ai-strip" aria-label="Clinical assistant collapsed">
        <button type="button" className="tn-ai-strip-btn" onClick={onExpand} title="Open AI panel">
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tn-ai-strip-btn"
            data-active={activeTab === tab.id ? 'true' : undefined}
            onClick={() => {
              setActiveTab(tab.id)
              onExpand()
            }}
            title={tab.label}
          >
            {tab.icon}
            {(tab.id === 'improve' && hasBlockingFlag) || (tab.id === 'missing' && sectionFlags.length > 0) ? (
              <span className="ping" />
            ) : null}
          </button>
        ))}
        <span className="tn-ai-strip-label">AI · ready</span>
      </aside>
    )
  }

  return (
    <aside className="tn-ai-panel" aria-label="Clinical assistant">
      <div className="tn-ai-head">
        <div>
          <div className="tn-ai-kicker">
            <Sparkles size={12} /> Clinical assistant
          </div>
          <h2>{section?.title ?? 'Report section'}</h2>
          <p>
            Source notes, prior versions and uploaded standardised reports are
            visible to AI only when you ask. Nothing is auto-changed.
          </p>
        </div>
        <button type="button" className="tn-ai-close" onClick={onCollapse} aria-label="Collapse panel">
          <X size={14} />
        </button>
      </div>

      <div className="tn-ai-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tn-ai-tab"
            data-active={activeTab === tab.id ? 'true' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'missing' && sectionFlags.length > 0 ? (
              <span className="count">{sectionFlags.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="tn-ai-body">
        {activeTab === 'ask' && (
          <div className="tn-ai-stack">
            <div className="tn-ai-label">Suggested for this section</div>
            {[
              'What is weak in this section?',
              'What evidence supports this?',
              'Does this overstate the evidence?',
              'Make this more functional and NDIS-aligned.',
            ].map((prompt) => (
              <button key={prompt} type="button" className="tn-ai-prompt">
                <MessageSquare size={13} />
                {prompt}
              </button>
            ))}
            <div className="tn-ai-note">
              Use text selection in the document for paragraph-level AI edits.
              Proposed wording must be accepted before it changes the report.
            </div>
          </div>
        )}

        {activeTab === 'improve' && (
          <div className="tn-ai-stack">
            {hasBlockingFlag && (
              <div className="tn-ai-warning">
                <AlertTriangle size={14} />
                <span>
                  {sectionFlags.length} review item{sectionFlags.length === 1 ? '' : 's'} need attention before this section is final.
                </span>
              </div>
            )}
            <div className="tn-ai-label">One-click improvements</div>
            <div className="tn-ai-action-grid">
              {[
                ['Strengthen clinical reasoning', 'Connect observations to functional impact.'],
                ['Improve NDIS language', 'Align terminology to access criteria.'],
                ['Add functional examples', 'Concrete day-to-day situations.'],
                ['Reduce repetition', 'Tighten phrasing across paragraphs.'],
                ['More professional tone', 'Calmer, clinician-grade language.'],
                ['Rewrite for clarity', 'Plain, declarative sentences.'],
              ].map(([title, subtitle]) => (
                <button key={title} type="button" className="tn-ai-action">
                  <Sparkles size={14} />
                  <span>
                    <b>{title}</b>
                    <small>{subtitle}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="tn-ai-note">
              AI returns a paragraph-level edit with current text, suggested
              text, rationale and evidence used. Every action is logged.
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="tn-ai-stack">
            <div className="tn-ai-label">Standardised assessment evidence</div>
            <div className="tn-ai-upload">
              <Upload size={16} />
              <b>Upload standardised OT assessment reports</b>
              <span>Examples: WHODAS 2.0, Sensory Profile, ABAS-3, Vineland-3, PEDI-CAT, MoCA.</span>
              <FileUpload
                accept="application/pdf,.pdf"
                multiple
                disabled={finalising}
                onFilesAdded={onAddAssessmentFiles}
              >
                <FileUploadTrigger asChild>
                  <Button size="sm" disabled={finalising}>
                    <Upload size={13} />
                    {finalising ? 'Finalising...' : 'Upload reports'}
                  </Button>
                </FileUploadTrigger>
              </FileUpload>
            </div>
            <div className="tn-ai-note">
              Part D and final recommendations should reference only reviewed
              extracted findings.
            </div>
          </div>
        )}

        {activeTab === 'missing' && (
          <div className="tn-ai-stack">
            <div className="tn-ai-label">Targeted clinical questions</div>
            {sectionFlags.length > 0 ? (
              sectionFlags.map((flag) => (
                <div key={flag.id} className="tn-ai-question">
                  <AlertTriangle size={14} />
                  <span>
                    <b>{flag.title}</b>
                    <small>{flag.desc}</small>
                  </span>
                </div>
              ))
            ) : (
              <div className="tn-ai-empty">
                No missing-information questions for this section yet.
              </div>
            )}
            <Button variant="outline" size="sm" onClick={onRunReview} disabled={reviewing}>
              {reviewing ? 'Reviewing...' : 'Run NDIS review'}
            </Button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tn-ai-stack">
            <div className="tn-ai-label">Section version history</div>
            <div className="tn-history-event">
              <Clock3 size={14} />
              <span>
                <b>Autosave status</b>
                <small>{saveStatus === 'saving' ? 'Saving latest edits...' : 'All latest edits saved.'}</small>
              </span>
            </div>
            <div className="tn-history-event">
              <Sparkles size={14} />
              <span>
                <b>First draft generated</b>
                <small>Generated from clinical notes and available evidence.</small>
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
