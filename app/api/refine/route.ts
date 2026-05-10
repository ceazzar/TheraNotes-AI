import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { logGeneration } from '@/lib/ai/log'

export const maxDuration = 60

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { selectedText, instruction, sectionContext, reportId } = await request.json()

  if (!selectedText || !instruction) {
    return new Response('Missing selectedText or instruction', { status: 400 })
  }

  const systemPrompt = `You are a clinical writing expert specialising in NDIS Functional Capacity Assessments (FCAs) for Australian allied health professionals.

Your task is to refine the selected text according to the user's instruction. Return ONLY the refined text — no explanations, no preamble, no markdown code fences.

Guidelines:
- Maintain clinical, professional tone appropriate for NDIS planners
- Use strengths-based language where possible
- Be specific about functional impacts rather than vague descriptors
- Preserve factual accuracy — do not invent clinical details
- Match the surrounding document's voice and style`

  const userPrompt = `${sectionContext ? `Context:\n${sectionContext}\n\n` : ''}Selected text:\n"${selectedText}"\n\nInstruction: ${instruction}`
  const startTime = Date.now()
  const refineModel = process.env.GENERATION_MODEL || 'gpt-5.5'
  // Refine acts on short selections; medium effort balances latency vs quality.
  const refineEffort = (process.env.REFINE_REASONING_EFFORT as 'low' | 'medium' | 'high') || 'medium'

  const sdkStream = await getOpenAI().responses.create({
    model: refineModel,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    reasoning: { effort: refineEffort },
    stream: true,
  })

  // Re-emit only output-text deltas to the client; collect usage at completion for logging.
  const encoder = new TextEncoder()
  let fullText = ''
  let inputTokens: number | undefined
  let outputTokens: number | undefined

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of sdkStream) {
          if (event.type === 'response.output_text.delta') {
            fullText += event.delta
            controller.enqueue(encoder.encode(event.delta))
          } else if (event.type === 'response.completed') {
            inputTokens = event.response.usage?.input_tokens
            outputTokens = event.response.usage?.output_tokens
          }
        }
      } catch (err) {
        controller.error(err)
        return
      } finally {
        controller.close()
        await logGeneration({
          userId: user.id,
          reportId: reportId || undefined,
          sectionId: 'inline_refine',
          operation: 'refine',
          systemPrompt,
          userPrompt,
          model: refineModel,
          rawOutput: fullText,
          processedOutput: fullText,
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
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
