'use client'

import { generateDocx } from '@/lib/export/docx'
import { saveAs } from 'file-saver'

export function ExportButton({
  sections,
}: {
  sections: Record<string, { title: string; content: string }>
}) {
  const handleExport = async () => {
    const blob = await generateDocx(sections)
    saveAs(blob, 'FCA-Report.docx')
  }

  return (
    <button
      onClick={handleExport}
      className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground"
    >
      Export DOCX
    </button>
  )
}
