'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const FIELDS = [
  { key: 'participant_name', label: 'Participant Name', type: 'text' },
  { key: 'participant_dob', label: 'Date of Birth', type: 'date' },
  { key: 'ndis_number', label: 'NDIS Number', type: 'text' },
  { key: 'referral_source', label: 'Referral Source', type: 'text' },
  { key: 'assessment_dates', label: 'Assessment Date(s)', type: 'text' },
  { key: 'assessment_location', label: 'Assessment Location', type: 'text' },
  { key: 'assessor_name', label: 'Assessor Name', type: 'text' },
  { key: 'assessor_credentials', label: 'Assessor Credentials', type: 'text' },
] as const

interface ParticipantDetailsProps {
  data: Record<string, string>
  onUpdate: (field: string, value: string) => void
}

export function ParticipantDetails({ data, onUpdate }: ParticipantDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Participant Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Basic information about the participant and the assessment context.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  value={data[field.key] ?? ''}
                  onChange={(e) => onUpdate(field.key, e.target.value)}
                  placeholder={field.type === 'date' ? undefined : `Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
