'use client'

import { useEffect } from 'react'
import { Sparkles, Check } from 'lucide-react'

interface ReportSection {
  id: string
  title: string
  duration: number
}

interface ProgressScreenProps {
  sections: ReportSection[]
  activeIndex: number
  onComplete?: () => void
}

export function ProgressScreen({
  sections,
  activeIndex,
  onComplete,
}: ProgressScreenProps) {
  const total = sections.length
  const isComplete = activeIndex >= total
  const pct = Math.min(100, Math.round((activeIndex / total) * 100))
  const activeSection = sections[Math.min(activeIndex, total - 1)]

  useEffect(() => {
    if (isComplete && onComplete) {
      const t = setTimeout(onComplete, 500)
      return () => clearTimeout(t)
    }
  }, [isComplete, onComplete])

  return (
    <div className="tn-progress-wrap">
      <div className="tn-progress-card tn-fade-up">
        <h2 className="tn-progress-title">
          <Sparkles size={14} />
          {isComplete ? 'Report ready' : `Generating ${activeSection?.title}`}
          {!isComplete && (
            <span style={{ color: 'var(--tn-muted-2)', marginLeft: 2 }}>
              <span className="tn-typing-dot" />
              <span className="tn-typing-dot" />
              <span className="tn-typing-dot" />
            </span>
          )}
        </h2>
        <p className="tn-progress-sub">
          {isComplete
            ? "Opening the editor -- you'll land in a working draft."
            : "We're drafting each section in sequence, grounded in your notes and your prior reports."}
        </p>

        <div className="tn-progress-bar">
          <div
            className="tn-progress-bar-fill"
            style={{ width: `${isComplete ? 100 : pct}%` }}
          />
        </div>

        <div className="tn-section-list">
          {sections.map((s, i) => {
            const state =
              i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
            return (
              <div key={s.id} className="tn-section-row" data-state={state}>
                <span className="tn-section-icon">
                  {state === 'done' && <Check size={12} strokeWidth={2.5} />}
                  {state === 'active' && (
                    <span
                      className="tn-typing-dot"
                      style={{ background: 'currentColor' }}
                    />
                  )}
                </span>
                <span className="tn-section-name">{s.title}</span>
                <span className="tn-section-meta">
                  {state === 'done'
                    ? 'done'
                    : state === 'active'
                      ? 'writing...'
                      : 'queued'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
