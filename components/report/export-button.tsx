'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  sections: Record<string, { title: string; content: string }>
}

export function ExportButton({ sections }: ExportButtonProps) {
  const handleExport = () => {
    const text = Object.entries(sections)
      .map(([, s]) => `${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="xs" onClick={handleExport}>
      <Download className="size-3" />
      Export
    </Button>
  )
}
