'use client'

import { Printer, Shield, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WorkspaceFooterProps {
  saving: boolean
  reviewing?: boolean
  onExportDocx?: () => void
  onRunReview?: () => void
}

export function WorkspaceFooter({
  saving,
  reviewing = false,
  onExportDocx,
  onRunReview,
}: WorkspaceFooterProps) {
  return (
    <div className="tn-footer">
      <span className="tn-saved" data-saving={saving}>
        <span className="tn-saved-dot" />
        {saving ? 'Saving…' : 'Saved just now'}
      </span>
      <div className="tn-footer-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer size={14} /> Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunReview}
          disabled={reviewing}
        >
          <Shield size={14} /> {reviewing ? 'Reviewing...' : 'Run NDIS review'}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onExportDocx}
        >
          <Download size={14} /> Download DOCX
        </Button>
      </div>
    </div>
  )
}
