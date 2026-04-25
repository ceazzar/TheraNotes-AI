'use client'

import { Printer, Shield, Download } from 'lucide-react'

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
        <button
          className="tn-btn tn-btn-ghost tn-btn-sm"
          onClick={() => window.print()}
        >
          <Printer size={14} /> Print
        </button>
        <button
          className="tn-btn tn-btn-outline tn-btn-sm"
          onClick={onRunReview}
          disabled={reviewing}
        >
          <Shield size={14} /> {reviewing ? 'Reviewing...' : 'Run NDIS review'}
        </button>
        <button
          className="tn-btn tn-btn-primary tn-btn-sm"
          onClick={onExportDocx}
        >
          <Download size={14} /> Download DOCX
        </button>
      </div>
    </div>
  )
}
