/**
 * Domain Mapper — bridges structured assessment JSONB data to section-specific prompt input.
 *
 * Each report section needs different slices of the assessment. This module
 * extracts and formats the relevant clinical data for a given section ID so
 * the generation engine receives only what it needs.
 */

// ---------------------------------------------------------------------------
// Assessment type (mirrors the `assessments` table in 003_hybrid_schema.sql)
// ---------------------------------------------------------------------------

export interface Assessment {
  id: string
  user_id: string
  title: string | null
  status: 'draft' | 'ready' | 'generating' | 'complete'
  participant_name: string | null
  participant_dob: string | null
  ndis_number: string | null
  referral_source: string | null
  assessment_dates: string | null
  assessment_location: string | null
  assessor_name: string | null
  assessor_credentials: string | null
  primary_diagnosis: Record<string, unknown>
  social_background: Record<string, unknown>
  support_network: Record<string, unknown>
  home_environment: Record<string, unknown>
  mental_health: Record<string, unknown>
  functional_domains: Record<string, unknown>
  standardized_scores: Record<string, unknown>
  clinical_notes: string
  domain_status: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NO_DATA = '[No data provided for this domain]'

/** Pretty-print a JSONB object as labelled key-value lines. */
function formatJsonb(obj: Record<string, unknown> | null | undefined, label?: string): string {
  if (!obj || Object.keys(obj).length === 0) return NO_DATA

  const lines: string[] = []
  if (label) lines.push(`${label}:`)

  for (const [key, value] of Object.entries(obj)) {
    const readableKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`  ${readableKey}:`)
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        const readableSubKey = subKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        lines.push(`    ${readableSubKey}: ${formatValue(subVal)}`)
      }
    } else {
      lines.push(`  ${readableKey}: ${formatValue(value)}`)
    }
  }
  return lines.join('\n')
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'N/A'
  if (Array.isArray(val)) return val.length ? val.join(', ') : 'None'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function hasData(obj: Record<string, unknown> | null | undefined): boolean {
  return !!obj && Object.keys(obj).length > 0
}

function appendClinicalNotes(result: string, notes: string | null | undefined): string {
  if (notes && notes.trim()) {
    return `${result}\n\nSUPPLEMENTARY CLINICAL NOTES:\n${notes.trim()}`
  }
  return result
}

// ---------------------------------------------------------------------------
// Section mappers
// ---------------------------------------------------------------------------

function mapReportHeader(a: Assessment): string {
  const lines = [
    'PARTICIPANT DETAILS:',
    `  Name: ${a.participant_name || 'N/A'}`,
    `  Date of Birth: ${a.participant_dob || 'N/A'}`,
    `  NDIS Number: ${a.ndis_number || 'N/A'}`,
    '',
    'ASSESSOR DETAILS:',
    `  Assessor: ${a.assessor_name || 'N/A'}`,
    `  Credentials: ${a.assessor_credentials || 'N/A'}`,
    '',
    'ASSESSMENT DETAILS:',
    `  Date(s): ${a.assessment_dates || 'N/A'}`,
    `  Location: ${a.assessment_location || 'N/A'}`,
    `  Referral Source: ${a.referral_source || 'N/A'}`,
  ]
  return lines.join('\n')
}

function mapAssessmentProcess(a: Assessment): string {
  const parts: string[] = []

  parts.push('METHODOLOGY:')
  parts.push(`  Assessment Date(s): ${a.assessment_dates || 'N/A'}`)
  parts.push(`  Location: ${a.assessment_location || 'N/A'}`)
  parts.push(`  Referral Source: ${a.referral_source || 'N/A'}`)
  parts.push(`  Assessor: ${a.assessor_name || 'N/A'} (${a.assessor_credentials || 'N/A'})`)

  if (hasData(a.standardized_scores)) {
    const tools = Object.keys(a.standardized_scores)
      .map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    parts.push(`\nSTANDARDISED TOOLS ADMINISTERED:\n  ${tools.join('\n  ')}`)
  }

  return parts.join('\n')
}

function mapPartA(a: Assessment): string {
  const sections: string[] = []

  // Primary diagnosis
  if (hasData(a.primary_diagnosis)) {
    sections.push(formatJsonb(a.primary_diagnosis, 'PRIMARY DIAGNOSIS AND MEDICAL HISTORY'))
  } else {
    sections.push(`PRIMARY DIAGNOSIS AND MEDICAL HISTORY:\n${NO_DATA}`)
  }

  // Social background
  if (hasData(a.social_background)) {
    sections.push(formatJsonb(a.social_background, 'SOCIAL BACKGROUND'))
  } else {
    sections.push(`SOCIAL BACKGROUND:\n${NO_DATA}`)
  }

  // Support network (formal + informal supports)
  if (hasData(a.support_network)) {
    sections.push(formatJsonb(a.support_network, 'SUPPORT NETWORK'))
  } else {
    sections.push(`SUPPORT NETWORK:\n${NO_DATA}`)
  }

  // Home environment
  if (hasData(a.home_environment)) {
    sections.push(formatJsonb(a.home_environment, 'HOME ENVIRONMENT'))
  } else {
    sections.push(`HOME ENVIRONMENT:\n${NO_DATA}`)
  }

  return sections.join('\n\n')
}

