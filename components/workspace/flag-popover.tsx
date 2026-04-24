"use client";

import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { X, Sparkles } from "lucide-react";
import type { Flag } from "@/lib/workspace/types";

interface FlagPopoverProps {
  flag: Flag | undefined;
  anchor: HTMLElement | null;
  onClose: () => void;
  onApply: (flag: Flag) => void;
  onDismiss: (flag: Flag) => void;
}

export function FlagPopover({
  flag,
  anchor,
  onClose,
  onApply,
  onDismiss,
}: FlagPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const w = 320;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(12, Math.min(window.innerWidth - w - 12, left));
    let top = r.bottom + 8;
    if (top + 260 > window.innerHeight) top = r.top - 260;
    setPos({ top, left });
  }, [anchor]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".tn-popover")) return;
      if (target.closest(".tn-flag-span")) return;
      if (target.closest(".tn-margin-dot")) return;
      if (target.closest(".tn-review-row")) return;
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  if (!flag) return null;

  const sevLabel: Record<string, string> = {
    critical: "Critical",
    warning: "Warning",
    suggestion: "Suggestion",
  };

  const sevColor: Record<string, string> = {
    critical: "var(--tn-crit)",
    warning: "var(--tn-warn)",
    suggestion: "var(--tn-sugg)",
  };

  return (
    <div
      className="tn-popover tn-fade-up"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="tn-popover-head">
        <span className="tn-sev-badge" data-sev={flag.sev}>
          <span
            className="tn-count-dot"
            style={{ background: sevColor[flag.sev] }}
          />
          {sevLabel[flag.sev]}
        </span>
        <span className="tn-popover-title">{flag.title}</span>
        <button className="tn-popover-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="tn-popover-desc">{flag.desc}</div>
      <div className="tn-popover-fix">
        <b>Recommended fix</b>
        {flag.fix}
      </div>
      <div className="tn-popover-rationale">{flag.rationale}</div>
      <div className="tn-popover-actions">
        <button
          className="tn-btn tn-btn-accent tn-btn-sm"
          onClick={() => onApply(flag)}
        >
          <Sparkles size={11} /> Apply fix
        </button>
        <button
          className="tn-btn tn-btn-outline tn-btn-sm"
          onClick={() => onDismiss(flag)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
