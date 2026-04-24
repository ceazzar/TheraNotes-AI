import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { selectedText, instruction, sectionContext } = await request.json()

  if (!selectedText || !instruction) {
    return new Response('Missing selectedText or instruction', { status: 400 })
  }

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are a clinical writing expert specialising in NDIS Functional Capacity Assessments (FCAs) for Australian allied health professionals.

Your task is to refine the selected text according to the user's instruction. Return ONLY the refined text — no explanations, no preamble, no markdown code fences.

Guidelines:
- Maintain clinical, professional tone appropriate for NDIS planners
- Use strengths-based language where possible
- Be specific about functional impacts rather than vague descriptors
- Preserve factual accuracy — do not invent clinical details
- Match the surrounding document's voice and style`,
    messages: [
      {
        role: 'user',
        content: `${sectionContext ? `Context:\n${sectionContext}\n\n` : ''}Selected text:\n"${selectedText}"\n\nInstruction: ${instruction}`,
      },
    ],
  })

  return result.toTextStreamResponse()
}
