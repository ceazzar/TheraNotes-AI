# TheraNotes-AI: Visual Craft Review — Round 2

Reviewer: senior product designer (Linear / Notion / Vercel lens)
Date: 2026-05-10
Method: source code audit on `app/`, `components/`, `lib/export/`, plus live HTML curl of `/login`. The `browse` skill was not bound in this environment, so screenshots were not produced; every finding cites file:line so it can be reproduced visually in seconds.

---

## TL;DR — what shipped, what didn't, where it sits now

The Day 1 punch list moved this from "shadcn starter" to "competent internal tool." The login screen, autosave, profile, search/filter, DOCX letterhead, and print CSS all exist now. Brand mark is consistent (Stethoscope at 16px). Sparkles is no longer pretending to be the brand.

But four things kept the upgrade from feeling like a real product:

1. **Two design systems are still alive and visibly fighting.** The shadcn `<Button variant="default">` (oklch primary blue, `rounded-lg`) is used on the login submit, on Generate's send icon, on the validation card's "Generate anyway", on the workspace footer's "Download DOCX", and on `+ New report`. The bespoke `tn-btn-primary` (dark ink pill) is essentially unused now. **Pick one, delete the other.** Right now the user sees three blue rectangles per surface where the design language called for dark ink pills.
2. **The new login page has visible craft errors** — the brand-mark tile color contradicts the body's accent color, the headline has a hard `<br/>` mid-sentence (breaks at narrow widths), the password field lacks a "show password" toggle, the Sign-in button rendered with `tn-auth-submit` is actually styled by shadcn defaults (oklch blue, h-8) because no `.tn-auth-submit` rule exists in `globals.css`. Side-by-side the two columns are good; up close the details aren't.
3. **The "Generate" send button is still a 36px circle with an up-arrow** (`app/generate/page.tsx:1111-1122`). This is the one Day-1 promise that didn't ship. A 6-minute, $1+ action is hidden behind a chat-bubble idiom. Worse, it now uses shadcn `variant="default"` blue (`bg-primary`) rather than the `tn-send-btn` ink black defined in CSS. The CSS class is dead.
4. **Empty/loading states regressed.** Reports list still says "Loading reports…" in muted text (no skeleton). Empty exemplar list is one gray sentence. The new Reports search-empty state ("No reports match this filter.") has no clear-filter CTA. Day-1 review called these out and they remain unaddressed.

The grade now is **C+** (last round was D- on visual cohesion). Real progress, but the system isn't internally consistent and several small "I-am-an-internal-tool" tells remain.

---

## 1. Verification table — Day-1 visual items

The 13 items from `01-visual-craft-review.md`'s "P0 punch list — ordered by impact-per-effort":

