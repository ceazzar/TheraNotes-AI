# Visual Craft Review - Round 3

| Field | Value |
|---|---|
| Reviewer | Senior Product Designer (Linear/Notion pedigree) |
| Date | 2026-05-10 |
| Build | Production deploy at theranotes.com.au, sha 89a24bc on main |
| Method | Live PROD via headless browse + source reading |
| Cost guard | Generate / Run NDIS Review / Refine / Apply fix all DO-NOT-CLICK |
| Round | 3 (verification mode) |

## Vote

**no**

Round-2 fix REG-1 introduced a new shadcn `<Progress />` in the workspace sidebar that paints oklch primary blue, undoing the brand-cohesion progress.

## Suspected regressions from round 2

| ID | Title | Severity | File:line OR screenshot | Reason it's a regression |
|---|---|---|---|---|
| VC-R-1 | Workspace draft-progress bar replaced with shadcn `<Progress />` (oklch primary blue), orphaning the bespoke `.tn-side-progress-fill` CSS | P0 | `components/workspace/toc-sidebar.tsx:57` | Round-2 work touched `toc-sidebar.tsx`. The diff replaced the bespoke `<div class="tn-side-progress-bar"><div class="tn-side-progress-fill"/></div>` markup with `<Progress value={progressPct} className="h-[3px]" />`. The shadcn `Progress` paints `bg-primary` (oklch ~`lab(44.7106 22.2367 -75.7041)`) on track and indicator. Round-2 visual-craft explicitly flagged the previous green fill as needing change to `var(--tn-ink)` (NEW-29), but the replacement went the other direction: a **new fourth blue inside the workspace sidebar**, exactly the unification problem the round was trying to solve. The orphaned `.tn-side-progress-bar` / `.tn-side-progress-fill` rules at `app/globals.css:1080-1090` are now dead code. (Verified live: queried the rendered DOM, the element class chain is `relative w-full overflow-hidden rounded-full bg-primary/20 h-[3px]` → `bg-primary` indicator.) |
| VC-R-2 | `.tn-saved-dot` CSS targets `data-saving="true"` but the JSX writes `data-status={saveStatus}` — the dot never animates and never changes colour for save/error states | P1 | `app/globals.css:1772` vs `components/workspace/workspace-footer.tsx:38` | Round-2 NEW-8 refactored `useAutoSave` to expose `'idle' \| 'saving' \| 'saved' \| 'error'`. The footer now renders `<span class="tn-saved" data-status={saveStatus}>` with a pulse-dot. But the existing CSS pulse rule still selects `[data-saving="true"]` (legacy attribute name). So the pulse never fires, AND there is no `[data-status="error"]` style, so the dot stays the same `--tn-ok` green when saving is genuinely failing in error state. Net: the dot lies about state. The error-button branch (lines 26-36) is fine, but the green-dot path covers states `idle / saving / saved` and visually compresses three states into one. Caused by a round-2 fix not following through on the CSS half of the contract. |
| VC-R-3 | Generate button labeled (NEW-3 partial fix) but still paints `bg-primary` oklch blue, not `var(--tn-accent)` — the labeled-pill brief shipped without the colour token brief | P0 | `app/generate/page.tsx:1112`, `app/globals.css` (no `.tn-generate-btn` rule exists) | Round-2 NEW-3 promised "labeled pill using existing accent token, not shadcn primary". Round-3 finds: button is now labeled ("Generate N sections") with `<ArrowUp size={14} />` after the text — but the new `tn-generate-btn` className has zero CSS rules. The fallback is shadcn `bg-primary text-primary-foreground`, which on prod resolves to `lab(44.7106 22.2367 -75.7041)` ≈ `#3457D8`. Login submit (verified earlier) renders `rgb(45, 86, 210)` ≈ `#2D56D2`. Same screen, different blue. The NEW-3 fix was logically split into "label" (shipped) and "colour" (silent miss). |

## TL;DR

The round-2 batch landed the easy half of the visual-craft work cleanly: login submit now paints the right blue, login brand-mark is unified, the dead-end Attach/Dictate/Template buttons are gone, the Generate button is labeled, the topbar nav has a real `:focus-visible` ring (verified live with rgb 45,86,210 outline), and the print disclaimer is back via a `::after` mechanism that's actually cleaner than the punch-list-suggested unhide. Login residency claim was honestly rewritten. NEW-7 (workspace 404 keeps Topbar) confirmed live - the Report-not-found screen now sits below a full Topbar with working nav.

