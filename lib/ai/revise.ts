import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import {
  buildRevisionRoutingPrompt,
  buildSectionRevisionPrompt,
} from '@/lib/ai/prompts'
import { logGeneration } from '@/lib/ai/log'
import template from '@/lib/template.json'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function routeFeedbackToSections(
  userFeedback: string
): Promise<{ sections: string[]; clarificationNeeded?: string }> {
  const sectionNames = template.sections.map(
    (s: { name: string }) => s.name
  )

  const prompt = buildRevisionRoutingPrompt(sectionNames, userFeedback)

  const response = await getOpenAI().chat.completions.create({
    model: process.env.GENERATION_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0,
  })

  let raw = response.choices[0].message.content ?? '{}'
  if (raw.includes('```')) {
    raw = raw.includes('```json')
      ? raw.split('```json').pop()!.split('```')[0]
      : raw.split('```')[1].split('```')[0]
  }

  const parsed = JSON.parse(raw)
  return {
    sections: parsed.sections ?? [],
    clarificationNeeded: parsed.clarification_needed,
  }
}

export interface ReviseSectionParams {
  sectionId: string
  sectionName: string
  currentContent: string
  feedback: string
  fullReportContext: string
  userId: string
  reportId?: string
  clinicalNotes: string
}

export interface ReviseSectionResult {
  sectionId: string
  revisedContent: string
}

export async function reviseSection(
  params: ReviseSectionParams
): Promise<ReviseSectionResult> {
  const {
    sectionId, sectionName, currentContent,
    feedback, fullReportContext, userId, clinicalNotes,
  } = params
  const clinicalContext = fullReportContext
    ? `${clinicalNotes}\n\nFULL REPORT CONTEXT:\n${fullReportContext}`.trim()
    : clinicalNotes

  const sectionTemplate = template.sections.find(
    (s: { name: string }) => s.name === sectionName
  )

  const ragResults = await queryRag({
    queryText: `${sectionName}: ${feedback}`,
    userId,
    sectionFilter: sectionName,
  })

  const allExemplars = [
    ...ragResults.foundational.map(c => c.content),
    ...ragResults.userStyle.map(c => c.content),
  ]

  const prompt = buildSectionRevisionPrompt(
    sectionName,
    sectionTemplate?.description ?? '',
    sectionTemplate?.typical_length ?? '2-3 paragraphs',
    allExemplars,
    clinicalContext,
    undefined,
    currentContent,
    feedback,
  )

  const model = process.env.GENERATION_MODEL || 'gpt-4o'
  const startTime = Date.now()

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.3,
  })

  const revisedContent = response.choices[0].message.content ?? ''

  await logGeneration({
    userId,
    reportId: params.reportId,
    sectionId: sectionName,
    operation: 'revise',
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    clinicalNotes: clinicalNotes.slice(0, 2000),
    ragChunks: ragResults.foundational.concat(ragResults.userStyle).map(c => ({
      content: c.content.slice(0, 500),
      score: c.similarity,
      source: c.sourceFile ?? undefined,
    })),
    model,
    temperature: 0.3,
    rawOutput: revisedContent,
    processedOutput: revisedContent,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
    latencyMs: Date.now() - startTime,
    status: 'success',
  })

  return {
    sectionId,
    revisedContent,
  }
}