| # | Day-1 item | Status | Where | Notes |
|---|---|---|---|---|
| 1 | Delete boilerplate placeholder SVGs in `public/` + replace `favicon.ico` | **Partial** | `public/` empty (verified `ls`); `app/favicon.ico` is still the **default Next.js generic glyph** (32-bit MS Windows icon, 32x32; no Stethoscope mark). The HTML header still ships `<link rel="icon" href="/favicon.ico?...">` with a generic favicon. | SVG cleanup done. Favicon swap not done. Replace with a 32x32 PNG of the Stethoscope mark on `var(--tn-accent)`. |
| 2 | Replace 8 Sparkles uses with semantic icons | **Partial** | `topbar.tsx:5` Stethoscope ✓. `progress-screen.tsx:4,39` still imports + renders **Sparkles** for the "Generating…" title. `editor-toolbar.tsx:4,153,240` still uses **Sparkles** for refine icon and the Refine button label. `flag-popover.tsx:4,98` still uses **Sparkles** on "Apply fix" — that's not an AI affordance, it's accept-recommendation. `refine-panel.tsx:4,39` still uses **Sparkles**. `error.tsx` ✓ (AlertTriangle). `not-found.tsx` ✓ (FileQuestion). | 5 Sparkles uses remain. Recommendation: keep Sparkles only on the Refine surface (1 place); replace progress-screen's Sparkles with `Wand2`; replace flag-popover's "Apply fix" Sparkles with `Check` or `Wand2`. |
| 3 | Build a real Login screen | **Done with rough edges** | `app/login/page.tsx` is a real two-column custom form (verified by curl). Stock Supabase Auth UI is gone. **But:** see "New visual issues" #L1-L5 below. | Architecture right. Detailing wrong. |
| 4 | Replace native `<select>` with shadcn `Select` and `<input type=date>` with shadcn `DatePicker` | **Partial** | `<select>` → ✓ Base UI Select via `components/ui/select.tsx`. Used in 5 places (`Mode`, 4 sensory quadrants, status filter on reports). **`<input type="date">` is still native** in 4 places (`participantDob`, `planStart`, `planEnd`, `reportDate` — all on `app/generate/page.tsx:753, 762, 771, 853`). The CSS in `globals.css:1960-1974` cosmetically darkens the picker indicator but the popup is still OS-owned. | Selects shipped. Date pickers did not. Still leaks OS calendar UI. |
| 5 | Replace native `<details>` with shadcn `Accordion` | **Cosmetic only** | All 5 intake sections still use `<details>` (`app/generate/page.tsx:740, 805, 877, 956, 1029`). The unicode `▸` was swapped for an inline-SVG ChevronRight (`globals.css:1881-1896`). **There is still no height animation on open/close** because native `<details>` doesn't animate. | Chevron looks right. Animation does not. Half-shipped. |
| 6 | Pick ONE primary button style and ONE primary blue | **Not done** | Three primary blues coexist: shadcn `--primary: oklch(0.546 0.215 264)`, `--tn-accent: hsl(225 65% 50%)`, and `--brand-blue: #3B82F6` (from `globals.css:49`). All three are referenced in active code. Two button languages: shadcn pills (used on login, Generate send button, validation card, reports new-button, exemplar upload, footer download, etc) and `.tn-btn-primary` (ink black, defined but **unused in any visible surface**). The `tn-send-btn` CSS class is fully orphaned — `app/generate/page.tsx:1111` uses shadcn `<Button variant="default" size="icon">`. | The single biggest leftover from Day 1. |
| 7 | Promote the Generate button from icon-circle to labeled pill | **Not done** | `app/generate/page.tsx:1111-1122`: still `size="icon"` with `<ArrowUp size={16}/>` only, no label. Even worse: it now uses shadcn primary blue. | A 6-min, $1 action remains a 36px chat icon. |
| 8 | Render `<Topbar />` on Settings | **Done** | `app/settings/page.tsx:7,18` ✓ | Verified. |
| 9 | Pick ONE report stylesheet (`.report-document` vs `.tn-doc`) | **Not done** | Both still exist. `.report-document` styled at `globals.css:855-998` (Georgia 14/1.8, justified, system-ui headings, 22px H1). `.tn-doc` styled at `globals.css:1310-1390` (Georgia 15/1.8, sans headings, 28px H1). `formatted-report.tsx` consumes `.report-document` (post-generate preview); `plate-editor.tsx:41` consumes `.tn-doc` (workspace). User sees the same FCA rendered with **different heading sizes, different paragraph alignment, different table fills** depending on which screen they opened it from. | Highest-impact unfixed visual issue. |
| 10 | Define one focus-ring style and apply it everywhere | **Not done** | Shadcn `--ring: oklch(0.546 0.215 264)` is used in `Input`. The Select trigger (`select.tsx:60`) uses `focus-visible:ring-2 focus-visible:ring-[var(--tn-accent)]/30` — a third color/style. The intake `<input>` (`globals.css:1937-1951`) sets `outline: none` with no `:focus` ring at all (it just changes border color from `--tn-line-soft` to `--tn-line` — barely perceptible). The "borderless" identity inputs at `app/generate/page.tsx:712, 721, 730` use `focus-visible:ring-0` — **all focus state explicitly suppressed**. Tabbing through Generate is invisible. WCAG fail. | Critical accessibility gap. |
| 11 | Custom brand mark + tagline | **Partial** | Brand mark = lucide Stethoscope (consistent across topbar, login, sidebar). Not custom but at least semantic and not Sparkles. **No tagline anywhere except login** ("NDIS-grade Functional Capacity Assessments, drafted in minutes."). Generate page still says "Draft a Functional Capacity Assessment" (functional, not memorable). | Acceptable for an internal tool. Not for a SaaS. |
| 12 | Wire up or hide dead-end controls | **Done in workspace, not done in Generate** | `Appendices` and `Signatures` removed from `toc-sidebar.tsx` ✓. **`Attach`, `Dictate`, `Template` still rendered as functional-looking buttons in `app/generate/page.tsx:1095-1109`** — same dead-end problem. They have hover states, titles, real Button components — and do nothing. Click → eats focus → no feedback. | Workspace ✓, Generate ✗. |
| 13 | Fix `0 suggestion` plural bug | **Done** | `toc-sidebar.tsx:137,141` ✓ uses `${warn === 1 ? '' : 's'}` and `${sugg === 1 ? '' : 's'}`. | Verified. |

