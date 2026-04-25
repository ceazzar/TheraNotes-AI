import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import template from '@/lib/template.json'

export const maxDuration = 300

interface SectionTemplate {
  name: string
  order: number
  phase: string
  auto_generate?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, sessionId, reportId, activeSectionId } = await request.json()

  if (!reportId && !sessionId) {
    return new Response('reportId or sessionId is required', { status: 400 })
  }

  let reportQuery = supabase
    .from('reports')
    .select('id, session_id, sections, status')
    .eq('user_id', user.id)

  reportQuery = reportId
    ? reportQuery.eq('id', reportId)
    : reportQuery.eq('session_id', sessionId)

  const { data: report } = await reportQuery
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sectionList = template.sections
    .filter((s: SectionTemplate) => !s.auto_generate)
    .map((s: SectionTemplate) => `- ${s.name}`)
    .join('\n')

  const sections = (report?.sections ?? {}) as Record<string, { title: string; content: string }>
  const activeSection = activeSectionId ? sections[activeSectionId] : null
  const activeSectionPrompt = activeSection
    ? `\n\nFocused section: ${activeSection.title}\n\nCurrent focused section content:\n${activeSection.content}`
    : ''

  const contextPrompt = `${SYSTEM_PROMPT}\n\nAvailable report sections:\n${sectionList}\n\n${
    report
      ? `Current report status: ${report.status}. Sections completed: ${Object.keys(sections).length}/${template.sections.length}`
      : 'No report started yet for this session.'
  }${activeSectionPrompt}\n\nAnswer questions about the current report. If a clinician asks for changes, explain what should change and which section is affected; do not claim that the report was updated unless a revision endpoint has actually updated it.`

  const modelMessages = await convertToModelMessages(messages)

  const userId = user.id

  const result = streamText({
    model: openai('gpt-4o'),
    system: contextPrompt,
    messages: modelMessages,
    toolChoice: 'auto',
    tools: {
      record_correction: tool({
        description: 'Record a clinician correction for future learning. Call this after a section is revised to store what changed and why.',
        inputSchema: z.object({
          sectionId: z.string().describe('The section that was revised'),
          originalText: z.string().describe('The text before revision'),
          revisedText: z.string().describe('The text after revision'),
          feedback: z.string().describe('The clinician feedback that prompted the change'),
        }),
        execute: async ({ sectionId, originalText, revisedText, feedback }) => {
          const { error } = await supabase.from('corrections').insert({
            user_id: userId,
            section: sectionId,
            original_text: originalText,
            revised_text: revisedText,
            feedback,
            correction_type: 'revision',
          })
          if (error) {
            return { success: false, error: error.message }
          }
          return { success: true, message: `Correction recorded for section "${sectionId}". This will inform future report generation.` }
        },
      }),
      get_past_corrections: tool({
        description: 'Check if this clinician has been corrected on similar issues before.',
        inputSchema: z.object({
          section: z.string().describe('The section type to check'),
        }),
        execute: async ({ section }) => {
          const { data, error } = await supabase
            .from('corrections')
            .select('section, original_text, revised_text, feedback, correction_type, created_at')
            .eq('user_id', userId)
            .eq('section', section)
            .order('created_at', { ascending: false })
            .limit(5)
          if (error) {
            return { corrections: [], error: error.message }
          }
          return { corrections: data ?? [] }
        },
      }),
    },
    onFinish: async ({ text }) => {
      if (text) {
        const cleanText = text.replace('[GENERATE_REPORT]\n', '').trim()
        if (cleanText) {
          const messageSessionId = report?.session_id ?? sessionId
          if (messageSessionId) {
            await supabase.from('messages').insert({
              session_id: messageSessionId,
              role: 'assistant',
              content: cleanText,
            })
          }
        }
      }
    },
  })

  return result.toUIMessageStreamResponse({
    onError: () => 'Revision chat is unavailable.',
  })
}