But three new regressions appeared, two of them caused by the round-2 fixes themselves. The most damaging is **VC-R-1**: a refactor of `toc-sidebar.tsx` swapped the bespoke 1-px-tall ink/green progress bar for a shadcn `<Progress />` component that paints the oklch primary blue inside the workspace sidebar - exactly the brand-cohesion problem Round 2 was trying to fix on the Generate page. So while we removed one shadcn-blue intrusion (login submit), we added a new one (sidebar progress). Net: zero progress on "one blue", and the sidebar has been promoted from "bespoke ink/paper" to "shadcn-flavoured" without anyone noticing.

Round-3 also exposes a cosmetic regression in **VC-R-2**: the autosave footer dot CSS rule was never updated when the hook moved to a `data-status` enum, so the dot is permanently `--tn-ok` green regardless of `idle / saving / saved / error` state. It's a small gap (the error path uses a separate `<button>`) but it means the "Saving…" pulse animation that was working before round 2 is now silent. **VC-R-3** is the cousin of NEW-3: the Generate button got its label but not its colour token - the new `tn-generate-btn` class has no CSS rules, so shadcn primary wins by default. Net brand grade: **C+ unchanged** from round 2. Login screen and 404-keeps-topbar are both real upgrades; the workspace sidebar is now slightly worse.

## Verification of round-2 fixes (still works on prod?)

| Round-2 ID | What I checked | File:line | Result |
|---|---|---|---|
| NEW-1 (login submit blue) | Computed `background-color` of `.tn-auth-submit` on prod | `app/globals.css:2186-2202`, `app/login/page.tsx:143` | **PASS** — `rgb(45, 86, 210)` (= `var(--tn-accent)`). Hover override and `!important` are both in place. |
| NEW-2 (login brand-mark / aside bullets unified blue) | Computed `background-color` on `.tn-auth-brand-mark` and `.tn-auth-brand-mark-md` | `app/globals.css` brand-mark rules + `app/login/page.tsx:81` | **PASS** — both render `rgb(45, 86, 210)`. |
| NEW-3 (Generate labeled pill, accent not primary) | DOM inspection of the Generate button on `/generate` (cost-guard: did not click) | `app/generate/page.tsx:1111-1120` | **PARTIAL** — labeled (`Generate N sections`) ✓; but the `tn-generate-btn` class has no CSS rules, so it inherits shadcn `bg-primary` (oklch `lab(44.7106 22.2367 -75.7041)`), NOT `var(--tn-accent)`. See VC-R-3 above. |
| NEW-4 (delete Attach/Dictate/Template) | Snapshot tree on `/generate` showed no orphan tools between intake groups and Generate; the source comment confirms removal | `app/generate/page.tsx:1105-1110` | **PASS** — three dead buttons gone, replaced with an empty `<div className="tn-gen-tools" />` placeholder. |
| NEW-6 (`tn-nav-item:focus-visible`) | Tabbed to a topbar link, queried `getComputedStyle(activeElement)` and `matches(':focus-visible')` | `app/globals.css:248-251` | **PASS** — `outline: 2px solid rgb(45, 86, 210)`, `outline-offset: 2px`. Verified live with `:focus-visible` matching `true`. |
| REG-3 (print CSS keeps disclaimer) | Rendered PDF via `browse pdf` on the workspace, read `globals.css` print block | `app/globals.css:1875-1893` | **PASS (different mechanism)** — `.tn-disclaimer` is still in the print-hidden list (line 1825), but the fix instead injects an `.tn-doc::after` / `.report-document::after` pseudo with `content: 'AI-drafted. Clinician review required before submission.'`, formatted as a 9pt italic block with a top border. **Caveat:** because it's `::after` of the document root, it appears only at the end of the printed run. If the clinician prints "Pages 1-3" of an 8-page report, the disclaimer is on page 8 and they don't see it. Worth flagging for next round but not a regression. |
| Cherry-pick (backslash regex) | grep + read of `report-to-plate.ts` | `lib/editor/report-to-plate.ts:54, 147` | **PASS** — both call sites use `.replace(/\\+(?=[[\]])/g, '')`. |
| Cherry-pick (ghost code-block filter) | Read deserialize-then-filter logic on lines 148-158 | `lib/editor/report-to-plate.ts:140-160` | **PASS** — empty `code_block` nodes are filtered out, comment cites edad007 issue #2. |
| Cherry-pick (`[data-slate-editor]` typography defense) | Computed `font-family`, `font-size`, `line-height` on the editor element on prod after entering a Ready report | `app/globals.css:1322-1340` | **PASS** — runtime read returned `Georgia, "Times New Roman", Times, serif`, `15px`, `27px` line-height (= 1.8). The defensive selector wins against Plate's defaults. |
| REG-2 bonus (login residency claim, qa-edge-cases item also flagged by visual-craft) | Read `app/login/page.tsx`, scraped `tn-auth-bullets` | `app/login/page.tsx:91` | **PASS** — bullet now reads "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." Honest. |

