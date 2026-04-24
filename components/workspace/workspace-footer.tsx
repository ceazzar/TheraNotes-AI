"use client";

import { Printer, Shield, Download } from "lucide-react";

interface WorkspaceFooterProps {
  saving: boolean;
}

export function WorkspaceFooter({ saving }: WorkspaceFooterProps) {
  return (
    <div className="tn-footer">
      <span className="tn-saved" data-saving={saving}>
        <span className="tn-saved-dot" />
        {saving ? "Saving…" : "Saved just now"}
      </span>
      <div className="tn-footer-actions">
        <button className="tn-btn tn-btn-ghost tn-btn-sm">
          <Printer size={14} /> Print
        </button>
        <button className="tn-btn tn-btn-outline tn-btn-sm">
          <Shield size={14} /> Run NDIS review
        </button>
        <button className="tn-btn tn-btn-primary tn-btn-sm">
          <Download size={14} /> Download DOCX
        </button>
      </div>
    </div>
  );
}
