"use client";

import { Check, X } from "lucide-react";

interface SelReplaceData {
  original: string;
  refined: string;
  rect: DOMRect;
}

interface ReplacePopoverProps {
  data: SelReplaceData;
  onAccept: () => void;
  onReject: () => void;
}

export function ReplacePopover({ data, onAccept, onReject }: ReplacePopoverProps) {
  const top = Math.max(8, data.rect.top - 50);
  const left = Math.max(
    12,
    Math.min(
      (typeof window !== "undefined" ? window.innerWidth : 1200) - 420,
      data.rect.left + data.rect.width / 2 - 210
    )
  );

  return (
    <div
      className="tn-refine-panel tn-fade-up"
      style={{
        top,
        left,
        width: 420,
        background: "var(--tn-bg-raised)",
      }}
    >
      <span
        style={{
          background: "var(--tn-ok-bg)",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 12,
          color: "var(--tn-ok)",
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        AI suggestion
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--tn-ink-2)",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        &ldquo;{data.refined}&rdquo;
      </span>
      <button className="tn-ai-btn tn-ai-btn-accept" onClick={onAccept}>
        <Check size={11} strokeWidth={3} /> Accept
      </button>
      <button className="tn-ai-btn tn-ai-btn-reject" onClick={onReject}>
        <X size={11} strokeWidth={3} /> Reject
      </button>
    </div>
  );
}