**Round-2 visual-craft scorecard: 7/9 PASS, 1 PARTIAL (NEW-3 colour half), 0 FAIL, plus 2 new regressions caused by the round (VC-R-1, VC-R-2).**

## Walk-through

### 1. Login screen (cold)

Set viewport to 1440x900 and hit `/login` cold. The page now reads as a real product:

- Two-column layout, marketing aside on the left with stethoscope-on-blue brand mark, opinionated headline, three-bullet value prop. Sign-in card on the right with a single colour blue submit button.
- I queried `getComputedStyle('.tn-auth-submit')` and got `rgb(45, 86, 210)` background, `rgb(255, 255, 255)` text, `10px` border-radius, `32px` height, font-weight 500. So the submit button is now using the same blue as the brand mark and the bullet dots. NEW-1 verified.
- I queried both `.tn-auth-brand-mark` and `.tn-auth-brand-mark-md`; both returned `rgb(45, 86, 210)`. NEW-2 verified.
- The tagline copy in the aside is real and brand-shaped: "NDIS-grade Functional Capacity Assessments,\<br\>drafted in minutes." with a paragraph subline and three bullets. The `<br/>` issue (NEW-3 from round 2) is **still in source** at `app/login/page.tsx:82`. At 1440x900 it doesn't visibly orphan because the line-break is naturally where the `<br/>` is. At narrower viewports the hard break would force three lines where two would suffice. P2.
- "Internal clinician access only." subline still uses `margin: -10px 0 0` (NEW-4 from round 2 not addressed). On screen this means the subline crowds the title baseline. Tiny but visible.
- Submit-button height is 32px (h-8 from shadcn default). Round-2 recommended 40px for a marquee CTA; the colour landed but the height didn't. The tile feels narrow against the surrounding 36px+ form fields. P2.

Verdict on login: best surface in the app. The two carry-over P2s are nits; the main brief is solved.

### 2. Sign in to /generate

Filled credentials, clicked submit, landed at `/generate`. A "Draft restored - Picked up your in-progress intake from just now." banner painted - the `useFormDraft` round-2 work is doing its job.

The Generate page composition is the round-2 vision realised:
- Identity row (Participant name, NDIS number, Assessor) inline.
- Five collapsible intake groups: Client Details, Assessor & Assessment, WHODAS, Sensory Profile, NDIS Goals. Each shows a status hint to the right ("Add DOB to populate Header", "⏸ Part D will skip", etc.). The hint copy is good.
- Clinical-notes textarea with a placeholder line.
- Footer with the Generate button.

The Attach / Dictate / Template buttons that round 2 called out as P1 dead-ends are **gone** (NEW-4 verified - both via snapshot tree and source confirmation). A leftover empty `<div className="tn-gen-tools" />` exists at line 1110; harmless but should be removed when the layout settles.

The Generate button itself: I did NOT click (cost guard). Inspected via DOM:
- Text: "Generate {count} {section/sections}". With count=0 and the word "section" pluralised to "sections", it renders as `Generate  sections` (note the double space). Cosmetic, fix at line 1118.
- Class: `... tn-generate-btn`. The component is shadcn `<Button>` so by default it lands on `bg-primary text-primary-foreground`, h-8, px-2.5, rounded-lg. There is **no** matching `.tn-generate-btn` rule in `globals.css` to override - the round-2 NEW-3 fix only addressed the structural change (icon-only → labeled pill), not the colour token unification.
- Result: the button is the oklch primary blue (`lab(44.7106 22.2367 -75.7041)`), not the login screen's `var(--tn-accent)` (`rgb(45, 86, 210)`). Two blues, two surfaces, same session.

