'use client'

import { useEffect, useState, type MouseEvent, type CSSProperties } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FileText, RotateCw, Trash2 } from 'lucide-react'

// Round-3 VC-6: status badges previously used raw Tailwind palette including
// bg-purple-500, the only purple in the app. Mapped to the existing tn-*
// severity tokens (warn / sugg / ok / crit) so badges share the design
// system's palette and a future palette change updates one place.
const statusConfig: Record<string, { label: string; style: CSSProperties }> = {
  draft: {
    label: 'Draft',
    style: {
      background: 'var(--tn-warn-bg)',
      color: 'var(--tn-warn)',
      borderColor: 'var(--tn-warn-line)',
    },
  },
  generating: {
    label: 'Generating',
    style: {
      background: 'var(--tn-sugg-bg)',
      color: 'var(--tn-sugg)',
      borderColor: 'var(--tn-sugg-line)',
    },
  },
  ready: {
    label: 'Ready',
    style: {
      background: 'var(--tn-ok-bg)',
      color: 'var(--tn-ok)',
      borderColor: 'var(--tn-ok-line)',
    },
  },
  failed: {
    label: 'Failed',
    style: {
      background: 'var(--tn-crit-bg)',
      color: 'var(--tn-crit)',
      borderColor: 'var(--tn-crit-line)',
    },
  },
}

interface ReportCardProps {
  status: string
  participantName: string | null
  sectionCount: number
  flagCount: number
  updatedAt: string
  /** Round-3 UA-4: when set on a failed report with partial sections, the
   *  card shows a Resume affordance that opens the workspace where the
   *  remaining sections can be continued from. */
  canResume?: boolean
  onClick: () => void
  onDelete: () => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ReportCard({
  status,
  participantName,
  sectionCount,
  flagCount,
  updatedAt,
  canResume = false,
  onClick,
  onDelete,
}: ReportCardProps) {
  const config = statusConfig[status] ?? statusConfig.draft
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return

    const timeout = window.setTimeout(() => setConfirming(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [confirming])

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (confirming) {
      onDelete()
      return
    }

    setConfirming(true)
  }

  return (
    <div className="tn-report-card-wrap">
      <button
        type="button"
        className="w-full text-left"
        onClick={onClick}
      >
        <Card
          className={cn(
            'transition-colors hover:border-primary/50',
            'py-4'
          )}
        >
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="font-medium text-sm leading-snug line-clamp-2">
                  {participantName
                    ? `FCA — ${participantName}`
                    : 'FCA Report'}
                </h3>
              </div>
              <Badge variant="outline" className="shrink-0" style={config.style}>
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                {flagCount > 0 && ` · ${flagCount} flags`}
              </span>
              <span>{formatDate(updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </button>
      {canResume && (
        <button
          type="button"
          className="tn-card-resume"
          onClick={(event) => {
            event.stopPropagation()
            // Resume routes through the workspace, which is where the
            // continuation loop lives and surfaces per-section progress.
            onClick()
          }}
          aria-label="Resume report — continue generating missing sections"
          title="Continue generating the missing sections"
        >
          <RotateCw size={11} />
          <span className="text-xs">Resume</span>
        </button>
      )}
      <button
        type="button"
        className={cn('tn-card-delete', confirming && 'tn-card-delete-confirm')}
        onClick={handleDeleteClick}
        aria-label={confirming ? 'Confirm delete report' : 'Delete report'}
      >
        {confirming ? (
          <span className="text-xs">Delete?</span>
        ) : (
          <Trash2 size={13} />
        )}
      </button>
    </div>
  )
}
