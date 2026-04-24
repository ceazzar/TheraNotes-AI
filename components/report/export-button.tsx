'use client'

import { Download } from 'lucide-react'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'

interface ExportButtonProps {
  sections: Record<string, { title: string; content: string }>
}

export function ExportButton({ sections }: ExportButtonProps) {
  const handleExport = async () => {
    const children: Paragraph[] = [
      new Paragraph({
        text: 'Functional Capacity Assessment Report',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ]

    for (const [, section] of Object.entries(sections)) {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'CCCCCC',
            },
          },
        })
      )

      const paragraphs = section.content.split('\n\n')
      for (const para of paragraphs) {
        if (!para.trim()) continue
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim(), size: 22 })],
            spacing: { after: 120 },
          })
        )
      }
    }

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, 'FCA-Report.docx')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-3.5" />
      Export DOCX
    </Button>
  )
}