**Day-1 score: 6/13 fully shipped, 5/13 partial, 2/13 not done.**

---

## 2. New visual issues found (round 2)

Ranked by impact-per-effort — top items are mechanical 30-minute fixes that move perceived quality the most.

### NEW-1 — Login submit button styled by shadcn primary, not by `.tn-auth-submit` (P0, 5 min)

`app/login/page.tsx:143-156` uses `<Button className="tn-auth-submit">` but `globals.css` defines `.tn-auth-submit` as **only**:

```
.tn-auth-submit {
  margin-top: 6px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
```

(globals.css:2141-2148). No `background`, no `color`, no `border-radius`, no `font-weight`. The visible button is therefore the shadcn default (`bg-primary text-primary-foreground` oklch blue, h-8, rounded-lg). On a page whose accent is meant to be `var(--tn-accent)` (hsl 225 65% 50%, ~#2D5BD9) and whose brand-mark tile uses `var(--tn-accent, #2851a3)`, the submit button paints a **fourth blue** (oklch 0.546 0.215 264, ~#3457D8). Three blues on the same screen.

Fix: extend `.tn-auth-submit` with `background: var(--tn-accent); color: #fff; border-radius: 8px; height: 40px; font-weight: 500;` and override the variant with `variant="default"` removed. Or use `tn-btn tn-btn-accent` directly.

### NEW-2 — Login brand-mark tile and aside bullets use `var(--tn-accent, #2851a3)` while the rest of the app uses `hsl(225 65% 50%)` ≈ `#2D5BD9` (P0, 2 min)

`globals.css:2038, 2081`. The hex fallback `#2851a3` is a different blue (darker, more navy). When `--tn-accent` resolves it's the right color; if the variable ever fails, the fallback is wrong. Worse: the **same tile in the right card** (`tn-auth-brand-mark-md`, line 2041) is also `var(--tn-accent, #2851a3)`. Means the small mark and the big mark use the same color → ✓, but neither matches the `tn-auth-bullets li::before` bullet (line 2081) which fall back to a different color in the same file.

Fix: either drop the fallback (let it inherit) or set the fallback to the actual hsl resolution `#2D5BD9`. Pick one and replace_all.

### NEW-3 — Login headline has a hard `<br/>` that orphans words at narrow widths (P1, 1 min)

`app/login/page.tsx:81-83`:

```
NDIS-grade Functional Capacity Assessments,
<br />
drafted in minutes.
```

At 880px the aside hides (`@media (max-width: 880px)` at globals.css:2019), so this only shows on desktop. But on a 13" laptop with the inspector open, "Assessments," already wraps inconsistently and the `<br/>` then forces a 3-line headline where 2 was intended. Drop the `<br/>` and let CSS `text-wrap: balance` handle it.

### NEW-4 — Login "internal clinician access only" subline overlaps the title visually (P1, 1 min)

`globals.css:2108-2112`: `.tn-auth-card-sub { margin: -10px 0 0; ... }`. Negative top margin on a 13px label sitting under a 20px title creates a visible vertical compression — the sub line nearly touches the title baseline. The intent was probably to tighten gap from 14px (gap of `.tn-auth-card-head`) to 4px, but `-10px` is too aggressive. Use `margin: 0` and reduce the parent's `gap` from `14px` to `6px` instead.

### NEW-5 — Login form has no "show password" toggle, no caps-lock warning, no submit-on-paste guard (P2, 10 min)

For a clinical app, password UX standards now include show-password (eye icon), caps-lock indicator, and an on-paste hint. Optional but cheap.

### NEW-6 — Generate send button: shadcn primary blue + 36px icon-only (P0, 10 min)

`app/generate/page.tsx:1111-1122`. The Day-1 review explicitly called this out as item #7. Status: not done. The CSS class `.tn-send-btn` (globals.css:599-619) is **fully orphaned** — no JSX consumes it. The replacement is a generic shadcn `<Button variant="default" size="icon" className="rounded-full">` rendering oklch blue.

Fix:

```jsx
<Button
  className="tn-btn tn-btn-primary"
  onClick={handleGenerate}
  disabled={!clinicalNotes.trim()}
>
  Generate report <ArrowRight size={14} />
</Button>
```

This labels the action, uses the design-system pill, removes the third blue, and gives the disabled state somewhere to put a tooltip. Single biggest single-line UX upgrade in the app.

### NEW-7 — Generate page still has 3 dead-end tools (P1, 5 min)

`app/generate/page.tsx:1095-1110`. `Attach`, `Dictate`, `Template` are functional-looking shadcn ghost Buttons with `title` attributes hinting capability. None are wired. Clicking is silent — focuses the button and does nothing.

Two fixes, pick one:
- Delete the entire `<div className="tn-gen-tools">` block. The screen is cleaner without them.
- Wrap each in a "Coming soon" badge + tooltip + `disabled` state, à la Linear's "soon" treatment.

### NEW-8 — Reports list "+ New report" button uses shadcn primary blue, not `tn-btn-primary` (P1, 2 min)

`components/reports/report-list.tsx:152-158`. Inline-styled `bg-primary px-3 text-sm font-medium text-primary-foreground` — yet another oklch primary call. While this matches other shadcn defaults across the app, it conflicts with the design intent. Either swap to `tn-btn tn-btn-primary tn-btn-sm` or commit to shadcn primary site-wide and delete `.tn-btn-primary` entirely.

### NEW-9 — Reports search empty state has no clear-filter affordance (P1, 5 min)

`components/reports/report-list.tsx:194-209`. When a filter or search returns 0 results, the user sees "No reports match this filter." with no way to reset. Add a button: `<Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all') }}>Clear filters</Button>`.

### NEW-10 — Reports list still says "Loading reports…" in muted text (P1, 15 min)

`components/reports/report-list.tsx:190-193`. Day-1 review item: still no skeleton. Workspace has a beautiful skeleton at `workspace-layout.tsx:260-296`. Mirror that pattern: render 6 muted card-shaped blocks at `min-height: 88px`. Cost is ~20 lines.

### NEW-11 — Settings exemplar upload is still a `border-2 border-dashed border-border p-8` zone (P1, 10 min)

`components/settings/exemplar-upload.tsx:71`. Day-1 review flagged this as "plucked from a different app." Still raw shadcn / Tailwind tokens, no `tn-*` styling. Result toast (`bg-green-500/10 text-green-600`) at line 106 also uses raw Tailwind colors instead of `tn-ok-bg/line/color`.

### NEW-12 — Settings exemplar list rows are generic shadcn (P2, 10 min)

`components/settings/exemplar-list.tsx:104`. Same problem: `flex items-center justify-between rounded-md border border-border p-3` — no hover state, no `tn-*` tokens, no row interaction beyond delete. Looks like default shadcn.

### NEW-13 — Profile form labels mix two label styles (P2, 5 min)

`components/settings/profile-form.tsx:130, 138, 146, 154, 162, 181, 189, 197, 203` — every label is `<span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">`. That's a fourth label style alongside `.tn-id-label` (uppercase, 11px), `.tn-intake-lbl` (uppercase, 11px), and `.tn-auth-lbl` (uppercase, 12px). Standardize: extract a `.tn-form-lbl` rule into globals.css and use it everywhere.

### NEW-14 — DOCX letterhead rule is a `BorderStyle.SINGLE` 4px gray rule, but the letterhead itself uses 13pt + bold without spacing (P1, 5 min)

`lib/export/docx.ts:55-76`. The clinic_name is `size: 26` (13pt, bold) followed by a 9pt gray subline, then a horizontal rule. Looks fine. **But:** when `profile?.clinic_name` is empty (likely common until the user fills Settings), the entire letterhead block is skipped and the document opens with a centered title only. There's no fallback — no "Functional Capacity Assessment" with a default branding line. So a fresh-account export looks barer than a paid-account export. Add a fallback `subline` like "Drafted with TheraNotes AI · clinician review required" so the document never feels naked.

### NEW-15 — DOCX `HeadingLevel.HEADING_2` for section titles, then `HeadingLevel.HEADING_3` for sub-headings inside the markdown (P2, 5 min)

`lib/export/docx.ts:91, 229`. Section titles are H2 (good). Sub-headings (markdown `## Foo` inside content) are mapped to **H3** in `renderBlocks`, but the markdown `### Foo` is mapped to **H4**. Word's default H4 is small italic by default — readers will see the sub-sub-headings shrink dramatically. Consider mapping markdown `##` → H3, `###` → also H3 with a `before: 220` spacing tweak, or H4 with explicit override `run: { bold: true, size: 22 }`.

### NEW-16 — DOCX paragraph spacing is 120 twips after every paragraph; that's tight for a 14pt body (P2, 2 min)

`lib/export/docx.ts:236-238`. 120 twips ≈ 6pt. For a clinical document at 11pt body (size 22 = 11pt), most house styles use 8-10pt after. Bump to `after: 160` for more breathing room. Trivial change, big legibility win.

### NEW-17 — Inline `style={...}` on workspace topbar status text (P2, 5 min)

`components/workspace/workspace-layout.tsx:354-362`:

```jsx
<span style={{ color: 'var(--tn-muted-3)', marginLeft: 6, fontSize: 12 }}>
  {report.status === 'ready' ? 'Ready' : 'Draft'}
  {participant?.reportDate ? ` · ${participant.reportDate}` : ''}
</span>
```

Inline-styled `color`/`marginLeft`/`fontSize` instead of a class. Same pattern at lines 587-600 on `app/generate/page.tsx` (the success banner) and lines 605-635 (the floating footer). Each inline-styled block reintroduces the "two design systems" feeling because they don't share rules with `.tn-*`. Extract to CSS classes.

### NEW-18 — Progress screen still says "Generating Part C — Mental Health & Behavioural Health" (P2, 5 min)

`components/generate/progress-screen.tsx:38-48`. Day-1 review item — title and section list duplicate the same text. No ETA. The Sparkles icon (line 39) is also one of the unfixed Sparkles uses (NEW-2 entry).

### NEW-19 — Workspace footer "Saved" with no `data-error="true"` state (P2, 10 min)

`components/workspace/workspace-footer.tsx:21-24`. Renders "Saved" green or "Saving…" gray, never red. If a save fails (RLS, network, conflict), the user keeps seeing "Saved" — the same trust-killer pattern from Day 1, recurring.

### NEW-20 — Refine panel hardcodes -140 / -190 / -52 positioning offsets (P2, 5 min)

`editor-toolbar.tsx:41` and `refine-panel.tsx:28-35`. If the toolbar reflows or fonts change, breaks. Use `transform: translate(-50%, -100%)` from a centered anchor.

### NEW-21 — Status badges on report cards still use raw Tailwind palette (P1, 5 min)

`components/reports/report-card.tsx:9-26`:

```js
draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
generating: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
ready: 'bg-green-500/10 text-green-500 border-green-500/20'
failed: 'bg-red-500/10 text-red-500 border-red-500/20'
```

The Workspace severity flags use `var(--tn-warn-bg)`, `var(--tn-crit-bg)`, etc. Two color systems for "warning" and "error" status. The generating "purple" doesn't appear anywhere else in the app — it's a fifth color introduced just for this badge.

Fix: map `draft` → `tn-warn-*`, `generating` → `tn-sugg-*`, `ready` → `tn-ok-*`, `failed` → `tn-crit-*`.

### NEW-22 — Stethoscope brand mark is consistent but undersized in the topbar (P3, 1 min)

`components/layout/topbar.tsx:21` Stethoscope at 16px. `.tn-brand-mark` is a 22x22px square (globals.css:216-223) with no background fill — so the icon floats with no visual weight. The login version (`tn-auth-brand-mark`) gets a 26x26 rounded-square background of `var(--tn-accent)` and a white icon. **The topbar should match.** Right now the brand reads bold on login and timid in the topbar. 30-second fix.

### NEW-23 — `<details>` collapse animation (still missing) creates a jarring snap (P2, requires Accordion swap)

Day-1 item #5. Still snaps closed because `<details>` doesn't animate height. The chevron animates (`transition: transform 120ms`) but the content slot vanishes instantly. Real fix is shadcn `Accordion`. ~60-line refactor for 5 sections.

### NEW-24 — Dropdown menu's `DropdownMenuLabel` uses inline classNames (P3, 2 min)

`components/layout/user-menu.tsx:50-53`. `className="flex items-center gap-2 font-normal"` then `<User size={14} />` then `<span className="text-xs">`. No `tn-*` styling. The dropdown content matches shadcn defaults — fine, but inconsistent with the rest of the topbar's `tn-*` design language.

### NEW-25 — `text-align: justify` still active on `.report-document p` (P2, 1 min)

`globals.css:916-919`. Day-1 item #15. Justified text on web with no hyphenation creates rivers. Drop it.

### NEW-26 — Two H1 styles for "Functional Capacity Assessment" — `.report-document-header h1` is `system-ui` 22px / 700, while `.tn-doc h1` is `var(--font-sans)` 28px / 600 (P1, 5 min)

`globals.css:868-876` vs `globals.css:1316-1323`. Same heading rendered two ways across two screens. Merge.

### NEW-27 — Plate table renders without a `thead` distinction (P2, 15 min)

`components/workspace/plate-elements.tsx:18-24` renders `<table><tbody>{children}</tbody></table>` — every row goes into `<tbody>`. The CSS at `globals.css:1374-1390` styles `.tn-doc thead th` differently from `.tn-doc tbody td` (gray fill, bolder, smaller font). Without a `<thead>`, the first row of each table renders identically to body rows. The `parseMarkdownTable` in `lib/editor/report-to-plate.ts:44-53` doesn't tag the first row as a header.

Two fixes:
- (cleaner) Add `isHeader: true` data on the first `tr`, switch element to render `<thead>` for that row.
- (CSS only) `.tn-doc table tr:first-child td { background: #F9FAFB; font-weight: 600; }`.

### NEW-28 — `globals.css:1` still imports Inter from Google Fonts despite Geist being the loaded font (P3, 1 min)

`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Urbanist:wght@500;600;700&display=swap');`. Inter is referenced only in fallback chains. Drop it from the import — Urbanist is the only one that needs the network round trip; Geist is loaded by `next/font`.

### NEW-29 — Workspace progress bar fill is **green** (P2, 1 min)

`globals.css:1079-1083` `.tn-side-progress-fill { background: var(--tn-ok); }`. Day-1 review noted this. Progress isn't success. Should be `var(--tn-ink)` until 100%.

### NEW-30 — Sidebar still has no separation from canvas (P2, 1 min)

`globals.css:1018-1027` sidebar `background: var(--tn-bg)` (white) on a white canvas, separated by 1px. Day-1 noted this. Set `background: #FAFAFA` for 1.5% lift.

---

## 3. Day-2/3/4 visual quality — surface-by-surface

### Login screen (Day 1)

**Good:** two-column layout, opinionated headline + bullets, real Supabase API call, friendly error mapping. Brand mark in colored tile is a real upgrade.

**Wrong:** submit button uses wrong blue (NEW-1); brand-mark fallback color (NEW-2); hard `<br/>` in headline (NEW-3); `-10px` margin crowds subline (NEW-4); no show-password toggle (NEW-5).

**Polish:** at 1280px the form looks small (max-width 380px). Consider 420px. Mobile (375px) ✓. Tablet 768-879px gets the single-column form on a sea of white because aside hides at 880px — move breakpoint to 760px or accept it.

### Profile form (Day 2)

**Good:** two `<fieldset>` groupings, auto-fills email, save→success badge→idle reset (2.5s), Loader2 consistent.

**Wrong:** three different micro-cap label patterns (NEW-13); `text-emerald-700` / `text-amber-700` for save state instead of `tn-ok` / `tn-warn` tokens (two more colors); `legend` unstyled and bleeds into next label; no "discard changes"; negative-margin sub-paragraph pattern at lines 125, 175 (same anti-pattern as NEW-4).

### Search/filter row on Reports (Day 4)

**Good:** search input with inline lucide icon at left-pad 9 (matches Linear/Notion), Base UI Select for status, "Load more" pagination, stale-30min auto-flagged as failed and bulk-deletable via "Clear N failed" chip, "+ New report" always visible. Inputs are matched height (36px).

**Wrong:** "+ New report" uses raw shadcn primary blue (NEW-8); empty filter state no clear CTA (NEW-9); muted loading text not skeleton (NEW-10). Select popup uses `data-open:animate-in fade-in-0` — verify in browser, no matching `@keyframes fade-in-0` in globals.css. Search is client-side only over the loaded page (acknowledged in code).

### DOCX (Day 3)

**Good:** real markdown parsing (headings, lists, tables, bold/italic — no more `* item` literals). Header with right-aligned title; Footer with disclaimer + `Page X of Y`. Profile-driven letterhead. Single export pipeline (deduped). Tables get a shaded header row.

**Wrong:**
- No fallback letterhead when profile is empty (NEW-14).
- H4 for sub-sub-headings shrinks too aggressively (NEW-15).
- Paragraph spacing tight at 6pt-after (NEW-16).
- Section H2's horizontal rule sits too close to the heading text. Add `after: 100, border: { bottom: { ..., space: 1 } }`.
- DOCX file name is `FCA-${name}.docx` from workspace but `FCA-Report.docx` from `ExportButton` (export-button.tsx:33). Inconsistent.

### Print preview from /reports/<id> (Day 3)

**Good:** comprehensive `@media print` block at `globals.css:1771-1849` hides all chrome, resets workspace grid, A4 with 18/16mm margins, page-break rules on H1-H4 + tables, forces black-on-white. Margin dots hidden. Both `.tn-doc` and `.report-document` covered.

**Wrong:**
- `.tn-doc h2:first-child` override (line 1835) probably doesn't match in practice — `.tn-paper-inner` wraps the editor so the H2 isn't a true `:first-child`. Switch to `:first-of-type` or add a class. Symptom would be a blank first page.
- No print-time page header or page numbers. DOCX has them; printed PDF doesn't. Add `@page { @top-center { content: "FCA — " attr(data-name); } @bottom-right { content: counter(page); } }`.

### Reports cards (Day 4)

**What's good:**
- Card hover (`hover:border-primary/50`) — subtle but noticeable.
- Delete confirmation: hover reveals a trash icon, click → "Delete?" pill, click again → deletes. Auto-cancels after 3s. No modal needed. Smart.
- Status badge + section count + flag count + relative timestamp packed into a 2-row card. Information-dense without clutter.
- `min-h` not set, so cards may be different heights when participant names wrap. Not a regression but a missed Day-1 polish item.

**What's wrong:**
- Status colors are raw Tailwind, not severity tokens (NEW-21).
- `hover:border-primary/50` introduces a fifth blue (oklch primary at 50% alpha).
- Trash icon on hover is `tn-card-delete` (good styling). The "Delete?" confirm uses `tn-card-delete-confirm` which is `background: var(--tn-crit)` red — that's a sixth red sometimes coexisting on the page if a "failed" badge is also red.

---

## 4. Brand cohesion grade

### Grade: C+

The Day-1 review's grade was D-/F (the "spreadsheet mockup" descriptor). It's now C+ — a "competent internal app." Here's why it's not yet B:

**The good (deserves credit):**
- Stethoscope mark replaces Sparkles in 4/8 places; it's now consistent in topbar, sidebar, login. Real semantic icon.
- Login screen has a real two-column composition. Marketing aside, opinionated headline, professional bullet list. Massive jump from "stock Supabase widget."
- Profile + Clinic settings exist. Auto-fills assessor fields on `/generate` so the user doesn't re-type.
- Autosave shipped. "Draft restored" banner is a thoughtful addition that reuses the existing `tn-banner` style.
- DOCX is a real document with letterhead, page numbers, footer disclaimer, real table cells.
- Print CSS hides chrome.
- Workspace TOC dead buttons removed.
- Plural grammar fixed.
- Reports list has search, status filter, pagination, "+ New", auto-cleanup of stale jobs.
- Plate editor renders tables properly (TableElement bound).

**The bad (capping the grade):**
- **Three primary blues** still coexist on screen at the same time (oklch shadcn primary, tn-accent hsl, brand-blue hex). Same screen, three blues, three button shapes. Until this is resolved the app reads as "two design systems blended awkwardly."
- **Generate button is still a 36px chat-icon arrow** for the marquee action. This was the one Day-1 P0 that didn't ship and it's the most visible affordance miss in the whole app.
- **Two report stylesheets** still produce visibly different documents in adjacent screens. `.report-document` (post-generate) vs `.tn-doc` (workspace). Same content, different fonts/sizes/heading rules.
- **Native `<input type="date">`** still owns the picker UI on 4 fields on the most-touched screen. OS chrome leaks.
- **Native `<details>`** still snaps with no animation. Half-shipped.
- **Focus rings** are inconsistent or absent. The Generate identity inputs are unfocusable to the eye. Accessibility regression.
- **Default favicon** still ships in the HTML head.
- **5 Sparkles uses** remain — including the "brand" surface in `progress-screen.tsx`.
- **3 dead-end controls** on Generate (Attach/Dictate/Template) still mock affordances.
- **Empty / loading states** are still gray text, not skeletons or illustrations. Reports list is the worst offender.

### Would this still feel like a "spreadsheet mockup" to the user?

**No.** The collapsibles, the structured intake, the validation card, the Plate editor, the workspace breadcrumb — these all read as a real app. The login screen alone is a 3x perception jump. The progress screen is genuinely well-crafted.

**But it now feels like a half-finished refactor.** The user can see two design systems alive at once: the bespoke `tn-*` (warm, confident, opinionated, ink-on-paper) and the shadcn defaults (clean, generic, oklch blue). When they're 6 inches apart on the same card (Generate's intake using `tn-intake-input` with a shadcn Button send arrow next to it; reports list with shadcn primary "+ New" next to `tn-card-delete` red ink), the dissonance is loud.

