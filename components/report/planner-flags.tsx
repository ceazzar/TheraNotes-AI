'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PlannerFlag {
  sectionId: string
  severity: 'critical' | 'warning' | 'suggestion'
  issue: string
  recommendation: string
  ndisRationale: string
}

interface PlannerFlagsProps {
  flags: PlannerFlag[]
  sectionId: string
}

const severityConfig = {
  critical: {
    badge: 'Critical',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    cardClass: 'border-red-200 bg-red-50/50',
  },
  warning: {
    badge: 'Warning',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    cardClass: 'border-amber-200 bg-amber-50/50',
  },
  suggestion: {
    badge: 'Suggestion',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    cardClass: 'border-blue-200 bg-blue-50/50',
  },
}

export function PlannerFlags({ flags, sectionId }: PlannerFlagsProps) {
  const sectionFlags = flags.filter((f) => f.sectionId === sectionId)

  if (sectionFlags.length === 0) return null

  return (
    <div className="space-y-2 mt-3 mb-1">
      {sectionFlags.map((flag, i) => {
        const config = severityConfig[flag.severity] ?? severityConfig.suggestion
        return (
          <Card key={i} className={cn('shadow-none', config.cardClass)}>
            <CardContent className="py-3 px-4 space-y-1.5">
              <div className="flex items-start gap-2">
                <Badge className={cn('shrink-0 mt-0.5', config.badgeClass)}>
                  {config.badge}
                </Badge>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {flag.issue}
                </p>
              </div>
              <p className="text-sm text-foreground/80 pl-0.5">
                {flag.recommendation}
              </p>
              <p className="text-xs text-muted-foreground italic pl-0.5">
                {flag.ndisRationale}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
