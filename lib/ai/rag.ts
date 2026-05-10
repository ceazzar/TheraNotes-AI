import { createServiceClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ingest/embedder'

export interface RagChunk {
  id: string
  content: string
  section: string | null
  sourceFile: string | null
  similarity: number
}

export async function queryRag(params: {
  queryText: string
  userId: string
  sectionFilter?: string
  foundationalLimit?: number
  userLimit?: number
}): Promise<{ foundational: RagChunk[]; userStyle: RagChunk[] }> {
  const {
    queryText,
    userId,
    sectionFilter,
    foundationalLimit = 5,
    userLimit = 3,
  } = params

  const embedding = await embedText(queryText)
  const supabase = await createServiceClient()
  const embeddingStr = `[${embedding.join(',')}]`

  const [foundationalResult, userResult] = await Promise.all([
    supabase.rpc('match_exemplar_chunks', {
      query_embedding: embeddingStr,
      match_count: foundationalLimit,
      filter_user_id: null,
      filter_section: sectionFilter ?? null,
    }),
    supabase.rpc('match_exemplar_chunks', {
      query_embedding: embeddingStr,
      match_count: userLimit,
      filter_user_id: userId,
      filter_section: sectionFilter ?? null,
    }),
  ])

  // Surface Supabase errors instead of silently returning zero exemplars.
  // A silent RAG failure means reports get generated with no exemplar context,
  // producing generic-sounding output and hiding broken infra from the dev.
  if (foundationalResult.error) {
    throw new Error(`RAG foundational query failed: ${foundationalResult.error.message}`)
  }
  if (userResult.error) {
    throw new Error(`RAG user-style query failed: ${userResult.error.message}`)
  }

  return {
    foundational: (foundationalResult.data ?? []).map(mapChunk),
    userStyle: (userResult.data ?? []).map(mapChunk),
  }
}

function mapChunk(row: Record<string, unknown>): RagChunk {
  return {
    id: row.id as string,
    content: row.content as string,
    section: row.section as string | null,
    sourceFile: row.source_file as string | null,
    similarity: row.similarity as number,
  }
}