This is VC-R-3 - the half-shipped colour fix.

### 3. Reports list

Clicked Reports nav. Land on `/reports`. The list looks the same as round 2: search input, status filter, 24-card pagination, "Load more". `+ New report` button still uses shadcn primary blue (NEW-8 from round 2 unaddressed). Status badges still raw Tailwind (NEW-21 from round 2 unaddressed): bg-yellow/text-yellow for Draft, bg-purple/text-purple for Generating, bg-green for Ready, bg-red for Failed. Purple is still the only purple in the app.

### 4. Workspace (entered a Ready report)

Clicked the first Ready report tile. Landed at `/reports/<uuid>`. Topbar present, Reports pill active, Sections sidebar on the left, paper canvas on the right with the report header table, footer disclaimer.

This is where the **regression** lives. I expanded my screenshot of the workspace and read the markup of the "Draft progress 100%" widget at the top of the sidebar. The CSS rule at `app/globals.css:1080-1090` is:

```css
.tn-side-progress-bar { height: 3px; background: var(--tn-line); ... }
.tn-side-progress-fill { height: 100%; background: var(--tn-ok); ... }
```

But the rendered DOM is:

```html
<div class="tn-side-progress">
  <div class="tn-side-progress-lbl">...</div>
  <div data-slot="progress" role="progressbar"
       class="relative w-full overflow-hidden rounded-full bg-primary/20 h-[3px]">
    <div data-slot="progress-indicator" class="h-full bg-primary ..." style="width: 100%;"></div>
  </div>
</div>
```

So a round-2 commit (`fee71f0 feat: Phase A + Phase B + UX overhaul + Round-2 fixes`) replaced the bespoke `<div class="tn-side-progress-bar"><div class="tn-side-progress-fill"/></div>` markup with `<Progress value={progressPct} className="h-[3px]" />`. The shadcn `Progress` paints `bg-primary/20` track and `bg-primary` indicator. On prod that's an oklch blue. Net effect:

- The bespoke green fill (`var(--tn-ok)`) is gone.
- The replacement is a **new fourth blue** inside the workspace sidebar.
- Round-2 visual-craft NEW-29 said "fix the progress fill from green to ink black until 100%." Instead it became shadcn primary blue, which is the *opposite* of what the brand-cohesion thesis recommended.
- Two CSS rules (`.tn-side-progress-bar`, `.tn-side-progress-fill`) are now dead code.

This is the headline of round 3.

I also looked at the workspace footer:
- Save status renders as "Idle" with a green dot. Idle when the user hasn't typed yet. Word "Idle" is unusual for clinical UI - "All saved" or `""` would be cleaner.
- "AI-drafted. Clinician review required before submission." disclaimer is visible on screen at the centre of the footer.
- "Print" link, "Run NDIS review" outlined button (cost guard - did not click), "Download DOCX" filled shadcn primary button.

The footer composition is also visually competent. But the **Saved/Idle/Saving dot** has VC-R-2 wired wrong: the CSS pulse rule at `globals.css:1772` selects `[data-saving="true"]`, but the component writes `[data-status]`. So the pulse animation that the previous CSS implied is silent in production, and the dot colour stays `--tn-ok` green for idle / saving / saved. Only the explicit `error` branch (lines 26-36 in the component) renders correctly because it's a separate `<button>` element with its own visible iconography.

### 5. Workspace 404

Visited `/reports/00000000-0000-0000-0000-000000000000` directly. The page now renders **with the Topbar present** and a centred "Report not found or you don't have access. [Back to Reports]" card. NEW-7 from round 2 verified - the user is no longer stranded without nav. Topbar shows "Generate / Reports / Settings" and the user-menu avatar.

### 6. Settings

