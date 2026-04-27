"use client";

import { useRef, useEffect } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface RefinePanelProps {
  rect: DOMRect;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function RefinePanel({
  rect,
  value,
  onChange,
  onSubmit,
  onClose,
}: RefinePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const top = Math.max(8, rect.top - 52);
  const left = Math.max(
    12,
    Math.min(
      (typeof window !== "undefined" ? window.innerWidth : 1200) - 400,
      rect.left + rect.width / 2 - 190
    )
  );

  return (
    <div className="tn-refine-panel tn-fade-up" style={{ top, left }}>
      <Sparkles size={13} className="flex-shrink-0" style={{ color: "var(--tn-accent)" }} />
      <Input
        ref={inputRef}
        className="tn-refine-input"
        placeholder='Improve this text -- e.g. "add specific frequency"'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onClose();
        }}
      />
      <button className="tn-refine-send" onClick={onSubmit}>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
