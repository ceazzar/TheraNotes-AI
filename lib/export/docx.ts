/**
 * DOCX export — produces a planner-ready Word document from the report's
 * markdown sections.
 *
 * Previous implementation rendered every paragraph as a flat TextRun, so:
 *   - lists printed literally as "* item"
 *   - tables printed as "| Field | Details |"
 *   - bold lost
 *   - no letterhead, no page numbers, no footer disclaimer
 *
 * This version renders markdown headings, bullet lists, pipe-delimited tables,
 * bold and italic. Adds a letterhead from the clinician profile, page numbers,
 * and a footer disclaimer. No new dependencies — uses more of the docx API.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageNumber,
  Header,
  Footer,
} from 'docx'
import type { ClinicianProfile } from '@/lib/profile'

export interface ExportSection {
  title: string
  content: string
}

export interface ExportOptions {
  /** Optional clinician profile used for letterhead and document attribution. */
  profile?: ClinicianProfile | null
  /** Title shown at the top of the first page. Defaults to standard FCA title. */
  title?: string
}

const DEFAULT_TITLE = 'Functional Capacity Assessment Report'

export async function generateDocx(
  sections: Record<string, ExportSection>,
  options: ExportOptions = {},
): Promise<Blob> {
  const { profile, title = DEFAULT_TITLE } = options
  const children: (Paragraph | Table)[] = []

  if (profile?.clinic_name) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: profile.clinic_name, bold: true, size: 26 }),
        ],
        spacing: { after: 80 },
      }),
    )
    const subline = [profile.clinic_address, profile.contact_email]
      .filter(Boolean)
      .join(' · ')
    if (subline) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: subline, size: 18, color: '666666' })],
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
        }),
      )
    }
  }

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 },
    }),
  )

  for (const [, section] of Object.entries(sections)) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
      }),
    )
    const blocks = parseMarkdownToBlocks(section.content)
    for (const node of renderBlocks(blocks)) {
      children.push(node)
    }
  }

  const doc = new Document({
    creator: profile?.display_name ?? undefined,
    title,
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: title, size: 16, color: '999999' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'AI-drafted. Clinician review required before submission.   ',
                    size: 16,
                    color: '999999',
                  }),
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '999999',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

// ---------------------------------------------------------------------------
// Minimal markdown parser — heading / paragraph / bullet list / table only.
// AI output is constrained and predictable, so we don't need full CommonMark.
// ---------------------------------------------------------------------------

type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet_list'; items: string[] }
  | { kind: 'table'; rows: string[][] }

function parseMarkdownToBlocks(md: string): Block[] {
  const lines = md.split('\n')
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      i++
      continue
    }
    const headingMatch = /^(#{2,3})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      out.push({
        kind: 'heading',
        level: headingMatch[1].length === 2 ? 2 : 3,
        text: headingMatch[2].replace(/\*\*/g, '').trim(),
      })
      i++
      continue
    }
    if (/^\|/.test(trimmed)) {
      const tableLines: string[] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .map((l) => l.trim())
        .filter((l) => !/^\|?[\s:|-]*$/.test(l))
        .map((l) =>
          l
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim()),
        )
      if (rows.length > 0) {
        out.push({ kind: 'table', rows })
      }
      continue
    }
    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim())
        i++
      }
      out.push({ kind: 'bullet_list', items })
      continue
    }
    const paragraphLines: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^[#|\-*]/.test(lines[i].trim())) {
      paragraphLines.push(lines[i])
      i++
    }
    out.push({ kind: 'paragraph', text: paragraphLines.join(' ').trim() })
  }
  return out
}

function renderBlocks(blocks: Block[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []
  for (const b of blocks) {
    if (b.kind === 'heading') {
      out.push(
        new Paragraph({
          text: b.text,
          heading: b.level === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
          spacing: { before: 220, after: 100 },
        }),
      )
    } else if (b.kind === 'paragraph') {
      out.push(
        new Paragraph({
          children: renderInlineMarkdown(b.text),
          spacing: { after: 120 },
        }),
      )
    } else if (b.kind === 'bullet_list') {
      for (const item of b.items) {
        out.push(
          new Paragraph({
            children: renderInlineMarkdown(item),
            bullet: { level: 0 },
            spacing: { after: 60 },
          }),
        )
      }
    } else if (b.kind === 'table') {
      const [header, ...body] = b.rows
      if (!header) continue
      const tableRows: TableRow[] = []
      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: header.map(
            (cellText) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cellText, bold: true, size: 20 })],
                  }),
                ],
                shading: { fill: 'F2F4F7' },
              }),
          ),
        }),
      )
      for (const row of body) {
        const cells = [...row]
        while (cells.length < header.length) cells.push('')
        if (cells.length > header.length) cells.length = header.length
        tableRows.push(
          new TableRow({
            children: cells.map(
              (cellText) =>
                new TableCell({
                  children: [
                    new Paragraph({ children: renderInlineMarkdown(cellText) }),
                  ],
                }),
            ),
          }),
        )
      }
      out.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      )
      out.push(new Paragraph({ text: '', spacing: { after: 120 } }))
    }
  }
  return out
}

/**
 * Render bold (**text**) and italic (*text*) into TextRun children.
 * Also unescapes literal pipe-escapes (`\|`) added by header.ts.
 */
function renderInlineMarkdown(text: string): TextRun[] {
  if (!text) return [new TextRun({ text: '', size: 22 })]
  const cleaned = text.replace(/\\\|/g, '|')
  if (/^\[INSUFFICIENT DATA[^\]]*\]$/.test(cleaned.trim())) {
    return [new TextRun({ text: cleaned, italics: true, color: '999999', size: 22 })]
  }
  const out: TextRun[] = []
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      out.push(new TextRun({ text: cleaned.slice(lastIndex, match.index), size: 22 }))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      out.push(new TextRun({ text: token.slice(2, -2), bold: true, size: 22 }))
    } else {
      out.push(new TextRun({ text: token.slice(1, -1), italics: true, size: 22 }))
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < cleaned.length) {
    out.push(new TextRun({ text: cleaned.slice(lastIndex), size: 22 }))
  }
  return out.length > 0 ? out : [new TextRun({ text: cleaned, size: 22 })]
}
