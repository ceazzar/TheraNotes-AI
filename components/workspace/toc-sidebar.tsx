'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ListTree,
  LockKeyhole,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Flag, ReportSection } from '@/lib/workspace/types'

type SectionDisplayStatus =
  | 'draft'
  | 'drafted'
  | 'needs-review'
  | 'reviewed'
  | 'locked'
  | 'ready'
  | 'conflict'

interface TocSidebarProps {
  sections: ReportSection[]
  flags: Flag[]
  activeSection: string
  collapsed: boolean
  touchedSections: Set<string>
  progressPct: number
  onToggleCollapse: () => void
  onJumpTo: (id: string) => void
  onOpenFlag: (id: string) => void
  onReviewAll: () => void
}

function isFinalEvidenceSection(section: ReportSection) {
  return (
    section.title.includes('Part D: Assessment Findings') ||
    section.title.includes('Part E: Summary & Recommendations')
  )
}

function StatusGlyph({ status }: { status: SectionDisplayStatus }) {
  if (status === 'reviewed') {
    return <CheckCircle2 size={15} style={{ color: 'var(--tn-ok)' }} />
  }
  if (status === 'locked') {
    return <LockKeyhole size={14} style={{ color: 'var(--tn-muted-2)' }} />
  }
  if (status === 'conflict') {
    return <AlertTriangle size={14} style={{ color: 'var(--tn-crit)' }} />
  }
  if (status === 'needs-review') {
    return <span className="tn-status-dot" data-status="needs-review" />
  }
  if (status === 'ready' || status === 'drafted') {
    return <span className="tn-status-dot" data-status="ready" />
  }
  return <Circle size={13} style={{ color: 'var(--tn-muted-3)' }} />
}

function StatusTag({ status }: { status: SectionDisplayStatus }) {
  const labels: Record<SectionDisplayStatus, string> = {
    draft: 'Draft',
    drafted: 'Drafted',
    'needs-review': 'Needs review',
    reviewed: 'Reviewed',
    locked: 'Locked',
    ready: 'Ready',
    conflict: 'Conflict',
  }

  return (
    <span className="tn-rs-tag" data-status={status}>
      {labels[status]}
    </span>
  )
}

