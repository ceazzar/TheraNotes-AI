'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

export interface ClinicalField {
  key: string
  label: string
  type: 'text' | 'textarea'
  placeholder?: string
}

interface ClinicalDomainProps {
  title: string
  description: string
  fields: ClinicalField[]
  data: Record<string, string>
  onUpdate: (field: string, value: string) => void
}

export function ClinicalDomain({
  title,
  description,
  fields,
  data,
  onUpdate,
}: ClinicalDomainProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    value={data[field.key] ?? ''}
                    onChange={(e) => onUpdate(field.key, e.target.value)}
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                    className="min-h-24"
                  />
                ) : (
                  <Input
                    id={field.key}
                    value={data[field.key] ?? ''}
                    onChange={(e) => onUpdate(field.key, e.target.value)}
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
