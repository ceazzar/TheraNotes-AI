'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TOTAL_DOMAINS = 9

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  ready: {
    label: 'Ready',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  generating: {
    label: 'Generating',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  complete: {
    label: 'Complete',
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
}

interface AssessmentCardProps {
  id: string
  title: string | null
  status: string
  updatedAt: string
  domainStatus: Record<string, string>
  onClick: () => void
}

function getDomainCompletionCount(domainStatus: Record<string, string>): number {
  return Object.values(domainStatus).filter(
    (v) => v === 'complete' || v === 'filled'
  ).length
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function AssessmentCard({
  id,
  title,
  status,
  updatedAt,
  domainStatus,
  onClick,
}: AssessmentCardProps) {
  const config = statusConfig[status] ?? statusConfig.draft
  const completedDomains = getDomainCompletionCount(domainStatus ?? {})

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:border-primary/50',
        'py-4'
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug line-clamp-2">
            {title || 'Untitled Assessment'}
          </h3>
          <Badge variant="outline" className={cn('shrink-0', config.className)}>
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedDomains}/{TOTAL_DOMAINS} domains</span>
          <span>{formatDate(updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
