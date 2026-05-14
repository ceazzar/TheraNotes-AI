export interface ParsedAssessmentBundle {
  scores: Record<string, unknown>
  detectedTools: string[]
  summaries: string[]
}

interface ParseInput {
  filename: string
  text: string
}

const WHODAS_ROWS = [
  ['overall_disability', 'Overall Disability'],
  ['cognition', 'Cognition'],
  ['mobility', 'Mobility'],
  ['self_care', 'Self-Care'],
  ['getting_along', 'Getting Along'],
  ['life_activities', 'Life Activities'],
  ['participation', 'Participation'],
] as const

const SENSORY_ROWS = [
  ['low_registration', 'Low Registration'],
  ['sensation_seeking', 'Sensation Seeking'],
  ['sensory_sensitivity', 'Sensory Sensitivity'],
  ['sensation_avoiding', 'Sensation Avoiding'],
] as const

function asNumber(value: string): number {
  return Number(value)
}

function cleanLine(value: string | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned || null
}

function cleanClassification(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\bthan\b/i, 'Than')
    .trim()
}

function compactSourceContext(text: string): string {
  return text
    .replace(/\f/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function matchLine(text: string, pattern: RegExp): string | null {
  return cleanLine(text.match(pattern)?.[1])
}

function findWhodasScoreLine(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(
    new RegExp(
      `${escaped}\\s+(\\d+(?:\\.\\d+)?)\\s+([<>]?\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)\\s+([A-Za-z]+)`,
      'i',
    ),
  )

  if (!match) return null
  return {
    score_0_to_100: asNumber(match[1]),
    percentile: match[2],
    average_score_0_to_4: asNumber(match[3]),
    descriptor: match[4],
  }
}

function parseWhodas({ filename, text }: ParseInput): Record<string, unknown> | null {
  if (!/WHODAS/i.test(text)) return null

  const domains: Record<string, unknown> = {}
  for (const [key, label] of WHODAS_ROWS) {
    const score = findWhodasScoreLine(text, label)
    if (score) domains[key] = score
  }

  if (Object.keys(domains).length === 0) return null

  return {
    tool: 'WHODAS 2.0 - Self',
    source_file: filename,
    client_name: matchLine(text, /Client Name\s+(.+?)\s+Date administered/i),
    date_administered: matchLine(text, /Date administered\s+([^\n]+)/i),
    date_of_birth_age: matchLine(text, /Date of birth \(age\)\s+(.+?)\s+Time taken/i),
    time_taken: matchLine(text, /Time taken\s+([^\n]+)/i),
    assessor: matchLine(text, /Assessor\s+([^\n]+)/i),
    domains,
    source_context_text: compactSourceContext(text),
  }
}

function findSensoryQuadrantLine(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(
    new RegExp(
      `(?:\\d+\\.\\s*)?${escaped}\\s+(\\d+)\\/(\\d+)\\s+([0-9]+-[0-9]+)\\s+([^\\n]+)`,
      'i',
    ),
  )

  if (!match) return null
  return {
    raw_score: asNumber(match[1]),
    max_score: asNumber(match[2]),
    cut_score_range: match[3],
    classification: cleanClassification(match[4]),
  }
}

function parseSensoryProfile({ filename, text }: ParseInput): Record<string, unknown> | null {
  if (!/Adolescent\/Adult Sensory Profile|Sensory Profile/i.test(text)) return null

  const quadrants: Record<string, unknown> = {}
  for (const [key, label] of SENSORY_ROWS) {
    const quadrant = findSensoryQuadrantLine(text, label)
    if (quadrant) quadrants[key] = quadrant
  }

  if (Object.keys(quadrants).length === 0) return null

  return {
    tool: 'Adolescent/Adult Sensory Profile',
    source_file: filename,
    examinee_name: matchLine(text, /Examinee's Name:\s*([^\n]+)/i),
    birth_date: matchLine(text, /Birth Date:\s*([^\n]+)/i),
    administration_date: matchLine(text, /Administration Date:\s*([^\n]+)/i),
    age_at_administration: matchLine(text, /Age at Administration:\s*([^\n]+)/i),
    gender: matchLine(text, /Gender:\s*([^\n]+)/i),
    quadrants,
    source_context_text: compactSourceContext(text),
  }
}

function getDescriptor(score: Record<string, unknown>, key: string): string | null {
  const row = score[key] as Record<string, unknown> | undefined
  const descriptor = row?.descriptor
  return typeof descriptor === 'string' ? descriptor : null
}

function getClassification(score: Record<string, unknown>, key: string): string | null {
  const row = score[key] as Record<string, unknown> | undefined
  const classification = row?.classification
  return typeof classification === 'string' ? classification : null
}

export function parseStandardisedAssessmentText(input: ParseInput): ParsedAssessmentBundle {
  const scores: Record<string, unknown> = {}
  const detectedTools: string[] = []
  const summaries: string[] = []

  const whodas = parseWhodas(input)
  if (whodas) {
    scores.whodas = whodas
    detectedTools.push('WHODAS 2.0')
    const domains = whodas.domains as Record<string, unknown>
    summaries.push(
      `WHODAS 2.0: overall ${getDescriptor(domains, 'overall_disability') ?? 'detected'}, life activities ${getDescriptor(domains, 'life_activities') ?? 'detected'}.`,
    )
  }

  const sensoryProfile = parseSensoryProfile(input)
  if (sensoryProfile) {
    scores.sensory_profile = sensoryProfile
    detectedTools.push('Adolescent/Adult Sensory Profile')
    const quadrants = sensoryProfile.quadrants as Record<string, unknown>
    summaries.push(
      `Sensory Profile: Low Registration ${getClassification(quadrants, 'low_registration') ?? 'detected'}, Sensory Sensitivity ${getClassification(quadrants, 'sensory_sensitivity') ?? 'detected'}, Sensation Avoiding ${getClassification(quadrants, 'sensation_avoiding') ?? 'detected'}.`,
    )
  }

  return { scores, detectedTools, summaries }
}

export function mergeParsedAssessmentBundles(
  bundles: ParsedAssessmentBundle[],
): ParsedAssessmentBundle {
  return bundles.reduce<ParsedAssessmentBundle>(
    (acc, bundle) => ({
      scores: { ...acc.scores, ...bundle.scores },
      detectedTools: Array.from(new Set([...acc.detectedTools, ...bundle.detectedTools])),
      summaries: [...acc.summaries, ...bundle.summaries],
    }),
    { scores: {}, detectedTools: [], summaries: [] },
  )
}
