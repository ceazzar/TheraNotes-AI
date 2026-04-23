import template from '@/lib/template.json'

export interface Chunk {
  content: string
  section: string | null
}

export function chunkBySection(text: string): Chunk[] {
  const sectionNames = template.sections.map((s: { name: string }) => s.name)
  const chunks: Chunk[] = []
  const lines = text.split('\n')
  let currentSection: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    const matchedSection = sectionNames.find(name =>
      line.toLowerCase().includes(name.toLowerCase())
    )
    if (matchedSection && currentLines.length > 0) {
      const content = currentLines.join('\n').trim()
      if (content.length > 50) chunks.push({ content, section: currentSection })
      currentLines = []
    }
    if (matchedSection) currentSection = matchedSection
    currentLines.push(line)
  }
  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim()
    if (content.length > 50) chunks.push({ content, section: currentSection })
  }
  return chunks
}