export function TocSidebar({
  sections,
  flags,
  activeSection,
  collapsed,
  touchedSections,
  progressPct,
  onToggleCollapse,
  onJumpTo,
  onOpenFlag,
  onReviewAll,
}: TocSidebarProps) {
  const liveFlags = flags.filter((f) => !f.resolved)
  const draftSections = sections.filter((section) => !isFinalEvidenceSection(section))
  const finalSections = sections.filter(isFinalEvidenceSection)
  const sectionIds = new Set(sections.map((section) => section.id))
  const draftedCount = draftSections.filter((section) => touchedSections.has(section.id)).length
  const remainingCount = Math.max(0, draftSections.length - draftedCount)
  const draftProgressPct = draftSections.length
    ? Math.round((draftedCount / draftSections.length) * 100)
    : progressPct

  return (
    <aside className="tn-side">
      <div className="tn-side-head">
        <ListTree size={14} />
        Sections
        <button
          className="tn-side-collapse"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Draft progress — bespoke bar so the workspace sidebar stays on the
              tn-* token system rather than inheriting shadcn's primary blue. */}
          <div className="tn-side-progress">
            <div className="tn-side-progress-title">First-draft sections</div>
            <div className="tn-side-progress-copy">
              {draftedCount}/{draftSections.length} drafted · {remainingCount} to check
            </div>
            <div className="tn-side-progress-lbl">
              <span>Draft progress</span>
              <b>{draftProgressPct}%</b>
            </div>
            <div className="tn-side-progress-bar">
              <div
                className="tn-side-progress-fill"
                data-complete={draftProgressPct >= 100 ? 'true' : undefined}
                style={{ width: `${Math.min(100, Math.max(0, draftProgressPct))}%` }}
              />
            </div>
          </div>

          {/* Table of contents */}
          <div className="tn-side-toc">
            <div className="tn-toc-label">Generated from clinical notes</div>
            {draftSections.map((s) => {
              const sectionFlags = liveFlags.filter(
                (f) => f.section === s.id
              )
              const hasCrit = sectionFlags.some((f) => f.sev === 'critical')
              const edited = touchedSections.has(s.id)
              const displayStatus: SectionDisplayStatus = hasCrit
                ? 'conflict'
                : sectionFlags.length > 0
                  ? 'needs-review'
                  : edited
                    ? 'drafted'
                    : 'draft'

              return (
                <button
                  key={s.id}
                  className="tn-toc-item tn-rail-section"
                  data-active={activeSection === s.id}
                  onClick={() => onJumpTo(s.id)}
                >
                  <span className="tn-rs-icon">
                    <StatusGlyph status={displayStatus} />
                  </span>
                  <span className="tn-rs-copy">
                    <span className="tn-toc-name">
                      {s.title.replace(/^Part [A-E] — /, '')}
                    </span>
                    {sectionFlags.length > 0 && (
                      <span className="tn-rs-sub">
                        <span
                          className="tn-rs-warn-dot"
                          data-sev={hasCrit ? 'critical' : 'warning'}
                        />
                        {hasCrit ? 'Evidence conflict' : `${sectionFlags.length} review item${sectionFlags.length === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </span>
                  <StatusTag status={displayStatus} />
                </button>
              )
            })}

            <div className="tn-toc-label">Final after evidence</div>
            {(finalSections.length > 0
              ? finalSections
              : [
                  {
                    id: 'locked-part-d',
                    title: 'Part D: Assessment Findings',
                  },
                  {
                    id: 'locked-part-e',
                    title: 'Part E: Summary & Recommendations',
                  },
                ]
            ).map((s) => {
              const isRealSection = sectionIds.has(s.id)
              const edited = touchedSections.has(s.id)
              const status: SectionDisplayStatus = edited
                ? 'ready'
                : isRealSection
                  ? 'draft'
                  : 'locked'
              return (
                <button
                  key={s.id}
                  className="tn-toc-item tn-rail-section"
                  data-active={activeSection === s.id}
                  data-locked={status === 'locked' ? 'true' : undefined}
                  disabled={status === 'locked'}
                  onClick={() => {
                    if (status !== 'locked') onJumpTo(s.id)
                  }}
                >
                  <span className="tn-rs-icon">
                    <StatusGlyph status={status} />
                  </span>
                  <span className="tn-rs-copy">
                    <span className="tn-toc-name">{s.title}</span>
                    <span className="tn-rs-sub">
                      {status === 'locked'
                        ? 'Upload reviewed assessment evidence first'
                        : 'Review after standardised evidence is available'}
                    </span>
                  </span>
                  <StatusTag status={status} />
                </button>
              )
            })}
          </div>

          {/* NDIS Planner Review summary */}
          <SidebarFlagSummary
            flags={flags}
            onOpen={onOpenFlag}
            onReviewAll={onReviewAll}
          />
          <div className="tn-clinical-safety">
            <div>
              <AlertTriangle size={12} />
              <b>Clinical safety</b>
            </div>
            AI never silently changes report text. Every edit is reviewed by
            the OT before it is applied.
          </div>
        </>
      )}
    </aside>
  )
}

function SidebarFlagSummary({
  flags,
  onOpen,
  onReviewAll,
}: {
  flags: Flag[]
  onOpen: (id: string) => void
  onReviewAll: () => void
}) {
  const live = flags.filter((f) => !f.resolved)
  const crit = live.filter((f) => f.sev === 'critical').length
  const warn = live.filter((f) => f.sev === 'warning').length
  const sugg = live.filter((f) => f.sev === 'suggestion').length

  return (
    <div className="tn-side-review">
      <div className="tn-side-review-title">NDIS Planner Review</div>
      <div className="tn-side-review-counts">
        <span className="tn-count" data-sev="critical">
          <span className="tn-count-dot" />
          {crit} critical
        </span>
        <span className="tn-count" data-sev="warning">
          <span className="tn-count-dot" />
          {warn} warning{warn === 1 ? '' : 's'}
        </span>
        <span className="tn-count" data-sev="suggestion">
          <span className="tn-count-dot" />
          {sugg} suggestion{sugg === 1 ? '' : 's'}
        </span>
      </div>
      <div className="tn-side-review-list">
        {live.slice(0, 4).map((f) => (
          <button
            key={f.id}
            className="tn-review-row"
            onClick={() => onOpen(f.id)}
          >
            <span
              className="tn-count-dot"
              style={{
                background:
                  f.sev === "critical"
                    ? "var(--tn-crit)"
                    : f.sev === "warning"
                      ? "var(--tn-warn)"
                      : "var(--tn-sugg)",
              }}
            />
            <span>{f.title}</span>
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        style={{ width: "100%" }}
        onClick={onReviewAll}
      >
        Review all {live.length}
      </Button>
    </div>
  )
}
