'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface FormattedReportProps {
  sections: Record<string, { title: string; content: string }>
  className?: string
}

/**
 * Renders generated report sections as a professional clinical document
 * with proper typography, heading hierarchy, and styled insufficient-data markers.
 */
export function FormattedReport({ sections, className }: FormattedReportProps) {
  const sectionEntries = useMemo(() => Object.entries(sections), [sections])

  if (sectionEntries.length === 0) return null

  return (
    <article
      className={cn('report-document', className)}
    >
      {/* Report title */}
      <header className="report-document-header">
        <h1>Functional Capacity Assessment</h1>
        <div className="report-document-header-rule" />
      </header>

      {sectionEntries.map(([sectionId, section], index) => (
        <section key={sectionId} id={`section-${sectionId.replace(/\s+/g, '-').toLowerCase()}`}>
          {/* Section divider between major parts */}
          {index > 0 && <div className="report-document-divider" />}

          {/* Section heading */}
          <h2>{section.title}</h2>

          {/* Render content with paragraph splitting and heading detection */}
          <ReportContent content={section.content} />
        </section>
      ))}
    </article>
  )
}

/**
 * Renders a section's content, splitting by double newlines into paragraphs.
 * Detects markdown-style headings (## and ###) and insufficient data markers.
 * Also handles markdown tables (lines starting with |).
 */
function ReportContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseContentBlocks(content), [content])

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'h2') {
          return <h3 key={i} className="report-subsection-heading">{block.text}</h3>
        }
        if (block.type === 'h3') {
          return <h4 key={i} className="report-sub-subsection-heading">{block.text}</h4>
        }
        if (block.type === 'insufficient') {
          return (
            <div key={i} className="insufficient-data">
              {block.text}
            </div>
          )
        }
        if (block.type === 'table') {
          return <ReportTable key={i} lines={block.lines} />
        }
        // Regular paragraph — render inline bold/italic markdown
        return <p key={i} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(block.text) }} />
      })}
    </>
  )
}

interface ContentBlock {
  type: 'paragraph' | 'h2' | 'h3' | 'insufficient' | 'table'
  text: string
  lines: string[]
}

function parseContentBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  // Split by double newlines, but keep table rows grouped
  const rawBlocks = content.split(/\n\n+/)

  for (const raw of rawBlocks) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    // Check for markdown heading: ## Heading
    const h2Match = trimmed.match(/^##\s+(.+)$/)
    if (h2Match && !trimmed.includes('\n')) {
      blocks.push({ type: 'h2', text: h2Match[1].replace(/\*\*/g, '').trim(), lines: [] })
      continue
    }

    // Check for markdown heading: ### Heading
    const h3Match = trimmed.match(/^###\s+(.+)$/)
    if (h3Match && !trimmed.includes('\n')) {
      blocks.push({ type: 'h3', text: h3Match[1].replace(/\*\*/g, '').trim(), lines: [] })
      continue
    }

    // Check for [INSUFFICIENT DATA: ...] markers
    if (trimmed.includes('[INSUFFICIENT DATA')) {
      // Extract just the marker text
      const markerMatch = trimmed.match(/\[INSUFFICIENT DATA[^\]]*\]/)
      if (markerMatch) {
        blocks.push({ type: 'insufficient', text: markerMatch[0], lines: [] })
        // If there's text around the marker, add it as a separate paragraph
        const remaining = trimmed.replace(markerMatch[0], '').trim()
        if (remaining) {
          blocks.push({ type: 'paragraph', text: remaining, lines: [] })
        }
        continue
      }
    }

    // Check for markdown table (lines starting with |)
    const lines = trimmed.split('\n')
    if (lines.length >= 2 && lines[0].trim().startsWith('|') && lines[1].trim().match(/^\|[\s-:|]+\|/)) {
      blocks.push({ type: 'table', text: '', lines })
      continue
    }

    // Multi-line block: could have embedded headings or mixed content
    if (trimmed.includes('\n')) {
      const subLines = trimmed.split('\n')
      let currentParagraph: string[] = []

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          blocks.push({ type: 'paragraph', text: currentParagraph.join(' '), lines: [] })
          currentParagraph = []
        }
      }

      // Check if entire block is a table
      const allTable = subLines.every(l => l.trim().startsWith('|') || l.trim().match(/^[-:|]+$/))
      if (allTable && subLines.some(l => l.trim().startsWith('|'))) {
        blocks.push({ type: 'table', text: '', lines: subLines })
        continue
      }

      for (const line of subLines) {
        const lineH2 = line.match(/^##\s+(.+)$/)
        const lineH3 = line.match(/^###\s+(.+)$/)

        if (lineH2) {
          flushParagraph()
          blocks.push({ type: 'h2', text: lineH2[1].replace(/\*\*/g, '').trim(), lines: [] })
        } else if (lineH3) {
          flushParagraph()
          blocks.push({ type: 'h3', text: lineH3[1].replace(/\*\*/g, '').trim(), lines: [] })
        } else if (line.trim().includes('[INSUFFICIENT DATA')) {
          flushParagraph()
          const mk = line.trim().match(/\[INSUFFICIENT DATA[^\]]*\]/)
          if (mk) {
            blocks.push({ type: 'insufficient', text: mk[0], lines: [] })
          }
        } else {
          currentParagraph.push(line.trim())
        }
      }
      flushParagraph()
      continue
    }

    // Simple paragraph
    blocks.push({ type: 'paragraph', text: trimmed, lines: [] })
  }

  return blocks
}

/** Renders **bold** and *italic* markdown into HTML spans */
function renderInlineMarkdown(text: string): string {
  let html = text
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return html
}

/** Renders a markdown table as an HTML table */
function ReportTable({ lines }: { lines: string[] }) {
  // Parse header
  const headerCells = parseTableRow(lines[0])
  // Skip separator line (index 1)
  const bodyRows = lines.slice(2).filter(l => l.trim().startsWith('|'))

  return (
    <div className="report-table-wrapper">
      <table className="report-table">
        <thead>
          <tr>
            {headerCells.map((cell, i) => (
              <th key={i} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIdx) => {
            const cells = parseTableRow(row)
            return (
              <tr key={rowIdx}>
                {cells.map((cell, cellIdx) => (
                  <td key={cellIdx} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function parseTableRow(row: string): string[] {
  return row
    .split('|')
    .map(c => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - (row.trim().endsWith('|') ? 1 : 0))
    // Re-filter: the split on | gives empty strings at start/end
    .filter(c => c !== '' || true) // keep even empty cells
}
