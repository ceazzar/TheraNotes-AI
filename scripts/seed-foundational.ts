import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function main() {
  const exemplarsDir = process.argv[2]
  if (!exemplarsDir) {
    console.error('Usage: npx tsx scripts/seed-foundational.ts /path/to/fca-agent/exemplars')
    process.exit(1)
  }

  const files = readdirSync(exemplarsDir).filter(f => f.endsWith('.md'))
  console.log(`Found ${files.length} exemplar files`)

  for (const file of files) {
    const content = readFileSync(join(exemplarsDir, file), 'utf-8')
    const chunks = chunkByHeadings(content)
    console.log(`  ${file}: ${chunks.length} chunks`)

    if (chunks.length === 0) continue

    const embeddings = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      dimensions: 1536,
      input: chunks.map(c => c.content),
    })

    const rows = chunks.map((chunk, i) => ({
      user_id: null,
      content: chunk.content,
      section: chunk.section,
      source_file: file,
      embedding: `[${embeddings.data[i].embedding.join(',')}]`,
    }))

    const { error } = await supabase.from('exemplar_chunks').insert(rows)
    if (error) console.error(`  Error inserting ${file}:`, error.message)
  }

  const { count } = await supabase
    .from('exemplar_chunks')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null)

  console.log(`\nDone. ${count} foundational chunks in database.`)
}

function chunkByHeadings(text: string): { content: string; section: string | null }[] {
  const chunks: { content: string; section: string | null }[] = []
  const lines = text.split('\n')
  let currentSection: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch && currentLines.length > 0) {
      const content = currentLines.join('\n').trim()
      if (content.length > 50) chunks.push({ content, section: currentSection })
      currentLines = []
    }
    if (headingMatch) currentSection = headingMatch[1].trim()
    currentLines.push(line)
  }

  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim()
    if (content.length > 50) chunks.push({ content, section: currentSection })
  }

  return chunks
}

main().catch(console.error)