function mapPartB(a: Assessment): string {
  if (!hasData(a.mental_health)) return NO_DATA
  return formatJsonb(a.mental_health, 'MENTAL HEALTH AND PSYCHOSOCIAL FUNCTIONING')
}

function mapPartC(a: Assessment): string {
  if (!hasData(a.functional_domains)) return NO_DATA

  const domains = a.functional_domains as Record<string, unknown>
  const subDomains = ['mobility', 'personal_care', 'domestic_adls', 'community_access', 'communication']
  const parts: string[] = ['FUNCTIONAL IMPAIRMENTS:']

  for (const domain of subDomains) {
    const data = domains[domain]
    const label = domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    if (data && typeof data === 'object' && Object.keys(data as object).length > 0) {
      parts.push(formatJsonb(data as Record<string, unknown>, label))
    } else {
      parts.push(`${label}:\n${NO_DATA}`)
    }
  }

  // Include any additional functional domain keys not in the standard list
  for (const [key, value] of Object.entries(domains)) {
    if (!subDomains.includes(key) && value && typeof value === 'object') {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      parts.push(formatJsonb(value as Record<string, unknown>, label))
    }
  }

  return parts.join('\n\n')
}

function mapPartD(a: Assessment): string {
  if (!hasData(a.standardized_scores)) return NO_DATA
  return formatJsonb(a.standardized_scores, 'STANDARDISED ASSESSMENT SCORES')
}

function mapPartE(a: Assessment): string {
  return (
    'NOTE: This is the summary and recommendations section. ' +
    'Full report data from Parts A-D has been provided in previous sections. ' +
    'Use the report_so_far context to reference specific findings and assessment scores.'
  )
}

// ---------------------------------------------------------------------------
// Section ID → mapper lookup
// ---------------------------------------------------------------------------

/**
 * Normalise a template section name to a canonical key for matching.
 *
 * Template names look like:
 *   "Report Header / Participant Details"
 *   "Part A: About The Participant"
 *   "Part C: Functional Impairments Relating To Disability"
 *
 * We also accept short-hand keys such as "report_header", "part_a", "part_b", etc.
 */
function canonicalKey(sectionId: string): string {
  return sectionId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const SECTION_MATCHERS: Array<{ test: (key: string) => boolean; mapper: (a: Assessment) => string }> = [
  {
    test: (k) => k.includes('report_header') || k.includes('participant_details'),
    mapper: mapReportHeader,
  },
  {
    test: (k) => k.includes('table_of_content'),
    mapper: () => '', // auto-generated, no domain data needed
  },
  {
    test: (k) => k.includes('report_overview'),
    mapper: (a) => {
      // Overview needs participant name and basic context
      const lines = [
        `Participant: ${a.participant_name || 'the participant'}`,
        `Assessor: ${a.assessor_name || 'N/A'}`,
        `Assessment Date(s): ${a.assessment_dates || 'N/A'}`,
      ]
      return lines.join('\n')
    },
  },
  {
    test: (k) => k.includes('assessment_process'),
    mapper: mapAssessmentProcess,
  },
  {
    test: (k) => k.includes('part_a'),
    mapper: mapPartA,
  },
  {
    test: (k) => k.includes('part_b'),
    mapper: mapPartB,
  },
  {
    test: (k) => k.includes('part_c'),
    mapper: mapPartC,
  },
  {
    test: (k) => k.includes('part_d'),
    mapper: mapPartD,
  },
  {
    test: (k) => k.includes('part_e'),
    mapper: mapPartE,
  },
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract and format the relevant clinical data from a structured assessment
 * for a specific report section.
 *
 * @param sectionId - Section name (from template.json) or order number
 * @param assessment - Full assessment record from the database
 * @returns Formatted clinical data string ready for the generation prompt
 */
export function getDomainDataForSection(sectionId: string, assessment: Assessment): string {
  const key = canonicalKey(sectionId)

  const match = SECTION_MATCHERS.find(m => m.test(key))
  const domainData = match ? match.mapper(assessment) : NO_DATA

  return appendClinicalNotes(domainData, assessment.clinical_notes)
}
