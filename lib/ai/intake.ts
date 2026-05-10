/**
 * Section-aware intake availability.
 *
 * Each section in template.json declares `requires: string[]` — the intake
 * buckets it cannot generate without. Before any LLM call, we check whether
 * the assessment record contains enough structured data to satisfy `requires`.
 * If not, the section is returned as `pending` with no token spend.
 *
 * Buckets are purposefully coarse (not per-field) so that the staged-generation
 * UX matches real OT workflow: write narrative now, add scores later, add goals
 * last. See docs/STRATEGY-2026-05-09.md for the design rationale.
 */

import type { Assessment } from '@/lib/ai/domain-mapper'

export type IntakeBucket =
  | 'client'
  | 'assessor'
  | 'assessment'
  | 'clinical_notes'
  | 'standardized_scores'
  | 'ndis_goals'
  | 'report_so_far'

/**
 * Given an assessment record, return the set of intake buckets present.
 * "Present" means the bucket has enough data to be clinically useful, not
 * just non-null on a single field.
 */
export function getAvailableIntake(
  assessment: Assessment | null | undefined,
  options: { hasReportSoFar?: boolean } = {},
): IntakeBucket[] {
  const available: IntakeBucket[] = []
  if (assessment) {
    if (hasClient(assessment)) available.push('client')
    if (hasAssessor(assessment)) available.push('assessor')
    if (hasAssessment(assessment)) available.push('assessment')
    if (
      typeof assessment.clinical_notes === 'string' &&
      assessment.clinical_notes.trim().length > 50
    ) {
      available.push('clinical_notes')
    }
    if (Object.keys(assessment.standardized_scores ?? {}).length > 0) {
      available.push('standardized_scores')
    }
    if (Array.isArray(assessment.ndis_goals) && assessment.ndis_goals.length > 0) {
      available.push('ndis_goals')
    }
  }
  if (options.hasReportSoFar) available.push('report_so_far')
  return available
}

/** Required buckets that are not yet satisfied. */
export function missingFromRequires(
  required: readonly string[],
  available: IntakeBucket[],
): IntakeBucket[] {
  return (required as IntakeBucket[]).filter((r) => !available.includes(r))
}

function hasClient(a: Assessment): boolean {
  // Minimum clinically useful client data: name + NDIS# + DOB.
  // Address, plan dates, NOK are recommended but their absence shouldn't
  // block Header generation — those cells become [INSUFFICIENT DATA] flags.
  return !!(a.participant_name && a.ndis_number && a.participant_dob)
}

function hasAssessor(a: Assessment): boolean {
  return !!(a.assessor_name && a.assessor_credentials)
}

function hasAssessment(a: Assessment): boolean {
  // Assessment date is the only hard requirement; mode/location can be inferred or flagged.
  return !!a.assessment_dates
}

// ---------------------------------------------------------------------------
// Intake-metadata accessors
// ---------------------------------------------------------------------------

export interface IntakeMetadata {
  client?: {
    address?: string | null
    plan_start?: string | null
    plan_end?: string | null
    nok_name?: string | null
    nok_phone?: string | null
  }
  assessor?: {
    email?: string | null
    company?: string | null
  }
  assessment?: {
    report_date?: string | null
    mode?: 'in-person' | 'telehealth' | 'hybrid' | null
    collateral_informants?: string | null
  }
}

export function readIntakeMetadata(a: Assessment | null | undefined): IntakeMetadata {
  if (!a || !a.intake_metadata) return {}
  return a.intake_metadata as IntakeMetadata
}
