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

  const foundationalQuery = supabase.rpc('match_exemplar_chunks', {
    query_embedding: embeddingStr,
    match_count: foundationalLimit,
    filter_user_id: null,
    filter_section: sectionFilter ?? null,
  })

  const userQuery = supabase.rpc('match_exemplar_chunks', {
    query_embedding: embeddingStr,
    match_count: userLimit,
    filter_user_id: userId,
    filter_section: sectionFilter ?? null,
  })

  const [foundationalResult, userResult] = await Promise.all([
    foundationalQuery,
    userQuery,
  ])

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
