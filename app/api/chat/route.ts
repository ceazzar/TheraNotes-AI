import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages } from 'ai'
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

  const { messages, sessionId } = await request.json()

  const { data: report } = await supabase
    .from('reports')
    .select('id, sections, status')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sectionList = template.sections
    .filter((s: SectionTemplate) => !s.auto_generate)
    .map((s: SectionTemplate) => `- ${s.name}`)
    .join('\n')

  const contextPrompt = `${SYSTEM_PROMPT}\n\nAvailable report sections:\n${sectionList}\n\n${
    report
      ? `Current report status: ${report.status}. Sections completed: ${Object.keys(report.sections as object).length}/${template.sections.length}`
      : 'No report started yet for this session.'
  }\n\nWhen the user provides clinical notes and asks to generate a report, acknowledge their request and let them know the report is being generated. The system will handle the actual generation automatically.`

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai('gpt-4o'),
    system: contextPrompt,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      if (text) {
        const cleanText = text.replace('[GENERATE_REPORT]\n', '').trim()
        if (cleanText) {
          await supabase.from('messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: cleanText,
          })
        }
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
