import { createPlateEditor } from 'platejs/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { BasicBlocksPlugin, BasicMarksPlugin } from '@platejs/basic-nodes/react'
import { ListPlugin } from '@platejs/list/react'
import { TablePlugin } from '@platejs/table/react'
import type { Descendant, Value } from 'platejs'
import templateData from '@/lib/template.json'

type SectionTemplate = { name: string; order: number; auto_generate?: boolean }
type Sections = Record<string, { title: string; content: string }>

const orderedSections = (templateData.sections as SectionTemplate[])
  .filter((s) => !s.auto_generate)
  .sort((a, b) => a.order - b.order)

function createDeserializer() {
  return createPlateEditor({
    plugins: [BasicBlocksPlugin, BasicMarksPlugin, ListPlugin, TablePlugin, MarkdownPlugin],
  })
}

function parseMarkdownTable(tableBlock: string): Descendant | null {
  const lines = tableBlock.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return null

  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())

  const isSeparator = (line: string): boolean =>
    /^\|?[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|?$/.test(line.trim())

  const rows: string[][] = []
  for (const line of lines) {
    if (isSeparator(line)) continue
    rows.push(parseRow(line))
  }

  if (rows.length === 0) return null

  return {
    type: 'table',
    children: rows.map((cells) => ({
      type: 'tr',
      children: cells.map((text) => ({
        type: 'td',
        children: [{ type: 'p', children: [{ text: text.replace(/\*\*/g, '').replace(/\\+(?=[\[\]])/g, '') }] }],
      })),
    })),
  } as Descendant
}

function splitContentAndTables(content: string): { type: 'md' | 'table'; text: string }[] {
  const lines = content.split('\n')
  const blocks: { type: 'md' | 'table'; text: string }[] = []
  let currentMd: string[] = []
  let currentTable: string[] = []
  let inTable = false

  const flushMd = () => {
    if (currentMd.length > 0) {
      blocks.push({ type: 'md', text: currentMd.join('\n') })
      currentMd = []
    }
  }

  const flushTable = () => {
    if (currentTable.length >= 2) {
      blocks.push({ type: 'table', text: currentTable.join('\n') })
    } else if (currentTable.length > 0) {
      currentMd.push(...currentTable)
    }
    currentTable = []
  }

  for (const line of lines) {
    const isTableLine = /^\s*\|/.test(line)
    if (isTableLine) {
      if (!inTable) {
        flushMd()
        inTable = true
      }
      currentTable.push(line)
    } else {
      if (inTable) {
        flushTable()
        inTable = false
      }
      currentMd.push(line)
    }
  }

  if (inTable) flushTable()
  flushMd()

  return blocks
}

export function reportToPlate(sections: Sections): {
  value: Value
  sectionKeys: string[]
} {
  const tempEditor = createDeserializer()
  const nodes: Descendant[] = []
  const sectionKeys: string[] = []

  for (const template of orderedSections) {
    const entry = Object.entries(sections).find(
      ([, sec]) => sec.title === template.name
    )

    const key = entry?.[0] ?? template.name
    const section = entry?.[1]
    sectionKeys.push(key)

    nodes.push({
      type: 'h2',
      children: [{ text: section?.title ?? template.name }],
    } as Descendant)

    if (section?.content) {
      const blocks = splitContentAndTables(section.content)

      for (const block of blocks) {
        if (block.type === 'table') {
          const tableNode = parseMarkdownTable(block.text)
          if (tableNode) {
            nodes.push(tableNode)
          } else {
            const fallback = tempEditor.api.markdown.deserialize(block.text)
            nodes.push(...fallback)
          }
        } else if (block.text.trim()) {
          const cleaned = block.text.replace(/\\+(?=[\[\]])/g, '')
          const deserialized = tempEditor.api.markdown.deserialize(cleaned)
            .filter((node: Descendant & { type?: string }) => {
              if (node.type === 'code_block') {
                const text = (node.children as Array<{ text?: string }>)
                  ?.map((c) => c.text ?? '')
                  .join('')
                return text.trim().length > 0
              }
              return true
            })
          nodes.push(...deserialized)
        }
      }
    } else {
      nodes.push({
        type: 'p',
        children: [{ text: '' }],
      } as Descendant)
    }
  }

  if (nodes.length === 0) {
    nodes.push({ type: 'p', children: [{ text: '' }] } as Descendant)
  }

  return { value: nodes as Value, sectionKeys }
}
