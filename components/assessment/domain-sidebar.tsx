'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CompletenessBar } from './completeness-bar'
import { FileText } from 'lucide-react'

export const DOMAINS = [
  { key: 'participant_details', label: 'Participant Details' },
  { key: 'primary_diagnosis', label: 'Primary Diagnosis' },
  { key: 'social_background', label: 'Social Background' },
  { key: 'support_network', label: 'Support Network' },
  { key: 'home_environment', label: 'Home Environment' },
  { key: 'mental_health', label: 'Mental Health & Psychosocial' },
  { key: 'functional_domains', label: 'Functional Domains' },
  { key: 'standardized_scores', label: 'Standardized Assessments' },
  { key: 'clinical_notes', label: 'Additional Clinical Notes' },
] as const

export type DomainKey = (typeof DOMAINS)[number]['key']

interface DomainSidebarProps {
  activeDomain: DomainKey
  onSelectDomain: (domain: DomainKey) => void
  domainStatus: Record<string, string>
  onGenerate: () => void
  canGenerate: boolean
}

function getStatusDot(status: string | undefined) {
  if (status === 'complete') {
    return <span className="size-2 rounded-full bg-green-500 shrink-0" />
  }
  if (status === 'partial') {
    return <span className="size-2 rounded-full bg-yellow-500 shrink-0" />
  }
  return <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
}

export function DomainSidebar({
  activeDomain,
  onSelectDomain,
  domainStatus,
  onGenerate,
  canGenerate,
}: DomainSidebarProps) {
  return (
    <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-sm font-semibold mb-3">Assessment Domains</h2>
        <CompletenessBar domainStatus={domainStatus} />
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {DOMAINS.map((domain) => (
            <li key={domain.key}>
              <button
                onClick={() => onSelectDomain(domain.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-colors',
                  activeDomain === domain.key
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {getStatusDot(domainStatus[domain.key])}
                {domain.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      <div className="p-4">
        <Button
          className="w-full"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          <FileText className="size-4" data-icon="inline-start" />
          Generate Report
        </Button>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Complete at least 3 domains to generate
          </p>
        )}
      </div>
    </div>
  )
}
