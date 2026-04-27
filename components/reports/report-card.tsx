'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FileText, Trash2 } from 'lucide-react'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  generating: {
    label: 'Generating',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
}

interface ReportCardProps {
  status: string
  participantName: string | null
  sectionCount: number
  flagCount: number
  updatedAt: string
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
              <Badge variant="outline" className={cn('shrink-0', config.className)}>
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