Hit `/settings`. Profile + Clinic + Exemplar upload + Exemplar list. Composition is functional but craft-imperfect:
- "Save changes" is shadcn primary blue (yet another oklch blue under the same login that uses `--tn-accent`).
- Browse Files button is shadcn ghost outline.
- Exemplar upload zone is still raw `border-2 border-dashed border-border p-8` (NEW-11 round-2 unaddressed). No `tn-*` token, no brand identity.
- Exemplar list rows are generic shadcn (NEW-12 round-2 unaddressed): no hover state, no visible interaction beyond the trash icon.
- 23 exemplars listed, each with red trash icon on the right. Trash icons use severity tokens.
- All form labels use `text-xs font-medium uppercase tracking-wide text-muted-foreground` (NEW-13 round-2 unaddressed): the fourth label style coexisting with `tn-id-label`, `tn-intake-lbl`, `tn-auth-lbl`. Standardisation deferred.

### 7. Editor toolbar / refine panel

Did not interact (cost guard). Read source. `editor-toolbar.tsx:240` still renders `<Sparkles size={13} /> Refine`. `flag-popover.tsx:98` still renders `<Sparkles size={11} /> Apply fix` for the recommendation-accept button (Sparkles is wrong for "accept", as round-2 already noted). `progress-screen.tsx:39` still renders Sparkles for the "Generating" title. Round-2 NEW-2 of "5 Sparkles uses remain" → still 5. P2-P3 each but together they keep the "AI-cliché" feel that round 2 graded as a brand-cohesion drag.

## New findings

### VC-1 — Generate button reads `Generate  sections` (double space, no count) when `sectionsThatWillGenerate` is 0 (P2, 2 min)

`app/generate/page.tsx:1118`:
```jsx
Generate {sectionsThatWillGenerate || ''} {sectionsThatWillGenerate === 1 ? 'section' : 'sections'}
```
When the count is 0, `0 || ''` evaluates to `''`, so the rendered text is `Generate ` + ` ` + `sections` = `"Generate  sections"` with a visible double space. Looks like a typo to a reader. Either render `Generate sections` (drop the count when 0) or `Generate 0 sections` (keep the count, drop the falsy fallback).

Fix:
```jsx
{sectionsThatWillGenerate > 0
  ? `Generate ${sectionsThatWillGenerate} ${sectionsThatWillGenerate === 1 ? 'section' : 'sections'}`
  : 'Generate sections'}
```

### VC-2 — Empty `<div className="tn-gen-tools" />` placeholder remains after the dead-button purge (P3, 1 min)

