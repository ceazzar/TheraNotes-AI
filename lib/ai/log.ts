import { createClient } from '@/lib/supabase/server'

export interface GenerationLogEntry {
  userId: string
  reportId?: string
  assessmentId?: string
  sectionId: string
  operation: 'generate' | 'revise' | 'coherence' | 'refine'
  systemPrompt: string
  userPrompt: string
  clinicalNotes?: string
  ragChunks?: { content: string; score?: number; source?: string }[]
  model: string
  temperature?: number
  rawOutput?: string
  processedOutput?: string
  insufficientData?: boolean
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  latencyMs?: number
  status: 'success' | 'error'
  errorMessage?: string
}

export async function logGeneration(entry: GenerationLogEntry): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('generation_logs').insert({
      user_id: entry.userId,
      report_id: entry.reportId || null,
      assessment_id: entry.assessmentId || null,
      section_id: entry.sectionId,
      operation: entry.operation,
      system_prompt: entry.systemPrompt,
      user_prompt: entry.userPrompt,
      clinical_notes: entry.clinicalNotes || null,
      rag_chunks: entry.ragChunks || [],
      model: entry.model,
      temperature: entry.temperature ?? null,
      raw_output: entry.rawOutput || null,
      processed_output: entry.processedOutput || null,
      insufficient_data: entry.insufficientData ?? false,
      prompt_tokens: entry.promptTokens ?? null,
      completion_tokens: entry.completionTokens ?? null,
      total_tokens: entry.totalTokens ?? null,
      latency_ms: entry.latencyMs ?? null,
      status: entry.status,
      error_message: entry.errorMessage || null,
    })
  } catch {
    // Logging should never break the generation flow
    console.error('[generation-log] Failed to write audit log')
  }
}
