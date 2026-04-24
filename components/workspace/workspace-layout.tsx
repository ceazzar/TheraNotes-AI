"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  Search,
  Shield,
} from "lucide-react";
import {
  REPORT_SECTIONS,
  FLAGS as INITIAL_FLAGS,
  PARTICIPANT,
} from "@/lib/workspace/sample-data";
import type { Flag, FlagPreview } from "@/lib/workspace/sample-data";
import { TocSidebar } from "./toc-sidebar";
import { DocumentBody } from "./document-body";
import { SelectionToolbar } from "./selection-toolbar";
import { RefinePanel } from "./refine-panel";
import { ReplacePopover } from "./replace-popover";
import { FlagPopover } from "./flag-popover";
import { MarginDots } from "./margin-dots";
import { WorkspaceFooter } from "./workspace-footer";

interface WorkspaceLayoutProps {
  reportId: string;
}

export function WorkspaceLayout({ reportId }: WorkspaceLayoutProps) {
  // Flag state
  const [flags, setFlags] = useState<Flag[]>(() =>
    INITIAL_FLAGS.map((f) => ({ ...f, resolved: false }))
  );
  // AI replacement preview state
  const [previews, setPreviews] = useState<Record<string, FlagPreview>>({});
  // Open popover
  const [openFlag, setOpenFlag] = useState<{
    id: string;
    anchor: HTMLElement;
  } | null>(null);
  // Section visibility
  const [activeSection, setActiveSection] = useState("a");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection toolbar
  const [selection, setSelection] = useState<{
    rect: DOMRect;
    text: string;
  } | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [pendingSelReplace, setPendingSelReplace] = useState<{
    original: string;
    refined: string;
    rect: DOMRect;
  } | null>(null);

  const paperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track text selection on the paper
  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        setRefineOpen(false);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!paperRef.current?.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width < 2) return;
      setSelection({ rect, text: sel.toString() });
    };
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
  }, []);

  // Active section detection on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const anchors = el.querySelectorAll("[data-section-anchor]");
      let current = "a";
      anchors.forEach((a) => {
        const top = a.getBoundingClientRect().top;
        if (top < 180) current = (a as HTMLElement).dataset.sectionAnchor || "a";
      });
      setActiveSection(current);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Flag map for quick lookups
  const flagMap = useMemo(() => {
    const m: Record<string, Flag> = {};
    flags.forEach((f) => {
      m[f.id] = f;
    });
    return m;
  }, [flags]);

  // Progress: percentage of sections with resolved flags
  const touchedSections = useMemo(
    () => new Set(flags.filter((f) => f.resolved).map((f) => f.section)),
    [flags]
  );
  const progressPct = Math.round(
    (touchedSections.size / REPORT_SECTIONS.length) * 100
  );

  const triggerSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => setSaving(false), 900);
  }, []);

  const jumpTo = useCallback((id: string) => {
    const el = scrollRef.current?.querySelector(
      `[data-section-anchor="${id}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openFlagById = useCallback((id: string, anchorEl?: HTMLElement) => {
    let anchor = anchorEl;
    if (!anchor) {
      anchor = document.querySelector(
        `[data-flag-id="${id}"]`
      ) as HTMLElement | null ?? undefined;
    }
    if (!anchor) return;
    anchor.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => setOpenFlag({ id, anchor: anchor! }), 180);
  }, []);

  const applyFix = useCallback(
    (flag: Flag) => {
      setPreviews((p) => ({
        ...p,
        [flag.id]: {
          state: "preview",
          text: flag.refined,
        },
      }));
      setOpenFlag(null);
      triggerSave();
    },
    [triggerSave]
  );

  const dismissFlag = useCallback(
    (flag: Flag) => {
      setFlags((fs) =>
        fs.map((f) => (f.id === flag.id ? { ...f, resolved: true } : f))
      );
      setOpenFlag(null);
      triggerSave();
    },
    [triggerSave]
  );

  const handleAcceptPreview = useCallback(
    (flagId: string) => {
      setFlags((fs) =>
        fs.map((f) => (f.id === flagId ? { ...f, resolved: true } : f))
      );
      setPreviews((p) => ({
        ...p,
        [flagId]: { state: "accepted", text: p[flagId]?.text || "" },
      }));
      triggerSave();
    },
    [triggerSave]
  );

  const handleRejectPreview = useCallback((flagId: string) => {
    setPreviews((p) => {
      const c = { ...p };
      delete c[flagId];
      return c;
    });
  }, []);

  const reviewAll = useCallback(() => {
    const first = flags.find((f) => !f.resolved);
    if (first) openFlagById(first.id);
  }, [flags, openFlagById]);

  // Selection -> Refine
  const doRefineSubmit = useCallback(() => {
    if (!selection) return;
    const refined =
      "functions independently with standard prompts and achieves the task consistently across observed trials";
    setPendingSelReplace({
      original: selection.text,
      refined,
      rect: selection.rect,
    });
    setSelection(null);
    setRefineOpen(false);
    setRefineText("");
  }, [selection]);

  const onOpenFlagFromSpan = useCallback(
    (id: string, el: HTMLElement) => {
      setOpenFlag({ id, anchor: el });
    },
    []
  );

  const liveFlags = useMemo(
    () => flags.filter((f) => !f.resolved),
    [flags]
  );

  return (
    <div
      className="tn-ws"
      data-sidebar-collapsed={sidebarCollapsed}
      data-flag-style="margin"
      style={{ "--sidebar-w": "280px" } as React.CSSProperties}
    >
      {/* Sidebar */}
      <TocSidebar
        sections={REPORT_SECTIONS}
        flags={flags}
        activeSection={activeSection}
        collapsed={sidebarCollapsed}
        touchedSections={touchedSections}
        progressPct={progressPct}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onJumpTo={jumpTo}
        onOpenFlag={openFlagById}
        onReviewAll={reviewAll}
      />

      {/* Main content */}
      <div className="tn-ws-main">
        {/* Topbar breadcrumbs */}
        <div className="tn-ws-topbar">
          <div className="tn-ws-crumbs">
            <button
              className="tn-btn tn-btn-ghost tn-btn-xs"
              style={{ marginRight: 4 }}
              onClick={() => window.history.back()}
            >
              <ChevronLeft size={13} /> Back
            </button>
            <span>Reports</span>
            <span style={{ color: "var(--tn-muted-3)" }}>/</span>
            <b>FCA &mdash; {PARTICIPANT.name}</b>
            <span
              style={{
                color: "var(--tn-muted-3)",
                marginLeft: 6,
                fontSize: 12,
              }}
            >
              Draft v1 &middot; {PARTICIPANT.reportDate}
            </span>
          </div>
          <div className="tn-ws-top-actions">
            <button className="tn-btn tn-btn-ghost tn-btn-xs">
              <Search size={13} /> Find
            </button>
            <button className="tn-btn tn-btn-ghost tn-btn-xs">
              <Shield size={13} /> NDIS Review
            </button>
          </div>
        </div>

        {/* Paper scroll area */}
        <div className="tn-paper-scroll" ref={scrollRef}>
          <div className="tn-paper" ref={paperRef}>
            <div className="tn-paper-inner">
              <DocumentBody
                flags={flagMap}
                previews={previews}
                onOpenFlag={onOpenFlagFromSpan}
                onAcceptPreview={handleAcceptPreview}
                onRejectPreview={handleRejectPreview}
              />
            </div>

            {/* Margin dots */}
            <MarginDots
              flags={liveFlags}
              onOpenFlag={openFlagById}
              paperRef={paperRef}
            />
          </div>
        </div>

        {/* Footer */}
        <WorkspaceFooter saving={saving} />
      </div>

      {/* Selection toolbar */}
      {selection && !refineOpen && (
        <SelectionToolbar
          rect={selection.rect}
          onRefine={() => setRefineOpen(true)}
        />
      )}
      {refineOpen && selection && (
        <RefinePanel
          rect={selection.rect}
          value={refineText}
          onChange={setRefineText}
          onSubmit={doRefineSubmit}
          onClose={() => setRefineOpen(false)}
        />
      )}
      {pendingSelReplace && (
        <ReplacePopover
          data={pendingSelReplace}
          onAccept={() => {
            setPendingSelReplace(null);
            triggerSave();
          }}
          onReject={() => setPendingSelReplace(null)}
        />
      )}

      {/* Flag popover */}
      {openFlag && (
        <FlagPopover
          flag={flagMap[openFlag.id]}
          anchor={openFlag.anchor}
          onClose={() => setOpenFlag(null)}
          onApply={applyFix}
          onDismiss={dismissFlag}
        />
      )}
    </div>
  );
}
