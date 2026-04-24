'use client'

import { Progress } from '@/components/ui/progress'

interface CompletenessBarProps {
  domainStatus: Record<string, string>
}

function calculateCompleteness(domainStatus: Record<string, string>): number {
  const entries = Object.values(domainStatus)
  if (entries.length === 0) return 0

  const total = entries.reduce((sum, status) => {
    if (status === 'complete') return sum + 1
    if (status === 'partial') return sum + 0.5
    return sum
  }, 0)

  return Math.round((total / 9) * 100)
}

export function CompletenessBar({ domainStatus }: CompletenessBarProps) {
  const percentage = calculateCompleteness(domainStatus)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Overall Progress</span>
        <span>{percentage}%</span>
      </div>
      <Progress value={percentage} />
    </div>
  )
}
