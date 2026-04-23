import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import {
  buildRevisionRoutingPrompt,
  buildSectionRevisionPrompt,
} from '@/lib/ai/prompts'
import template from '@/lib/template.json'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function routeFeedbackToSections(
  userFeedback: string
): Promise<{ sections: string[]; clarificationNeeded?: string }> {
  const sectionNames = template.sections.map(
    (s: { name: string }) => s.name
  )

  const prompt = buildRevisionRoutingPrompt(sectionNames, userFeedback)

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-pro',
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
    clinicalNotes,
    undefined,
    currentContent,
    feedback,
  )

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-pro',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.3,
  })

  return {
    sectionId,
    revisedContent: response.choices[0].message.content ?? '',
  }
}
