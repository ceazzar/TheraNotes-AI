"use client";

import { Check, X } from "lucide-react";
import type { Flag, FlagPreview } from "@/lib/workspace/sample-data";

interface FlagSpanProps {
  flag: Flag;
  replaced?: FlagPreview;
  onOpen: (id: string, el: HTMLElement) => void;
  onAccept: () => void;
  onReject: () => void;
}

export function FlagSpan({
  flag,
  replaced,
  onOpen,
  onAccept,
  onReject,
}: FlagSpanProps) {
  // Preview state: show green replacement text with accept/reject
  if (replaced && replaced.state === "preview") {
    return (
      <>
        <span className="tn-ai-replace">{replaced.text}</span>
        <span className="tn-ai-actions">
          <button className="tn-ai-btn tn-ai-btn-accept" onClick={onAccept}>
            <Check size={10} strokeWidth={3} /> Accept
          </button>
          <button className="tn-ai-btn tn-ai-btn-reject" onClick={onReject}>
            <X size={10} strokeWidth={3} /> Reject
          </button>
        </span>
      </>
    );
  }

  // Accepted state: show the replacement text as normal text
  if (replaced && replaced.state === "accepted") {
    return <span>{replaced.text}</span>;
  }

  // Resolved (dismissed): show original text without annotation
  if (flag.resolved) {
    return <span>{flag.originalText}</span>;
  }

  // Active flag: clickable underlined text
  return (
    <span
      className="tn-flag-span"
      data-sev={flag.sev}
      data-flag-id={flag.id}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(flag.id, e.currentTarget);
      }}
    >
      {flag.originalText}
    </span>
  );
}
