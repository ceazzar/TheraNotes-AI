"use client";

import { ListTree, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Flag, ReportSection } from "@/lib/workspace/types";

interface TocSidebarProps {
  sections: ReportSection[];
  flags: Flag[];
  activeSection: string;
  collapsed: boolean;
  touchedSections: Set<string>;
  progressPct: number;
  onToggleCollapse: () => void;
  onJumpTo: (id: string) => void;
  onOpenFlag: (id: string) => void;
  onReviewAll: () => void;
}

export function TocSidebar({
  sections,
  flags,
  activeSection,
  collapsed,
  touchedSections,
  progressPct,
  onToggleCollapse,
  onJumpTo,
  onOpenFlag,
  onReviewAll,
}: TocSidebarProps) {
  const liveFlags = flags.filter((f) => !f.resolved);

  return (
    <aside className="tn-side">
      <div className="tn-side-head">
        <ListTree size={14} />
        Sections
        <button
          className="tn-side-collapse"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Draft progress — bespoke bar so the workspace sidebar stays on the
              tn-* token system rather than inheriting shadcn's primary blue. */}
          <div className="tn-side-progress">
            <div className="tn-side-progress-lbl">
              <span>Draft progress</span>
              <b>{progressPct}%</b>
            </div>
            <div className="tn-side-progress-bar">
              <div
                className="tn-side-progress-fill"
                data-complete={progressPct >= 100 ? "true" : undefined}
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>

          {/* Table of contents */}
          <div className="tn-side-toc">
            <div className="tn-toc-label">Report</div>
            {sections.map((s) => {
              const sectionFlags = liveFlags.filter(
                (f) => f.section === s.id
              );
              const hasCrit = sectionFlags.some((f) => f.sev === "critical");
              const edited = touchedSections.has(s.id);

              return (
                <button
                  key={s.id}
                  className="tn-toc-item"
                  data-active={activeSection === s.id}
                  onClick={() => onJumpTo(s.id)}
                >
                  <span
                    className="tn-toc-dot"
                    data-status={edited ? "edited" : "untouched"}
                  />
                  <span className="tn-toc-name">
                    {s.title.replace(/^Part [A-E] — /, "")}
                  </span>
                  {sectionFlags.length > 0 && (
                    <span
                      className="tn-toc-flag"
                      data-sev={hasCrit ? "critical" : "warning"}
                    >
                      {sectionFlags.length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Day-1 review: removed dead "Appendices" and "Signatures" entries.
                Both rendered as TOC items with no onClick — false affordances.
                Reintroduce with real handlers when those features actually ship. */}
          </div>

          {/* NDIS Planner Review summary */}
          <SidebarFlagSummary
            flags={flags}
            onOpen={onOpenFlag}
            onReviewAll={onReviewAll}
          />
        </>
      )}
    </aside>
  );
}

function SidebarFlagSummary({
  flags,
  onOpen,
  onReviewAll,
}: {
  flags: Flag[];
  onOpen: (id: string) => void;
  onReviewAll: () => void;
}) {
  const live = flags.filter((f) => !f.resolved);
  const crit = live.filter((f) => f.sev === "critical").length;
  const warn = live.filter((f) => f.sev === "warning").length;
  const sugg = live.filter((f) => f.sev === "suggestion").length;

  return (
    <div className="tn-side-review">
      <div className="tn-side-review-title">NDIS Planner Review</div>
      <div className="tn-side-review-counts">
        <span className="tn-count" data-sev="critical">
          <span className="tn-count-dot" />
          {crit} critical
        </span>
        <span className="tn-count" data-sev="warning">
          <span className="tn-count-dot" />
          {warn} warning{warn === 1 ? '' : 's'}
        </span>
        <span className="tn-count" data-sev="suggestion">
          <span className="tn-count-dot" />
          {sugg} suggestion{sugg === 1 ? '' : 's'}
        </span>
      </div>
      <div className="tn-side-review-list">
        {live.slice(0, 4).map((f) => (
          <button
            key={f.id}
            className="tn-review-row"
            onClick={() => onOpen(f.id)}
          >
            <span
              className="tn-count-dot"
              style={{
                background:
                  f.sev === "critical"
                    ? "var(--tn-crit)"
                    : f.sev === "warning"
                      ? "var(--tn-warn)"
                      : "var(--tn-sugg)",
              }}
            />
            <span>{f.title}</span>
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        style={{ width: "100%" }}
        onClick={onReviewAll}
      >
        Review all {live.length}
      </Button>
    </div>
  );
}
