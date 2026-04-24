import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import {
  buildSectionGenerationPrompt,
  buildSummaryGenerationPrompt,
  buildCoherencePrompt,
} from '@/lib/ai/prompts'
import { getDomainDataForSection, type Assessment } from '@/lib/ai/domain-mapper'
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

  const response = await getOpenAI().chat.completions.create({
    model: process.env.GENERATION_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.3,
  })

  const content = response.choices[0].message.content ?? ''
  const insufficientData = content.includes('[INSUFFICIENT DATA')

  return {
    sectionId: sectionTemplate.name,
    title: sectionTemplate.name,
    content: stripDuplicateHeading(content, sectionTemplate.name),
    insufficientData,
  }
}

export async function runCoherenceCheck(params: {
  fullReport: string
  clinicalNotes: string
}): Promise<string> {
  const prompt = buildCoherencePrompt(params.fullReport)

  const response = await getOpenAI().chat.completions.create({
    model: process.env.GENERATION_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0,
  })

  return response.choices[0].message.content ?? ''
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
