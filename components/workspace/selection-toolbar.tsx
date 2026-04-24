"use client";

import { Bold, Italic, Sparkles } from "lucide-react";

interface SelectionToolbarProps {
  rect: DOMRect;
  onRefine: () => void;
}

export function SelectionToolbar({ rect, onRefine }: SelectionToolbarProps) {
  const top = Math.max(8, rect.top - 46);
  const left = Math.max(
    12,
    Math.min(
      (typeof window !== "undefined" ? window.innerWidth : 1200) - 240,
      rect.left + rect.width / 2 - 120
    )
  );

  return (
    <div className="tn-sel-toolbar" style={{ top, left }}>
      <button className="tn-sel-btn" title="Bold">
        <Bold size={13} />
      </button>
      <button className="tn-sel-btn" title="Italic">
        <Italic size={13} />
      </button>
      <div className="tn-sel-sep" />
      <button className="tn-sel-btn" title="Heading 2">
        <span style={{ fontSize: 12 }}>H2</span>
      </button>
      <button className="tn-sel-btn" title="Bullet list">
        <span style={{ fontSize: 12 }}>&bull;&bull;</span>
      </button>
      <div className="tn-sel-sep" />
      <button className="tn-sel-btn tn-sel-btn-accent" onClick={onRefine}>
        <Sparkles size={11} /> Refine with AI
      </button>
    </div>
  );
}
