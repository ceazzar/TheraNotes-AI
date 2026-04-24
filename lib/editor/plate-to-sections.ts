import type { Descendant } from 'platejs'

type Sections = Record<string, { title: string; content: string }>

function getNodeText(node: Descendant): string {
  if ('text' in node) return node.text as string
  if ('children' in node) {
    return (node.children as Descendant[]).map(getNodeText).join('')
  }
  return ''
}

export function plateToSections(
  value: Descendant[],
  sectionKeys: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any
): Sections {
  const sections: Sections = {}
  let currentTitle = ''
  let currentNodes: Descendant[] = []
  let sectionIndex = 0

  function flushSection() {
    if (!currentTitle && currentNodes.length === 0) return

    const key = sectionKeys[sectionIndex] ?? currentTitle
    const content = editor.api.markdown.serialize({ value: currentNodes })

    sections[key] = { title: currentTitle, content }
    sectionIndex++
    currentTitle = ''
    currentNodes = []
  }

  for (const node of value) {
    const type = (node as { type?: string }).type
    if (type === 'h2') {
      flushSection()
      currentTitle = getNodeText(node)
    } else {
      currentNodes.push(node)
    }
  }

  flushSection()

  return sections
}
