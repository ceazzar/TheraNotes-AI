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
      const deserialized = tempEditor.api.markdown.deserialize(section.content)
      nodes.push(...deserialized)
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
