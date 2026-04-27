import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import {
  buildSectionGenerationPrompt,
  buildSummaryGenerationPrompt,
  buildCoherencePrompt,
} from '@/lib/ai/prompts'
import { getDomainDataForSection, type Assessment } from '@/lib/ai/domain-mapper'
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
  typical_length: string
  auto_generate?: boolean
}

export interface GenerateSectionParams {
  sectionId: string
  /** @deprecated Use `assessment` instead for structured domain data. */
  clinicalNotes?: string
  /** Structured assessment object — when provided, domain data is extracted automatically. */
  assessment?: Assessment
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

  let clinicalNotes = assessment
    ? getDomainDataForSection(sectionTemplate.name, assessment)
    : (rawNotes ?? '')

  // Append correction context if available (assessment path passes it separately)
  if (correctionContext) {
    clinicalNotes += correctionContext
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
      questionnaireData,
      reportSoFar,
    )
  } else {
    prompt = buildSectionGenerationPrompt(
      sectionTemplate.name,
      sectionTemplate.description,
      sectionTemplate.typical_length,
      allExemplars,
      clinicalNotes,
      questionnaireData,
    )
  }

  const model = process.env.GENERATION_MODEL || 'gpt-4o'
  const temperature = 0.3
  const startTime = Date.now()

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature,
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
      temperature,
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startTime,
    })
    throw err
  }

  const latencyMs = Date.now() - startTime
  const content = response.choices[0].message.content ?? ''
  const insufficientData = content.includes('[INSUFFICIENT DATA')
  const processedContent = stripDuplicateHeading(content, sectionTemplate.name)

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
    temperature,
    rawOutput: content,
    processedOutput: processedContent,
    insufficientData,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
    latencyMs,
    status: 'success',
  })

  return {
    sectionId: sectionTemplate.name,
    title: sectionTemplate.name,
    content: processedContent,
    insufficientData,
  }
}

export async function runCoherenceCheck(params: {
  fullReport: string
  clinicalNotes: string
  userId?: string
  reportId?: string
}): Promise<string> {
  const prompt = buildCoherencePrompt(params.fullReport)
  const model = process.env.GENERATION_MODEL || 'gpt-4o'
  const startTime = Date.now()

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0,
  })

  const content = response.choices[0].message.content ?? ''

  if (params.userId) {
    await logGeneration({
      userId: params.userId,
      reportId: params.reportId,
      sectionId: 'coherence_check',
      operation: 'coherence',
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      model,
      temperature: 0,
      rawOutput: content,
      processedOutput: content,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
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
