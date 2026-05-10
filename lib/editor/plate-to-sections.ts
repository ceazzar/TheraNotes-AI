import type { Descendant } from 'platejs'

type Sections = Record<string, { title: string; content: string }>

interface ElementNode {
  type?: string
  children: Descendant[]
}

function getNodeText(node: Descendant): string {
  if ('text' in node) return node.text as string
  if ('children' in node) {
    return (node.children as Descendant[]).map(getNodeText).join('')
  }
  return ''
}

/**
 * Convert a Plate table node tree (`table` -> `tr` -> `td`/`th` -> inline)
 * back into a GitHub-flavoured markdown table string.
 *
 * Why this exists: round-1 added Plate components for `table`/`tr`/`td` so the
 * editor would render markdown tables correctly. The display path works, but
 * the serializer path (`editor.api.markdown.serialize`) has no handler for
 * these node types and silently produces garbage / unhandled rejection. That
 * broke DOCX export from the workspace for any report containing the
 * deterministic Header table — REGRESSION FROM ROUND 1, caught by the
 * clinician walk-through in round 2.
 *
 * Verified by: lib/editor/plate-to-sections.ts:28 calls serialize on a tree
 * that round-1's lib/editor/plugins.ts populates with table nodes.
 */
function tableNodeToMarkdown(node: ElementNode): string {
  // Cast through unknown so we can apply our own structural type without
  // fighting Plate's discriminated TText/Element union — every node we touch
  // here is one we constructed ourselves in lib/ai/header.ts and parsed via
  // lib/editor/report-to-plate.ts.
  const rows = ((node.children ?? []) as unknown as ElementNode[]).filter(
    (n) => typeof n === 'object' && n !== null && n.type === 'tr',
  )
  if (rows.length === 0) return ''

  const rowToCells = (row: ElementNode): string[] =>
    ((row.children ?? []) as unknown as ElementNode[])
      .filter((c) => c.type === 'td' || c.type === 'th')
      .map((c) => {
        const cellChildren = (c.children ?? []) as Descendant[]
        const text = cellChildren.map((d) => getNodeText(d)).join('').trim()
        // Escape pipes inside cells so the table parser on the read side
        // doesn't split a single cell into two columns.
        return text.replace(/\|/g, '\\|').replace(/\n+/g, ' ')
      })

  const cellRows = rows.map(rowToCells)
  const colCount = Math.max(...cellRows.map((r) => r.length), 1)
  // Pad short rows so columns line up.
  const padded = cellRows.map((r) => {
    const out = [...r]
    while (out.length < colCount) out.push('')
    return out
  })

  const [header, ...body] = padded
  const headerLine = `| ${header.join(' | ')} |`
  const separatorLine = `| ${header.map(() => '---').join(' | ')} |`
  const bodyLines = body.map((r) => `| ${r.join(' | ')} |`)
  return [headerLine, separatorLine, ...bodyLines].join('\n')
}

/**
 * Pre-process a Plate value tree so the markdown serializer never sees a
 * `table`/`tr`/`td` node. Tables are converted to a single `paragraph` node
 * whose text content is the GFM table string — the serializer emits that
 * verbatim, and downstream parsers (DOCX exporter, report viewer) understand
 * markdown tables natively.
 */
function preprocessForMarkdown(nodes: Descendant[]): Descendant[] {
  const out: Descendant[] = []
  for (const node of nodes) {
    const type = (node as ElementNode).type
    if (type === 'table') {
      const md = tableNodeToMarkdown(node as ElementNode)
      if (md) {
        // Wrap as a paragraph so the serializer treats it as a block.
        out.push({
          type: 'p',
          children: [{ text: md }],
        } as unknown as Descendant)
      }
    } else if ('children' in node && Array.isArray((node as ElementNode).children)) {
      // Recurse into other element children (lists, blockquotes, etc.) in case
      // a table is nested. Today none of our prompts produce nested tables,
      // but the recursion costs nothing and future-proofs the path.
      const childNode = node as ElementNode
      const transformed = preprocessForMarkdown(childNode.children as Descendant[])
      out.push({ ...childNode, children: transformed } as unknown as Descendant)
    } else {
      out.push(node)
    }
  }
  return out
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
    // Pre-process so tables become text-paragraph blocks the serializer
    // can actually emit. Without this, DOCX export silently fails.
    const safeNodes = preprocessForMarkdown(currentNodes)
    const content = editor.api.markdown.serialize({ value: safeNodes })

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