The quickest path from C+ to B+:
1. Pick `tn-btn-primary` ink-pill OR shadcn primary blue. Override the other in 8 files. (~1h)
2. Replace the Generate send icon with a labeled `tn-btn-primary` pill. (~10 min)
3. Delete `.report-document` styles, alias `formatted-report.tsx` to render inside `.tn-doc`. (~30 min)
4. Replace `<input type="date">` with shadcn DatePicker on 4 generate fields. (~1h)
5. Swap the favicon to a Stethoscope-on-accent PNG. (~5 min)
6. Replace the 5 remaining Sparkles uses. (~10 min)
7. Add focus ring on `tn-id-input` and `tn-intake-input`. (~5 min)
8. Delete or "soon"-badge the 3 dead-end Generate tools. (~5 min)
9. Add a Reports list skeleton. (~20 min)

Total: ~3.5 hours. After that the app is internally consistent and easily reads as an actual product.

### The path to A-

Beyond the above:
- Custom brand mark (a typographic monogram) replacing the Stethoscope. Stethoscope is semantically right but lucide-generic.
- Tagline used everywhere, not only on login.
- One signature accent color used sparingly so it means something. Right now blue is overused (links, buttons, accents, hover, focus, dots) and signifies nothing.
- Real shadcn `Accordion` swap so collapsible intake animates.
- Empty-state illustrations (even simple ones).
- `Sonner` toaster wired to delete/save/export.
- Keyboard-shortcut sheet (`?`).
- `text-wrap: balance` on headlines.
- `font-feature-settings: "tnum"` on numeric columns.

---

## Closing note

The team executed Day-1 well — most P0s landed, the right architectural moves were made (real autosave hook, profile model, single DOCX pipeline). The remaining work is concentrated in two places: **finishing the design-system unification (one blue, one button, one report style)** and **shipping the Day-1 items that were skipped (labeled Generate button, DOCX favicon, focus rings, dead-end purge)**.

The author wasn't defensive about Round 1 and the result shows. Round 2 finish line is closer than it looks — most remaining items are 5- to 30-minute mechanical changes against very specific file:line citations. None require redesign.