`app/generate/page.tsx:1110`. The wrapper exists for layout reasons (it's the left side of `tn-gen-footer` flex with the Generate button on the right), but an empty named div pollutes Inspector views and CSS rules that target `.tn-gen-tools` will paint padding on a zero-content element. Either delete the empty div and let the Generate button right-align via `margin-left: auto`, or replace it with an inert `<span aria-hidden />` if a flex spacer is needed.

### VC-3 — "Idle" save state renders as muted-grey "Idle" with a green dot (P2, 5 min)

`components/workspace/workspace-footer.tsx:40`. The hook now exposes `idle / saving / saved / error`. The `idle` state is shown as the literal word "Idle" - clinical-UI-unusual phrasing for "no save activity yet". Either render `''` for idle (the dot alone signals state), or use clearer copy like "Up to date" / "All saved". Preference: empty string when idle (the disclaimer text right next to it is what the eye lands on, not the save chip).

Note: this is downstream of VC-R-2 - if the dot ever animates correctly for `saving`, the chip word becomes redundant. Fix the dot first, then the copy.

### VC-4 — "Run NDIS review" outline button uses shadcn `variant="outline"` defaults; doesn't share `tn-btn` token (P2, 5 min)

Per the ARIA tree on the workspace, the Run NDIS Review button at the workspace footer is a shadcn outline button. The toc-sidebar's "Review all 0" button (at `components/workspace/toc-sidebar.tsx`) and the workspace "NDIS Review" header button (top-right of the canvas) both render as outline ghost-style. Three outline-button styles coexist with the "Print" ghost button (workspace footer) and the "Browse Files" outline (settings). Consolidate behind `tn-btn tn-btn-secondary` to match the design system.

Cost-guard: did not click any of these buttons.

### VC-5 — Workspace canvas paper has no shadow / lift on a white app background (P3, 2 min)

`app/globals.css:1018-1027` sidebar bg is `var(--tn-bg)` (white). The paper canvas (`tn-paper-inner`) is also white-ish. The two shapes only separate by a 1px border. Round-2 NEW-30 noted this; still unaddressed. Setting the sidebar to `#FAFAFA` (or the canvas frame to `#F7F7F8`) gives 1.5% lift and makes the document feel like a sheet on a desk. 1-line change.

### VC-6 — Status badges on report cards still use raw Tailwind palette including a bespoke `purple-500` for `generating` (P1, 5 min)

`components/reports/report-card.tsx:9-26`. Round-2 NEW-21 unaddressed. The `purple-500` for the `generating` status is the only purple in the app. Map to severity tokens: `draft → tn-warn-*`, `generating → tn-sugg-*`, `ready → tn-ok-*`, `failed → tn-crit-*`. Mechanical change.

### VC-7 — Native `<input type="date">` still owns the picker on `/generate` (P2, requires shadcn DatePicker swap, 1h)

`app/generate/page.tsx:753, 762, 771, 853`. Round-1 and round-2 both flagged this. OS chrome leaks into the most-touched screen. Not a blocker, but distinguishes "internal tool" from "real product".

### VC-8 — Sparkles icon used for "Apply fix" recommendation-accept (P2, 2 min)

`components/workspace/flag-popover.tsx:98`. Sparkles is the AI-magic icon; "Apply fix" is "accept this recommendation". Wrong semantic. Replace with `Check` (commit) or `Wand2` (transform) - I'd choose Check.

### VC-9 — Settings exemplar upload zone is still `border-2 border-dashed border-border p-8` raw Tailwind (P2, 10 min)

`components/settings/exemplar-upload.tsx:71`. Round-1 and round-2 noted it. Replace the dashed border with a `tn-id-card`-tier surface using `var(--tn-line-soft)` 1.5px dashed and a hover state.

### VC-10 — Settings exemplar list rows have no `tn-*` styling, no hover, no row interaction (P3, 5 min)

`components/settings/exemplar-list.tsx`. Same as round 2. With 23 rows visible (one per uploaded FCA), the list looks like a JSON dump rather than a designed library. Add a hover state and a `tn-row` class.

### VC-11 — `app/globals.css:1` still imports Inter from Google Fonts; only Urbanist is used (P3, 1 min)

Bundle bloat / unnecessary network round-trip. Round-2 NEW-28 unaddressed.

### VC-12 — Default favicon still ships in the HTML head (P3, 5 min)

Round-2 round-1 verification item: still default Next.js generic glyph, no Stethoscope mark. Visible in browser tabs and bookmarks. PNG of stethoscope on `var(--tn-accent)` would solve.

### VC-13 — Two report stylesheets (`.report-document` vs `.tn-doc`) still produce visibly different documents (P1, 30 min)

ESC-1 from round 2. Same content, two looks. Pick one. Not a regression but the highest-impact unfixed item.

### VC-14 — `.tn-saved-dot` pulse animation never fires in production (P1, 2 min)

Already covered in VC-R-2; restating here so it appears in the new-findings index. CSS at `app/globals.css:1772` selects `[data-saving="true"]` but JSX writes `[data-status="saving"]`. Update CSS:

```css
.tn-saved[data-status="saving"] .tn-saved-dot {
  background: var(--tn-muted-3);
  animation: tn-pulse-dot 1s infinite;
}
.tn-saved[data-status="error"] .tn-saved-dot {
  background: var(--tn-crit);
}
```

### VC-15 — Print disclaimer (`.tn-doc::after`) only appears at the very end of the printed document (P2, design call)

`app/globals.css:1882-1893`. The pseudo-element appends the disclaimer after all sections. If the user prints a single section ("Pages 1-2 of 8"), the disclaimer is on page 8 and they don't see it. Two options: (a) repeat in `@page { @bottom-center { content: "..." } }` so every page has it; (b) split into a top-of-document banner. (a) is more honest because every printed page carries the caveat. Worth a clinician-check.

## What's good and worth preserving

These are round-2 wins that are still intact on prod and **must not regress in round 4+**:

- **Login two-column screen** with stethoscope brand mark, opinionated headline, real bullets, custom submit button styled by `var(--tn-accent)`. The biggest perception jump in the app.
- **`tn-nav-item:focus-visible` outline** with `var(--tn-accent)` 2px solid. Clean, WCAG-compliant, doesn't conflict with hover state. Verified live with keyboard tab.
- **Workspace 404 keeps Topbar.** The "Report not found" page now sits below working nav.
- **NEW-4 dead-button purge on `/generate`.** Three fewer false affordances on the most-touched screen. Don't reintroduce these as plain `<Button>` elements - if those features ship, gate them with `disabled` + a "Coming soon" label, the way Linear does.
- **Honest residency claim on `/login`.** "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." No false advertising.
- **Print `.tn-doc::after` disclaimer.** Cleaner mechanism than the round-2-suggested unhide. Survives chrome-hiding rules.
- **Editor typography defenses** at `app/globals.css:1322-1340` (`.tn-doc [data-slate-editor]` overrides). Verified live: the editor renders `Georgia 15px / 1.8` exactly as the design intends. Cherry-pick #3 is load-bearing for the "ink on paper" feel.
- **Backslash regex** at `report-to-plate.ts:54, 147` (`\\+(?=[[\]])` strips bracket-escapes from generated content). Cherry-pick #1 verified.
- **Ghost code-block filter** at `report-to-plate.ts:148-158`. Cherry-pick #2 verified - empty code blocks no longer render as confusing boxes in the editor.
- **Generate button label.** The text "Generate N sections" is visible and the action surface no longer looks like a chat send button. Just needs the colour token override (VC-R-3).
- **Login submit and brand-mark colour unification** to `rgb(45, 86, 210)`. Verified live - same blue across the screen.

## Recommended sequence

**Day 1 (today, ~30-45 min total):** the regressions

1. **VC-R-1 (P0, 10 min):** Restore the bespoke progress bar markup in `components/workspace/toc-sidebar.tsx:57`. Replace `<Progress value={progressPct} className="h-[3px]" />` with the original `<div class="tn-side-progress-bar"><div class="tn-side-progress-fill" style={{width: progressPct + '%'}}/></div>`. While there, pick a colour: ink black (`var(--tn-ink)`) until 100%, green (`var(--tn-ok)`) at 100%. Do NOT use the shadcn Progress component for this surface.
2. **VC-R-3 (P0, 5 min):** Add a `.tn-generate-btn` rule to `globals.css` that overrides `bg-primary` with `var(--tn-accent)`, plus a hover, `border-radius: 999px`, `height: 40px`, `padding: 0 18px`. The class is already attached at `app/generate/page.tsx:1112`; only the CSS is missing.
3. **VC-R-2 / VC-14 (P1, 2 min):** Update `globals.css:1772` selector from `[data-saving="true"]` to `[data-status="saving"]`. Add an `[data-status="error"]` rule for the dot.
4. **VC-1 (P2, 2 min):** Fix the double-space in the Generate button label.
5. **VC-3 (P2, 3 min):** Replace "Idle" copy with empty string or "All saved".

**Day 2 (~1h):** brand-cohesion follow-throughs

6. **VC-6 (P1, 5 min):** Map report-card status badges to `tn-*` severity tokens. Removes the bespoke purple.
7. **VC-8 (P2, 2 min):** Replace flag-popover Sparkles with Check.
8. **VC-13 (P1, 30 min):** Pick `.tn-doc` (workspace) as canonical and alias `formatted-report.tsx` to render in `.tn-doc` instead of `.report-document`. Delete the `.report-document` styles. Still the highest-impact unfixed visual item.
9. **VC-9 (P2, 10 min):** Style the exemplar upload zone with `tn-*` tokens.
10. **VC-12 (P3, 5 min):** Stethoscope-on-accent favicon.

**Day 3 (~1h):** polish

11. **VC-7 (P2, 1h):** Shadcn DatePicker swap on the four `<input type="date">` fields on `/generate`.
12. **VC-15 (design call, 15 min):** Move print disclaimer to `@page` bottom-center so every page carries it.
13. **VC-5 (P3, 1 min):** Sidebar background `#FAFAFA` for paper-on-desk lift.
14. **VC-10 (P3, 5 min):** Exemplar-list row hover state with `tn-row` token.
15. **VC-11 (P3, 1 min):** Drop Inter from the Google Fonts import.

After day 1, re-run `/ux-review --round 4` to confirm the regressions are gone and didn't drag anything else down with them. Specifically check the workspace draft-progress widget on a 0%, 50%, and 100% draft to confirm the bespoke bar paints correctly across states.
