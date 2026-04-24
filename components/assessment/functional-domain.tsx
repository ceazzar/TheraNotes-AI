'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ClinicalDomain, type ClinicalField } from './clinical-domain'

const SUB_DOMAINS = [
  { key: 'mobility', label: 'Mobility' },
  { key: 'personal_care', label: 'Personal Care' },
  { key: 'domestic_adls', label: 'Domestic ADLs' },
  { key: 'community_access', label: 'Community Access' },
  { key: 'communication', label: 'Communication' },
  { key: 'medication_mgmt', label: 'Medication Mgmt' },
  { key: 'financial_mgmt', label: 'Financial Mgmt' },
] as const

const SUB_DOMAIN_FIELDS: ClinicalField[] = [
  { key: 'observations', label: 'Observations', type: 'textarea', placeholder: 'Describe observed functional capacity and limitations' },
  { key: 'assistance_level', label: 'Assistance Level', type: 'text', placeholder: 'e.g., Independent, Supervision, Physical Assistance' },
  { key: 'aids_equipment', label: 'Aids & Equipment', type: 'text', placeholder: 'List any aids or equipment used' },
  { key: 'barriers', label: 'Barriers', type: 'textarea', placeholder: 'Describe barriers to independence' },
]

interface FunctionalDomainProps {
  data: Record<string, Record<string, string>>
  onUpdate: (subDomain: string, field: string, value: string) => void
}

export function FunctionalDomain({ data, onUpdate }: FunctionalDomainProps) {
  const [activeTab, setActiveTab] = useState<string>(SUB_DOMAINS[0].key)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Functional Domains</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Assess functional capacity across 7 key domains of daily living.
        </p>
      </div>

      <Tabs>
        <TabsList className="flex-wrap h-auto gap-1">
          {SUB_DOMAINS.map((sd) => (
            <TabsTrigger
              key={sd.key}
              active={activeTab === sd.key}
              onClick={() => setActiveTab(sd.key)}
            >
              {sd.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {SUB_DOMAINS.map((sd) => (
          <TabsContent key={sd.key} active={activeTab === sd.key}>
            <ClinicalDomain
              title={sd.label}
              description={`Functional assessment for ${sd.label.toLowerCase()}`}
              fields={SUB_DOMAIN_FIELDS}
              data={data[sd.key] ?? {}}
              onUpdate={(field, value) => onUpdate(sd.key, field, value)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
