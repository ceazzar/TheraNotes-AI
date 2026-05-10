'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { generateDocx } from '@/lib/export/docx'
import { fetchProfile } from '@/lib/profile'
import { createClient } from '@/lib/supabase/client'

interface ExportButtonProps {
  sections: Record<string, { title: string; content: string }>
}

/**
 * Single delegating export button. The previous version inlined a duplicate
 * (and broken) docx renderer; now delegates to lib/export/docx so the result
 * page and the workspace produce byte-identical DOCX output and any future
 * formatting fix lands in one place.
 */
export function ExportButton({ sections }: ExportButtonProps) {
  const supabase = useMemo(() => createClient(), [])
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      // Best-effort: pull the profile for letterhead. If it fails or returns
      // null, generateDocx falls back to a plain header.
      const { data: { user } } = await supabase.auth.getUser()
      const profile = user ? await fetchProfile(supabase, user.id).catch(() => null) : null
      const blob = await generateDocx(sections, { profile })
      saveAs(blob, 'FCA-Report.docx')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download className="size-3.5" />}
      {exporting ? 'Exporting…' : 'Export DOCX'}
    </Button>
  )
}
