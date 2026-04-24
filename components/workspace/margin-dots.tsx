"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import type { Flag } from "@/lib/workspace/sample-data";

interface MarginDotsProps {
  flags: Flag[];
  paperRef: RefObject<HTMLDivElement | null>;
  onOpenFlag: (id: string, el?: HTMLElement) => void;
}

export function MarginDots({ flags, paperRef, onOpenFlag }: MarginDotsProps) {
  const [dots, setDots] = useState<
    Array<{ id: string; sev: string; top: number }>
  >([]);

  useLayoutEffect(() => {
    const reposition = () => {
      if (!paperRef.current) return;
      const paperRect = paperRef.current.getBoundingClientRect();
      const next = flags
        .map((f) => {
          const el = document.querySelector(
            `[data-flag-id="${f.id}"]`
          ) as HTMLElement | null;
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            id: f.id,
            sev: f.sev,
            top: r.top - paperRect.top + r.height / 2 - 7,
          };
        })
        .filter(Boolean) as Array<{ id: string; sev: string; top: number }>;
      setDots(next);
    };

    reposition();
    const t = setTimeout(reposition, 200);
    window.addEventListener("resize", reposition);

    const scroller = paperRef.current?.closest(".tn-paper-scroll");
    scroller?.addEventListener("scroll", reposition);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", reposition);
      scroller?.removeEventListener("scroll", reposition);
    };
  }, [flags, paperRef]);

  return (
    <>
      {dots.map((d) => (
        <button
          key={d.id}
          className="tn-margin-dot"
          data-sev={d.sev}
          style={{ top: d.top, right: 18 }}
          onClick={(e) => onOpenFlag(d.id, e.currentTarget as HTMLElement)}
          aria-label="Open flag"
        />
      ))}
    </>
  );
}
