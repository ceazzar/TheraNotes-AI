'use client'

import { Printer, Shield, Download, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SaveStatus } from '@/hooks/use-auto-save'

interface WorkspaceFooterProps {
  saveStatus: SaveStatus
  saveError?: string | null
  reviewing?: boolean
  onExportDocx?: () => void
  onRunReview?: () => void
  onRetrySave?: () => void
}

export function WorkspaceFooter({
  saveStatus,
  saveError = null,
  reviewing = false,
  onExportDocx,
  onRunReview,
  onRetrySave,
}: WorkspaceFooterProps) {
  return (
    <div className="tn-footer">
      {saveStatus === 'error' ? (
        <button
          type="button"
          className="tn-saved"
          data-status="error"
          onClick={onRetrySave}
          title={saveError ?? 'Save failed. Click to retry.'}
        >
          <AlertTriangle size={12} />
          Save failed — click to retry
        </button>
      ) : (
        <span className="tn-saved" data-status={saveStatus}>
          <span className="tn-saved-dot" />
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
        </span>
      )}

      {/* Clinical responsibility disclaimer — sits next to Export so the
          clinician sees it before downloading the DOCX they'll send to NDIS. */}
      <span
        className="tn-disclaimer"
        title="The clinician retains full responsibility for the report's clinical accuracy, including any AI-drafted content."
      >
        <Info size={12} />
        AI-drafted. Clinician review required before submission.
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
