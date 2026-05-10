/**
 * Deterministic Header section builder.
 *
 * The Report Header is pure transcription — no clinical reasoning, no narrative,
 * no inference. Every cell is either a direct copy of an intake field or an
 * [INSUFFICIENT DATA] marker. There's no reason to spend tokens (or reasoning
 * latency) on it; we emit the markdown table directly from structured data.
 *
 * Returns the same shape as an LLM-generated section so the rest of the
 * pipeline (logging, storage, rendering) doesn't need to special-case it.
 */

import type { Assessment } from '@/lib/ai/domain-mapper'
import type { ClinicianProfile } from '@/lib/profile'
import { readIntakeMetadata } from '@/lib/ai/intake'

const INSUF = (what: string) => `[INSUFFICIENT DATA: ${what}]`

/**
 * Markdown-table cell content frequently contains pipes (`|`) that would
 * break the table parser, and we want INSUF markers preserved literally.
 * Escape any user-supplied pipes; everything else passes through.
 */
function safeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

/**
 * Pick the first non-empty value from a list of candidates. Used to fall
 * back from per-report intake → clinician profile defaults → INSUF marker.
 * Empty strings are treated as missing.
 */
function firstFilled(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    if (c && c.trim().length > 0) return c.trim()
  }
  return null
}

export function buildHeaderTable(
  assessment: Assessment,
  profile?: ClinicianProfile | null,
): string {
  const meta = readIntakeMetadata(assessment)
  const client = meta.client ?? {}
  const assessor = meta.assessor ?? {}
  const session = meta.assessment ?? {}

  // Plan dates are tightly coupled — only render the range if both ends exist.
  const planDates =
    client.plan_start && client.plan_end
      ? `${client.plan_start} – ${client.plan_end}`
      : INSUF('NDIS plan dates not provided')

  // NOK can be name+phone, phone-only, or absent.
  const nokParts: string[] = []
  if (client.nok_name) nokParts.push(client.nok_name)
  if (client.nok_phone) nokParts.push(`(${client.nok_phone})`)
  const nok = nokParts.length > 0
    ? nokParts.join(' ')
    : INSUF('primary contact / next of kin not provided')

  // Per-report intake takes precedence; clinician profile fills the gaps.
  const assessorName = firstFilled(assessment.assessor_name, profile?.display_name)
    ?? INSUF('assessor name not provided')
  const assessorCreds = firstFilled(assessment.assessor_credentials, profile?.credentials)
  const credentialsLine = profile?.ahpra_registration
    ? `${assessorCreds ?? 'Clinician'} (AHPRA: ${profile.ahpra_registration})`
    : (assessorCreds ?? INSUF('assessor credentials not provided'))
  const assessorContact = firstFilled(assessor.email, profile?.contact_email)
    ?? INSUF('assessor contact details not provided')
  const provider = firstFilled(assessor.company, profile?.clinic_name)
    ?? INSUF('provider/company name not provided')
  // Report date defaults to today when neither intake nor profile provides one
  // — that's a sensible default for "when was this report written" and avoids
  // a near-universal INSUF marker on every report.
  const reportDate = firstFilled(session.report_date)
    ?? new Date().toISOString().slice(0, 10)

  const rows: Array<[string, string]> = [
    ['Report Title', 'Functional Capacity Assessment Report'],
    ['Participant Full Name', assessment.participant_name ?? INSUF('participant name not provided')],
    ['NDIS Number', assessment.ndis_number ?? INSUF('NDIS number not provided')],
    ['NDIS Plan Dates', planDates],
    ['Date of Birth', assessment.participant_dob ?? INSUF('date of birth not provided')],
    ['Address', client.address ?? INSUF('participant address not provided')],
    ['Primary Contact / Next of Kin', nok],
    ['Assessor / Clinician', assessorName],
    ['Assessor Credentials', credentialsLine],
    ['Assessor Contact', assessorContact],
    ['Provider / Company', provider],
    ['Report Date', reportDate],
  ]

  const tableRows = rows
    .map(([k, v]) => `| ${safeCell(k)} | ${safeCell(v)} |`)
    .join('\n')

  return `| Field | Details |\n|---|---|\n${tableRows}`
}
