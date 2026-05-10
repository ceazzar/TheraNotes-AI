import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import {
  buildSectionGenerationPrompt,
  buildSummaryGenerationPrompt,
  buildCoherencePrompt,
} from '@/lib/ai/prompts'
import { getDomainDataForSection, type Assessment } from '@/lib/ai/domain-mapper'
import type { ClinicianProfile } from '@/lib/profile'
import {
  getAvailableIntake,
  missingFromRequires,
  readIntakeMetadata,
  type IntakeBucket,
} from '@/lib/ai/intake'
import { buildHeaderTable } from '@/lib/ai/header'
import { logGeneration } from '@/lib/ai/log'
import template from '@/lib/template.json'

export type { Assessment } from '@/lib/ai/domain-mapper'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

interface SectionTemplate {
  name: string
  order: number
  phase: string
  description: string
  expected_inputs: string[]
  /** Intake buckets that must be present before this section can be generated. */
  requires?: string[]
  /** Intake buckets used if available but not required. */
  references?: string[]
  typical_length: string
  auto_generate?: boolean
}

export interface GenerateSectionParams {
  sectionId: string
  /** @deprecated Use `assessment` instead for structured domain data. */
  clinicalNotes?: string
  /** Structured assessment object — when provided, domain data is extracted automatically. */
  assessment?: Assessment
  /** Clinician profile (display name, credentials, AHPRA, clinic). Falls back into Header
   *  fields when per-report intake omits them. */
  profile?: ClinicianProfile | null
  userId: string
  reportId?: string
  assessmentId?: string
  previousSections: Record<string, string>
  questionnaireData?: string
  /** Past correction patterns to include in the prompt context for the assessment path. */
  correctionContext?: string
}

export interface GenerateSectionResult {
  sectionId: string
  title: string
  content: string
  insufficientData: boolean
  /**
   * 'pending' = required intake missing, no LLM call made, no tokens spent.
   * 'ready'   = section was generated.
   */
  status: 'ready' | 'pending'
  /** Buckets that were missing when status === 'pending'. */
  missing?: IntakeBucket[]
}

