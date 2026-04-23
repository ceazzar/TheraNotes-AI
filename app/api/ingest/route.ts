import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/ingest/parser'
import { chunkBySection } from '@/lib/ingest/chunker'
import { embedBatch } from '@/lib/ingest/embedder'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await parseDocument(buffer, file.name)
  const chunks = chunkBySection(text)
  if (chunks.length === 0) return NextResponse.json({ error: 'No content found' }, { status: 400 })

  const embeddings = await embedBatch(chunks.map(c => c.content))
  const rows = chunks.map((chunk, i) => ({
    user_id: user.id,
    content: chunk.content,
    section: chunk.section,
    source_file: file.name,
    embedding: `[${embeddings[i].join(',')}]`,
  }))

  const { error } = await supabase.from('exemplar_chunks').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const storagePath = `${user.id}/${file.name}`
  await supabase.storage.from('exemplars').upload(storagePath, buffer, {
    contentType: file.type, upsert: true,
  })

  return NextResponse.json({ chunksCreated: chunks.length, fileName: file.name })
}
