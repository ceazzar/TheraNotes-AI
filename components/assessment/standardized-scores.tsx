'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const WHODAS_DOMAINS = [
  { key: 'cognition', label: 'Cognition' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'self_care', label: 'Self-care' },
  { key: 'getting_along', label: 'Getting Along' },
  { key: 'life_activities', label: 'Life Activities' },
  { key: 'participation', label: 'Participation' },
  { key: 'total', label: 'Total Score' },
] as const

const SENSORY_QUADRANTS = [
  { key: 'low_registration', label: 'Low Registration' },
  { key: 'sensation_seeking', label: 'Sensation Seeking' },
  { key: 'sensory_sensitivity', label: 'Sensory Sensitivity' },
  { key: 'sensation_avoiding', label: 'Sensation Avoiding' },
] as const

interface StandardizedScoresProps {
  data: Record<string, Record<string, string> | string>
  onUpdate: (section: string, field: string, value: string) => void
}

export function StandardizedScores({ data, onUpdate }: StandardizedScoresProps) {
  const whodas = (data.whodas ?? {}) as Record<string, string>
  const sensory = (data.sensory ?? {}) as Record<string, string>
  const otherTools = (data.other_tools as string) ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Standardized Assessments</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter scores from standardized assessment tools administered during the evaluation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">WHODAS 2.0 Domain Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              {WHODAS_DOMAINS.map((domain) => (
                <div key={domain.key} className="space-y-2">
                  <Label htmlFor={`whodas_${domain.key}`}>{domain.label}</Label>
                  <Input
                    id={`whodas_${domain.key}`}
                    type="number"
                    value={whodas[domain.key] ?? ''}
                    onChange={(e) => onUpdate('whodas', domain.key, e.target.value)}
                    placeholder="0-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">Sensory Profile Quadrant Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              {SENSORY_QUADRANTS.map((quadrant) => (
                <div key={quadrant.key} className="space-y-2">
                  <Label htmlFor={`sensory_${quadrant.key}`}>{quadrant.label}</Label>
                  <Input
                    id={`sensory_${quadrant.key}`}
                    type="number"
                    value={sensory[quadrant.key] ?? ''}
                    onChange={(e) => onUpdate('sensory', quadrant.key, e.target.value)}
                    placeholder="Score"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="other_tools">Other Assessment Tools</Label>
            <Textarea
              id="other_tools"
              value={otherTools}
              onChange={(e) => onUpdate('other_tools', '', e.target.value)}
              placeholder="Enter results from any additional standardized assessment tools (e.g., Vineland-3, BRIEF-A, Maladaptive Behaviour Scales)"
              className="min-h-32"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