export async function generateSection(
  params: GenerateSectionParams
): Promise<GenerateSectionResult> {
  const { sectionId, clinicalNotes: rawNotes, assessment, userId, previousSections, questionnaireData, correctionContext } = params

  // Resolve clinical notes: prefer structured assessment domain data, fall back to raw notes
  const sectionTemplate = (template.sections as SectionTemplate[]).find(
    s => s.name === sectionId || s.order.toString() === sectionId
  )
  if (!sectionTemplate) {
    throw new Error(`Section "${sectionId}" not found in template`)
  }

  // ---------------------------------------------------------------------------
  // Skip-pending gate: check intake against `requires` BEFORE any LLM work.
  // If a required bucket is missing, return a pending stub with no token spend.
  // The frontend renders these as placeholder cards with "Add data" CTAs.
  // ---------------------------------------------------------------------------
  const requires = sectionTemplate.requires ?? []
  if (requires.length > 0) {
    const available = getAvailableIntake(assessment, {
      hasReportSoFar: Object.keys(previousSections).length > 0,
    })
    const missing = missingFromRequires(requires, available)
    if (missing.length > 0) {
      return {
        sectionId: sectionTemplate.name,
        title: sectionTemplate.name,
        content: '',
        insufficientData: false,
        status: 'pending',
        missing,
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Header section: deterministic transcription from structured intake.
  // No LLM call, no reasoning latency, no token spend. The Header is pure data.
  // ---------------------------------------------------------------------------
  if (sectionTemplate.name === 'Report Header / Participant Details' && assessment) {
    const headerContent = buildHeaderTable(assessment, params.profile)
    await logGeneration({
      userId,
      reportId: params.reportId,
      assessmentId: params.assessmentId,
      sectionId: sectionTemplate.name,
      operation: 'generate',
      systemPrompt: '[deterministic header builder — no LLM call]',
      userPrompt: '[structured intake → markdown table]',
      model: 'deterministic',
      rawOutput: headerContent,
      processedOutput: headerContent,
      insufficientData: headerContent.includes('[INSUFFICIENT DATA'),
      latencyMs: 0,
      status: 'success',
    })
    return {
      sectionId: sectionTemplate.name,
      title: sectionTemplate.name,
      content: headerContent,
      insufficientData: headerContent.includes('[INSUFFICIENT DATA'),
      status: 'ready',
    }
  }

  let clinicalNotes = assessment
    ? getDomainDataForSection(sectionTemplate.name, assessment)
    : (rawNotes ?? '')

  // Append correction context if available (assessment path passes it separately)
  if (correctionContext) {
    clinicalNotes += correctionContext
  }

  // ---------------------------------------------------------------------------
  // Inject structured intake into the prompt when the section needs it.
  // Part D consumes standardized_scores; Part E quotes ndis_goals verbatim.
  // We piggyback on the existing questionnaireData prompt slot rather than
  // adding new parameters across every call site.
  // ---------------------------------------------------------------------------
  let effectiveQuestionnaireData = questionnaireData
  if (assessment) {
    const sectionExpects = sectionTemplate.expected_inputs ?? []
    const augmentations: string[] = []

    if (
      sectionExpects.includes('standardized_scores') &&
      assessment.standardized_scores &&
      Object.keys(assessment.standardized_scores).length > 0
    ) {
      augmentations.push(
        `STANDARDISED ASSESSMENT SCORES (cite these directly):\n${JSON.stringify(
          assessment.standardized_scores,
          null,
          2,
        )}`,
      )
    }

    if (
      sectionExpects.includes('ndis_goals') &&
      Array.isArray(assessment.ndis_goals) &&
      assessment.ndis_goals.length > 0
    ) {
      const quoted = assessment.ndis_goals
        .map((g, i) => `${i + 1}. "${g}"`)
        .join('\n')
      augmentations.push(
        `PARTICIPANT-STATED NDIS GOALS (quote VERBATIM under "## NDIS Goals" — do not paraphrase or infer):\n${quoted}`,
      )
    }

    if (augmentations.length > 0) {
      effectiveQuestionnaireData = [
        questionnaireData ?? '',
        ...augmentations,
      ]
        .filter(Boolean)
        .join('\n\n')
    }
  }

  const ragResults = await queryRag({
    queryText: `${sectionTemplate.name}: ${clinicalNotes.slice(0, 500)}`,
    userId,
    sectionFilter: sectionTemplate.name,
  })

  const allExemplars = [
    ...ragResults.foundational.map(c => c.content),
    ...ragResults.userStyle.map(c => c.content),
  ]

  // Use summary prompt for Part E (needs full report context)
  const needsReportContext =
    sectionTemplate.expected_inputs?.includes('report_so_far') ||
    sectionTemplate.phase === 'summary'

  let prompt: { system: string; user: string }

  if (needsReportContext && Object.keys(previousSections).length > 0) {
    const reportSoFar = Object.entries(previousSections)
      .map(([name, content]) => `## ${name}\n\n${content}`)
      .join('\n\n')

    prompt = buildSummaryGenerationPrompt(
      sectionTemplate.name,
      sectionTemplate.description,
      sectionTemplate.typical_length,
      allExemplars,
      clinicalNotes,
      effectiveQuestionnaireData,
      reportSoFar,
    )
  } else {
    prompt = buildSectionGenerationPrompt(
      sectionTemplate.name,
      sectionTemplate.description,
      sectionTemplate.typical_length,
      allExemplars,
      clinicalNotes,
      effectiveQuestionnaireData,
    )
  }

  const model = process.env.GENERATION_MODEL || 'gpt-5.5'
  const reasoningEffort = (process.env.REASONING_EFFORT as 'low' | 'medium' | 'high' | 'xhigh') || 'high'
  const startTime = Date.now()

  let response: OpenAI.Responses.Response
  try {
    response = await getOpenAI().responses.create({
      model,
      input: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      reasoning: { effort: reasoningEffort },
    })
  } catch (err) {
    await logGeneration({
      userId,
      reportId: params.reportId,
      assessmentId: params.assessmentId,
      sectionId: sectionTemplate.name,
      operation: 'generate',
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      clinicalNotes: clinicalNotes.slice(0, 2000),
      ragChunks: ragResults.foundational.concat(ragResults.userStyle).map(c => ({
        content: c.content.slice(0, 500),
        score: c.similarity,
        source: c.sourceFile ?? undefined,
      })),
      model,
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startTime,
    })
    throw err
  }

  const latencyMs = Date.now() - startTime
  const content = response.output_text ?? ''
  const insufficientData = content.includes('[INSUFFICIENT DATA')
  const processedContent = stripDuplicateHeading(content, sectionTemplate.name)
  const inputTokens = response.usage?.input_tokens
  const outputTokens = response.usage?.output_tokens
  const totalTokens =
    inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : response.usage?.total_tokens

  await logGeneration({
    userId,
    reportId: params.reportId,
    assessmentId: params.assessmentId,
    sectionId: sectionTemplate.name,
    operation: 'generate',
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    clinicalNotes: clinicalNotes.slice(0, 2000),
    ragChunks: ragResults.foundational.concat(ragResults.userStyle).map(c => ({
      content: c.content.slice(0, 500),
      score: c.similarity,
      source: c.sourceFile ?? undefined,
    })),
    model,
    rawOutput: content,
    processedOutput: processedContent,
    insufficientData,
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens,
    latencyMs,
    status: 'success',
  })

  return {
    sectionId: sectionTemplate.name,
    title: sectionTemplate.name,
    content: processedContent,
    insufficientData,
    status: 'ready',
  }
}

export async function runCoherenceCheck(params: {
  fullReport: string
  clinicalNotes: string
  userId?: string
  reportId?: string
}): Promise<string> {
  const prompt = buildCoherencePrompt(params.fullReport)
  const model = process.env.GENERATION_MODEL || 'gpt-5.5'
  const reasoningEffort = (process.env.REASONING_EFFORT as 'low' | 'medium' | 'high' | 'xhigh') || 'high'
  const startTime = Date.now()

  const response = await getOpenAI().responses.create({
    model,
    input: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    reasoning: { effort: reasoningEffort },
  })

  const content = response.output_text ?? ''
  const inputTokens = response.usage?.input_tokens
  const outputTokens = response.usage?.output_tokens

  if (params.userId) {
    await logGeneration({
      userId: params.userId,
      reportId: params.reportId,
      sectionId: 'coherence_check',
      operation: 'coherence',
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      model,
      rawOutput: content,
      processedOutput: content,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens:
        inputTokens !== undefined && outputTokens !== undefined
          ? inputTokens + outputTokens
          : undefined,
      latencyMs: Date.now() - startTime,
      status: 'success',
    })
  }

  return content
}

function stripDuplicateHeading(content: string, sectionName: string): string {
  const trimmed = content.trim()
  const lines = trimmed.split('\n')
  if (!lines.length) return trimmed

  const firstLine = lines[0].trim()
  const headingText = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
  const nameNorm = sectionName.toLowerCase().replace(/:/g, '').replace(/\s+/g, ' ').trim()
  const headNorm = headingText.toLowerCase().replace(/:/g, '').replace(/\s+/g, ' ').trim()

  if (headNorm === nameNorm) {
    return lines.slice(1).join('\n').trim()
  }
  return trimmed
}
