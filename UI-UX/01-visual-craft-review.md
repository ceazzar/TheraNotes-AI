# TheraNotes-AI: Visual Craft Review

Reviewer: senior product designer (Linear / Notion / Vercel lens)
Date: 2026-05-10
Method: source code audit (no browse tool was available in this environment; localhost reachable but no headless browser binding to drive screenshots, so this review is grounded in `app/`, `components/`, and `app/globals.css`. Pixel observations are inferred from CSS values and JSX, not screenshots — every finding cites exact file + line so it can be re-verified visually in seconds.)

---

## TL;DR — the five most damaging issues

1. **The login screen is the single biggest credibility break.** It is a stock Supabase Auth UI rendered inside a centered shadcn shell with no logo, no brand color, and a `theme="dark"` widget on a light page. First impression is "unfinished hackathon project." See `app/login/page.tsx:31-37`.
2. **Two parallel, incoherent design systems run side-by-side.** A bespoke `tn-*` system (warm/Geist/serif paper, pill buttons, blue accent `hsl(225 65% 50%)`) lives next to a stock shadcn theme (oklch primary, rounded-lg buttons, "Inter" mention in CSS, but Geist actually loaded). Two different button languages, two different radii, two different focus-ring colors, two different report-document stylesheets (`.report-document` and `.tn-doc`). Nothing in the app feels coordinated because *literally nothing is*.
3. **The Generate page reads as a long form, not as a "smart canvas".** 5 collapsed `<details>` sections with native `▸` markers, raw `<select>`/`<input type=date>`, custom-rolled labels with uppercase 11px micro-caps — the "spreadsheet mockup" feeling the owner mentioned is largely caused by *this stack of native form elements with custom CSS slapped on top* rather than real composed shadcn form components.
4. **The brand is invisible.** The "logo" is a generic lucide `Sparkles` icon — the *exact same icon* used on the error page, not-found page, sidebar, progress screen, validation banner, AI refine, "report ready" toast and editor toolbar. Sparkles is the most-copied AI-app cliché of 2024-2025. There is no wordmark, no custom mark, no distinctive color, no typographic signature.
5. **Typography is doing two jobs at once and confusing both.** Body text on the "Generate" landing card is sans serif (Geist) at `14.5px/1.65`, but as soon as the report renders inside `.tn-doc` it switches to Georgia serif for body and sans for headings — a classic editorial move, but it crashes against `.report-document` (used right after generation in `/generate`) which uses its *own* serif/sans split with different sizes (15px line-height 1.8 vs 14px line-height 1.8) and different heading weights. The user sees the same report rendered two different ways depending on which screen they're on.

If you fix only #1, #4, and the visible chrome of #3 — and pick one report stylesheet — TheraNotes will already feel like a real product.

---

## 1. Login screen — `app/login/page.tsx`

**What's wrong**
- `<Auth supabaseClient appearance={{ theme: ThemeSupa }} theme="dark" />` (line 33-34) renders the stock Supabase Auth UI. On a `bg-background` (white) page this is a dark-themed widget on a light surface. Visually disconnected.
- The only branding above it is `<h1 className="text-2xl font-semibold tracking-tight">TheraNotes AI</h1>` (line 26). No mark, no color, no illustration, no value-prop context.
- `redirectTo` uses `window.location.origin + "/generate"` — fine, but the form has no "forgot password", no SSO, no "what is TheraNotes" subhead beyond a one-liner.
- No left-rail marketing column (Linear, Cursor, Vercel all ship login with a marketing rail or screenshot). It's just a centered card on a sea of white.
- Form elements (Supabase email/password) use `oklch(...)` shadcn variables that don't match the `tn-*` brand colors used everywhere else — different blue, different radii, different focus ring.

**Why it matters**
Login is the *first* UI a clinician sees. If the login screen looks like a default Supabase template, the user has already concluded the app is generic before they get to the actual product. Trust is the entire game in clinical software.

**How to fix (P0)**
- Drop `@supabase/auth-ui-react`. Build a 60-line custom form using the existing shadcn `Input`, `Button`, `Label` against `supabase.auth.signInWithPassword`. This costs nothing and gives you full control over typography, colors, and spacing.
- Two-column layout: left = form (max-w-sm), right = a quiet visual identity panel — a single block of text like "Draft NDIS-ready FCA reports in minutes" set in `var(--font-display)` Urbanist with a subtle gradient or a single screenshot of a finished report. Linear, Cursor, Stripe, Vercel all do this.
- Replace the wordmark with an actual brand mark (see #16 below). At minimum, set `TheraNotes` in `Urbanist 600` with `letter-spacing: -0.02em`. Right now it's just `text-2xl font-semibold` — Geist at default tracking.
- Add "Continue with Google" and "Continue with magic link" buttons even if they're not wired up — clinical apps with only email/password feel like internal tools.

**Priority:** P0

---

## 2. Topbar / global nav — `components/layout/topbar.tsx` + `globals.css:194-322`

**What's wrong**
- Brand mark is `<Sparkles size={16} />` (topbar.tsx:21) — same lucide icon as: progress screen, refine panel, sidebar header, error page, not-found page, success toast, AI refine button, validation banner, editor toolbar. **8+ uses of the same icon for unrelated purposes.** It's stamped everywhere and signifies nothing.
- 56px topbar height (`globals.css:196`) is fine, but the nav items (`Generate`, `Reports`, `Settings`) are indistinguishable from each other typographically — same color, same weight, same pill on hover. There's no visual cue for which is your *current* page until you mouse over (active state is just `background: var(--tn-chip)` — same as hover state).
- Avatar is a CSS gradient circle (`linear-gradient(135deg, #d9d5cc, #bdb8ad)`) with email initials. That's tasteful, but `user-menu.tsx:39` overrides this with shadcn `<Button variant="ghost" size="icon">` — meaning the avatar is now a generic 32px ghost button with the initials inside it. The `.tn-avatar` CSS rules (`globals.css:250-274`) are defined but never used because UserMenu reaches for the shadcn primitive instead.
- No breadcrumbs on the marketing-grade pages (Generate, Reports, Settings). Workspace has breadcrumbs (`tn-ws-crumbs`) but they live in the *workspace topbar*, not the global topbar — so nav structure differs by route, which feels inconsistent.
- No keyboard shortcut hint (`⌘K`, etc.). No notifications icon, no "what's new" affordance, no help. Linear/Notion all have a quiet `?` or `⌘K` next to the avatar.
- No active-state underline / accent. The current pill background (`var(--tn-chip)` = `#F3F4F6`) on hover is identical to the active state.

**Why it matters**
The topbar is on screen for the entire session. Every detail compounds. The Sparkles overuse alone is the strongest "AI demo" tell — Linear has a custom wordmark; Notion uses a notebook glyph; Cursor uses a dot. None reuse a stock library icon for every surface.

**How to fix**
- **(P0)** Commission a 30-minute custom mark. Even a typographic monogram ("T" in Urbanist with a subtle ink-pen tail) is enough. Replace the 8 Sparkles uses with: brand mark in topbar/sidebar, `Wand2` for AI surfaces, distinct icons for status (Check/AlertTriangle/Info already exist in lucide).
- **(P1)** Differentiate active vs hover: keep `var(--tn-chip)` as hover, give active a subtle inset border `box-shadow: inset 0 0 0 1px var(--tn-line)` *or* a 2px accent dot underneath, à la Linear's tab indicator.
- **(P1)** Move the workspace breadcrumb pattern up. Generate and Reports should both expose a "TheraNotes / Reports / FCA — Sarah K" trail when context allows.
- **(P2)** Add a `⌘K` quick-search button right of nav, even if it just opens a "coming soon" sheet.
- **(P2)** Surface the `.tn-avatar` styling (gradient + initials) by using a plain `<button class="tn-avatar">` instead of overriding with shadcn's icon-button — the gradient tile is more memorable than a flat ghost button.

**Priority:** P0 (mark) + P1 (active state, breadcrumbs)

---

## 3. /generate page — `app/generate/page.tsx`

This is the most-used screen and the most uneven one.

### 3a. The Identity row

**What's wrong**
- Three input fields in a 3-column grid with right-borders dividing them (`globals.css:501-527`). The pattern is borrowed from Notion's table headers, but here the labels are `font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase` micro-caps — which reads as old-school "back-office form" rather than modern "clinical app". It's also inconsistent with the larger collapsible sections below, which use the same micro-caps for *every* label, not just the highlighted ones.
- The inputs have `border-0 bg-transparent shadow-none focus-visible:ring-0` (line 543). That's a deliberate "clean canvas" choice but it kills *all* affordance. There is zero indication these are inputs until you click into one. No focus ring, no underline, no caret pulse. The label "Participant name" floats above empty space. Compare: Linear uses `border-bottom: 1px solid` + dotted on focus.
- "Assessor" placeholder: `"Name, credentials"` — but the collapsible "Assessor & Assessment Details" section right below has a separate Credentials field. The user has to guess whether to put credentials in both places. Schema confusion = trust break.

**How to fix**
- **(P1)** Add a 1px bottom border on each `.tn-id-input` (subtle, `var(--tn-line-soft)`), and on focus thicken to 1.5px and color to `var(--tn-accent)`. Do *not* add ring shadow — keep the airy feel.
- **(P1)** Either remove "credentials" from the Assessor placeholder, *or* hide the Assessor & Assessment collapsible's Credentials field when populated above. One source of truth per fact.
- **(P2)** Right-align the NDIS number with `font-variant-numeric: tabular-nums` so 9-digit IDs don't reflow.

### 3b. Collapsible intake sections

**What's wrong**
- Native `<details>` with a CSS `▸` marker (globals.css:1825-1834). On macOS Safari this works fine; on Chrome the `▸` is a font character that renders inconsistently. It also doesn't animate the chevron rotation smoothly — the rotation is set on `[open]` only, so closing collapses with no animation.
- The "status" suffix on each summary row (`✓ Header will populate`, `⏸ Part D will skip`, `Optional`) uses three different icons (✓, ⏸, none) with three different semantic levels conflated. ⏸ ("pause") is being used to mean "won't generate" — that's not what pause means anywhere in UI conventions. It should be "—" or "Skip" or a Lucide `MinusCircle`. ✓ is the right choice for "will populate".
- Inside the panels, every label is `text-transform: uppercase, font-size: 11px, color: var(--tn-muted-2) (#71717A)` (globals.css:1868-1874). On a 720px-wide card with 6 fields, that's *a lot* of all-caps gray text. Reads as IRS form, not as a tool clinicians want to use.
- `<select>` elements (Mode, Sensory Profile quadrants) are completely unstyled native selects (globals.css:1876 only sets border/padding/min-height). They look completely different from the shadcn-themed parts of the app: no chevron, no menu styling, default OS dropdown, no custom focus state. Five raw native `<select>`s on the most-touched screen is the single biggest "looks like a spreadsheet" problem.
- `<input type="date">` similarly leaks the OS picker affordances and OS-specific iconography. On Safari macOS that's a tiny calendar icon; on Chrome a different one. A date field on Plan Start vs. Plan End with no shared visual rhythm.
- WHODAS section: 6 `<input type="number">` fields in a 2-col grid with `min={0} max={100}` — but no validation feedback, no slider, no color encoding by score, no "40 = moderate disability" hint. Clinical numbers without scaffolding.
- "✓ Part E will quote 1 goal" — the singular/plural logic works, but there's no preview of *what* will be quoted. Notion-style: hovering the chip should show a tooltip with the first ~80 chars of the goal.
- The summary status only updates on render; if a user types into the open panel, the closed summary text doesn't shimmer/animate the transition from "Add DOB to populate Header" → "✓ Header will populate". Missing a delightful micro-interaction that would *teach* the user how the gating works.

**How to fix**
- **(P0)** Replace the `<details>` with shadcn's `Accordion` primitive (or radix Accordion). You get smooth height animation, ARIA built-in, and consistent chevron icons. ~20 lines of refactor.
- **(P0)** Replace native `<select>` with shadcn `Select`. The Sensory Profile quadrants will go from "spreadsheet" to "real app" in one PR. Same for Mode.
- **(P0)** Replace `<input type="date">` with shadcn `DatePicker` (radix popover + react-day-picker). 4 instances on this page alone.
- **(P1)** WHODAS scores: render each as a `<input type="number">` *plus* a slim 100% bar underneath that fills with color (green ≤25, amber 26-50, red 51-75, deep-red 76+) using `linear-gradient` — instant clinical legibility.
- **(P1)** Drop ⏸. Use either the `MinusCircle` lucide icon for "will skip" or just lighter-weight grey text "Skip — Part D".
- **(P1)** Lowercase the labels. `Date of birth` not `DATE OF BIRTH`. Use `text-xs font-medium text-muted-foreground` (12px, normal case). Compare Linear's settings forms — they *never* use small-caps for field labels.
- **(P2)** Add a tooltip on collapsed-summary status text showing the gating preview (e.g. "Header needs: name, NDIS #, DOB, assessor, credentials").

### 3c. Notes textarea + footer + Generate button

**What's wrong**
- The big `<Textarea>` (line 896-901) has `border-0 bg-transparent shadow-none focus-visible:ring-0`. Same disappearing-canvas problem as the identity row — there is *no* visual frame. The placeholder is the only cue. On focus, nothing visibly changes.
- "Will generate **5 of 8 sections**. Pending: **Header, Part D, Part E**" (line 905-918) — this is genuinely useful but rendered as plain 12.5px gray text on a white background sandwiched between the textarea and the footer. It's the most informative widget on the screen and it's the least visible. Should be a small chip-pill row with status dots.
- The Generate button (line 938-948) is a 36px circular icon-button with `<ArrowUp />`. Iconography is borrowed from ChatGPT/Claude chat input. Two problems: (1) clinicians who haven't used ChatGPT will not know what an up-arrow circle means; (2) the *cost* of clicking that button is ~6 minutes and real money — burying it in a 36px circle is asymmetric vs. the action's weight. There should be a labeled "Generate report" button.
- Tools row (`Attach`, `Dictate`, `Template`) — none of these appear to do anything. They're shadcn ghost buttons that look identical to real, working features. Clicking them is a dead-end: the user feels duped.
- Quick-add chips (`+ Sensory`, `+ Scores`, `+ Mental health`, `+ Goals`) inject hardcoded sample text into the notes (lines 953-1011). Cute for demos. But the strings are *demo content* ("WHODAS 2.0 total 62...") — if a clinician clicks them by mistake their report's clinical notes will contain hardcoded fake data. Risk of contamination. At minimum, these chips should insert *placeholders* like `{{ describe sensory profile }}`, not synthetic clinical data.
- "Validation amber card" (line 1015-1053) — the heading uses the warning amber `var(--tn-warn)` (#b45309) on a soft amber bg `#FEF3E2`. Acceptable. But the `Add more notes` and `Generate anyway` buttons are shadcn `outline` and `default` — meaning they are using `oklch(0.546 0.215 264)` shadcn primary blue, *not* the `tn-ink` black-pill button used everywhere else. Two button languages on the same card.
- Footnote text "TheraNotes drafts clinical-grade reports — every line remains yours to edit and verify. Data stays in Australia." (line 1071-1072) — uses an em-dash, which the user's CLAUDE.md explicitly says never to use. (And this rule extends to product copy if this string is hand-authored.) `&mdash;` is hard-coded.

**How to fix**
- **(P0)** Re-introduce a soft `1px solid var(--tn-line-soft)` boundary on the textarea, or at minimum a focus state — `focus:border-ink-soft transition-colors`. The current "no input ever exists" UX is too aggressive.
- **(P0)** Replace the up-arrow circle with a proper labeled button: `<Button>Generate <ArrowRight/></Button>` — pill, dark ink, full-text label. Show the cost: "Generate (6 min)" or "Generate report — uses AI credits". Don't hide a $$ action behind an emoji.
- **(P0)** Either hide non-functional tools (`Attach`, `Dictate`, `Template`) or wire them to "Coming soon" tooltips with a quiet badge like Linear does.
- **(P1)** Promote "Will generate 5 of 8 sections" to a chip strip with section dots. e.g. `[●Header ●Overview ●Process ●Part A ●Part B ●Part C ○Part D ○Part E]` with the filled vs hollow dots making it obvious which will run. This is the most decision-useful widget on the screen — give it screen real estate.
- **(P1)** Quick-add chips: change them from injecting sample text into showing collapsible-section deep-links. `+ Sensory` should *open* the Sensory Profile collapsible and scroll to it.
- **(P1)** The validation card should use the same dark-ink pill `tn-btn-primary` for "Generate anyway" — it's a destructive-ish primary action and needs visual weight.
- **(P2)** Replace `&mdash;` with `,` or `;` or rewording per project punctuation rules. Ditto in the title and subtitle (line 532).

**Priority:** P0 across the board

---

## 4. Form details — accessibility, validation, density

**What's wrong**
- No `aria-invalid` is ever set on inputs even though `parseScore()` (line 46) silently returns `null` for invalid input. A clinician typing "abc" into a WHODAS box gets no feedback.
- No `aria-describedby` linking the small caps labels to their inputs (the `<Label>` wraps but there's no programmatic association in the underlying primitive — depends on shadcn `Label` implementation).
- No `required` attribute on the gating inputs (Participant name, NDIS, DOB, Credentials). The page tells you *via summary text* what's missing but the input itself doesn't carry a `required` attribute.
- Date inputs have no `min`/`max` reasonable constraints. A user could enter `Plan start: 1942` and it would silently be saved.
- Mobile responsiveness: only `@media (max-width: 600px)` — at 768px (iPad portrait) you still get the desktop 3-col identity row + 2-col intake grid. On a 13" laptop (e.g. 1280×800 with browser chrome) the 720px card is fine, but the surrounding 64px top padding (`tn-gen-screen` line 425-428) eats vertical space — at scroll = 0, the card sits with ~140px above it, making "Draft a Functional Capacity Assessment" feel like a marketing page rather than a working form.
- Density inconsistency: identity row has `padding: 14px 18px` per cell. Intake grid has `padding: 4px 18px 16px` (top is 4px because the summary row's `padding: 12px 18px` provides the top breathing room). Notes textarea has `padding: 18px 18px 10px`. Section preview has `padding: 10px 18px`. Footer has `padding: 10px 12px 12px 18px`. **Six different paddings on one card.**

**How to fix**
- **(P1)** Add `required`, `aria-invalid`, and `aria-describedby` to all gated inputs. Wire validation state to a state object so the summary status and the input border respond together.
- **(P1)** `min={1900-01-01}` `max={today + 5y}` on date inputs.
- **(P1)** Standardize internal card padding to a 16px / 20px rhythm. Reduce variance from 6 paddings to 2.
- **(P2)** Tighten the top padding of `.tn-gen-screen` from `64px` to `32px` and eliminate the wasted vertical space; the title should land in the upper third of the viewport on a 13" laptop.

**Priority:** P1

---

## 5. Workspace page — `components/workspace/workspace-layout.tsx`

This is actually the highest-craft surface in the app. It's also where the most *interactive polish* is missing.

**What's wrong**
- **Sidebar.** `tn-side-head` (`globals.css:1028-1038`) sets background `var(--tn-bg)` but the dark-mode sidebar variables (`--sidebar: oklch(0.16 0.02 260)`) declared in shadcn theme aren't actually used anywhere — the sidebar is white-on-white separated by a 1px line. Notion uses a light-gray sidebar (subtle distinction); Linear uses a darker gray. Pure white-next-to-white means the boundary disappears at low contrast monitors.
- "TheraNotes" wordmark in sidebar header is the *third* place the brand appears (topbar, sidebar, login) and uses `Sparkles size={14}` again. Inconsistent: the topbar uses `Sparkles size={16}` (`topbar.tsx:21`).
- Progress bar (`tn-side-progress`, `globals.css:1058-1083`) — fill color is `var(--tn-ok)` (green). Why green? Progress isn't success; partial progress isn't success. Should be the brand accent (or ink) until 100%.
- TOC: `Part [A-E] — ` is regex-stripped from the title (toc-sidebar.tsx:82), so what the user sees is `Overview`, `Assessment Process`, etc. — but the section preview banner on Generate uses "Header / Overview / Process / Part A..." — a slightly different naming. Naming inconsistency between two surfaces in the same flow.
- The two extra TOC items "Appendices" and "Signatures" (toc-sidebar.tsx:99-106) are buttons with `onClick` undefined — they're decorative dead-ends. Same problem as the Attach/Dictate/Template chips on Generate.
- Sidebar collapse button is in the top-right of the header (line 41-46). When collapsed, the sidebar shrinks to 56px and *all content disappears* (rendering is gated on `!collapsed`). The user has no breadcrumb of where they were. Linear keeps the icons visible in collapsed mode so you can still navigate.
- **NDIS Planner Review summary** (toc-sidebar.tsx:121-184) has a brittle "1 critical, 0 warnings, 0 suggestion" line — note the ungrammatical "0 suggestion" (line 149: `{sugg} suggestion` — should be `suggestion${sugg === 1 ? '' : 's'}`).
- **Workspace topbar** — the breadcrumb implementation has both a "Reports" button-link AND a "Reports" text-link side by side (lines 349-357). Visual stutter. The chevron-back button is tiny size="xs" while the breadcrumb text is 13px — sizes don't harmonize.
- **Editor toolbar** (`tn-sel-toolbar`) — a dark pill that appears on selection. Clean. But it's positioned with `Math.max(12, rect.left + rect.width / 2 - 140)` (editor-toolbar.tsx:42) — a hard-coded -140 offset assumes a fixed toolbar width. If the toolbar wraps, this breaks. Should use `transform: translateX(-50%)` on the centered selection point.
- **Refine panel** (line 1635-1678 of globals.css) is a 380px floating panel with the `var(--tn-accent)` blue send-arrow. But the "refined-result" preview block (editor-toolbar.tsx:103-138) uses inline styles instead of a CSS class, with `border-radius: 8` (px implied) while the parent system uses `var(--tn-radius)` = 8px or `var(--tn-radius-lg)` = 12px. Inline-styled corners drift.
- **Footer** ("Saved just now") — the saving dot `tn-saved-dot` is a 6px green dot. When `data-saving="true"` it pulses gray. But there's no failed-state. If autosave fails, the user sees... still "Saved just now"? Need a red state.

**How to fix**
- **(P1)** Sidebar: add `background: #FAFAFA` (or `var(--tn-line-soft)` = `#F3F4F6`) instead of `var(--tn-bg)` (white). 1.5% darker than canvas — gives just enough separation.
- **(P1)** Progress fill should be `var(--tn-ink)` until 100%, then flip to `var(--tn-ok)`.
- **(P1)** Pluralize: `{sugg} suggestion${sugg === 1 ? '' : 's'}` — and apply the same fix to "warnings" (currently always "warnings" even when count is 1).
- **(P1)** Remove or wire-up "Appendices" and "Signatures" decorative items.
- **(P1)** Collapsed sidebar: keep iconified versions of TOC sections visible (just the dot + flag count), Linear-style.
- **(P2)** Extract the refined-result preview into a CSS class. Stop inline styling.
- **(P2)** Fix toolbar centering with `transform: translateX(-50%)` — calculation-free.
- **(P2)** Add a `data-error="true"` state to `tn-saved` and a red dot variant.

**Priority:** P1

---

## 6. Settings page — `app/settings/page.tsx`

**What's wrong**
- "Settings" is a single-purpose page: it manages exemplars. There's no profile section, no team section, no theme toggle, no API key, no notification preferences, no nothing. The page title promises a Settings hub; the body is one upload widget + a list. Either rename the page "Exemplars" or build out actual settings.
- The "Back to Generate" link (line 19-25) is a 14px text link with a chevron. Awkward placement — *above* the H1. Most apps put a back arrow inline with the H1, not stacked above it. Also, this is the only Settings *navigation* — there is no settings sub-nav (Account / Exemplars / Billing / API), suggesting Settings was a one-off rather than a pattern.
- The page uses no Topbar (`<Topbar />` is *not* rendered — line 16 just sets `min-h-screen bg-background`). So when you're in Settings, the global nav vanishes. You can no longer navigate to Generate or Reports without using the back link. **This is a significant nav inconsistency and probably unintentional.**
- File upload (exemplar-upload.tsx) uses a 256px `border-2 border-dashed` drop zone — visually loud and reminiscent of generic file-picker tutorials. It also doesn't respect any `tn-*` tokens; uses raw `border-border`, `text-muted-foreground`. Looks plucked from a different app.
- Result toast is inline (lines 102-112) with `bg-green-500/10 text-green-600` — those are not `tn-ok-*` tokens. Color drift.
- Exemplar list rows (exemplar-list.tsx:104) — `flex items-center justify-between rounded-md border border-border p-3`. Generic shadcn list row, no `tn-*` styling, no hover state, no row interaction beyond the trash button. Compare any Notion/Linear list row: hover background, secondary metadata muted, primary action on right, drag handle on left.

**How to fix**
- **(P0)** Render `<Topbar />` on Settings (parity with Generate/Reports). The Settings page being topbar-less is a bug.
- **(P1)** Either rename the page "Exemplars" or scaffold real settings sections (Account, Exemplars, Generation defaults, Notifications) as left-rail sub-nav. Notion-pattern.
- **(P1)** Drop the dashed drop zone in favor of a more refined pattern: a 1px solid border + a small "drop or click" line + an arrow icon. Vercel's deploy-from-Git block is a good reference.
- **(P2)** Replace inline `green-500/10` with `var(--tn-ok-bg)` etc. Color-token consistency.
- **(P2)** Hover state on exemplar rows; click-to-preview the exemplar contents in a sheet.

**Priority:** P0 (topbar) + P1 (settings IA)

---

## 7. Empty states

**What's wrong**
- **Reports empty state** (report-list.tsx:124-133): centered text "No reports yet. Generate your first report from the Generate page." inside a `border-dashed` container. Bare-bones. No illustration, no CTA button (just an inline link), no hint about what reports look like, no template/example tile. Compare Linear's empty states: friendly illustration, single primary CTA, secondary "learn more" link.
- **Generate empty state** (no notes typed): the page is the form. There's no demo report preview, no "watch a 30-sec demo" affordance, no "load sample" button (the quick-add chips inject *into the notes* but only after you've already started). First-time user has no model of what they'll get.
- **Workspace empty state** (no report or 404): handled at workspace-layout.tsx:308-322 with a centered "Report not found or you don't have access." + a Back to Reports button. Fine, but again no illustration and no graceful explanation of *why* (deleted? wrong link? expired? permission?).
- **Settings empty state** (no exemplars): exemplar-list.tsx:91-98 — bare gray text. Should be an actionable empty state with an arrow pointing up at the upload zone.
- **Loading states** (report-list.tsx:100-105): "Loading reports..." gray text. No skeleton. Workspace has a real skeleton (workspace-layout.tsx:269-306) but it's inconsistent — the rest of the app doesn't.

**How to fix**
- **(P1)** Each empty state needs: a 48-64px decorative illustration or icon (not Sparkles — pick something semantic per surface: FileText for reports, Upload for exemplars), a one-line subhead, a primary CTA button, a secondary "learn more" link.
- **(P1)** Reports list: add a real loading skeleton (3 cards' worth of muted blocks) instead of "Loading reports...".
- **(P2)** Generate page first-run could feature a "Try it with sample" button that fills both the identity fields and the notes with an anonymized demo, opening the Settings collapsible to show what it'll do.

**Priority:** P1

---

## 8. Loading / progress states

**What's wrong (`components/generate/progress-screen.tsx`)**
- The progress card is genuinely good: 18px title, dot triplet, section list with done/active/pending states. This is the highest-craft surface in the app.
- BUT: `Generating ${activeSection?.title}` shows raw template names (e.g. `"Part C — Mental Health & Behavioural Health"`). When the section list directly below also lists the same names, the title is redundant. Compare ChatGPT/Cursor: a higher-level status ("Drafting your report...") + the per-step subtext.
- Progress bar (3px) fill is `var(--tn-ink)` (good) but the empty track `var(--tn-line)` is so close to white that on a high-contrast monitor the track disappears.
- "We're drafting each section in sequence, grounded in your notes and your prior reports." (line 51-52) — nice copy, but it's static. Consider rotating sub-copy as steps complete: "Cross-referencing your prior reports..." → "Aligning to NDIS evidence standards..." etc.
- The dot pulse animation (`tn-pulse-dot`, globals.css:819-822) opacity 0.35→1→0.35 over 1.2s with stagger is good. ✓
- ETA / time-remaining is missing. The `duration: 3000 + i * 500` (page.tsx:42) is a *fake* per-section duration metadata that nothing seems to consume — the actual stream is server-driven. Worth showing a real "~5 min remaining" once the first section completes.

**How to fix**
- **(P1)** Header copy: "Drafting your report" + sub-copy `Now writing: Part C — Mental Health` (live-bound to `activeSection.title`).
- **(P1)** Track contrast: bump empty-bar to `var(--tn-line)` actual rendered = `#E5E7EB` is fine but consider `#D4D4D8` for stronger affordance.
- **(P2)** ETA: track time elapsed on first section, project for remaining. Even a coarse "~4 min remaining" feels like a real product.
- **(P2)** Rotating sub-copy on each section transition.

**Priority:** P1

---

## 9. Error states

**What's wrong**
- `app/error.tsx` (top-level error boundary) — Sparkles icon + "Something went wrong" + retry button. Identical pattern to `not-found.tsx`. Two-line copy. Functional but not branded.
- Generate page errors (page.tsx:1056-1067) — inline red card using `--tn-crit-bg/line/color` tokens. Token-correct, but no icon, no help text, no retry CTA. Just a string.
- Workspace review error (workspace-layout.tsx:385-389) — inline `tn-ws-error` line in the topbar area. Single line of crit-colored text. No dismiss, no detail expansion.
- 404 redirect: handled by `not-found.tsx`. Fine.
- No global toast system. Errors, save success, "Report ready" all use ad-hoc inline regions. Compare Vercel's toaster (Sonner), which the project doesn't appear to use even though it's a one-line add for shadcn.

**How to fix**
- **(P1)** Install `sonner` + the shadcn `toast` integration. Wire all errors and success cases through it. Remove inline error regions in favor of toasts where appropriate (save errors, network errors). Keep inline only for *blocking* errors (no permission, no record).
- **(P2)** Error pages should include a `digest` debug code (already received in `error.tsx` props) shown in small monospace at the bottom — clinicians can paste it when reporting bugs.

**Priority:** P1

---

## 10. Typography hierarchy

**What's wrong**
- Two font stacks compete: `--font-sans` is `Geist` (loaded by `next/font/google` at `app/layout.tsx:5`); `--font-display` is `Urbanist` (CSS-imported at `globals.css:1`). Inter is also referenced in the fallback chain (`globals.css:169`) but never loaded. Loading two display fonts when one is unused is wasteful and unintentional.
- The `tn-gen-title` uses `var(--font-display)` Urbanist 32/500 (`globals.css:476-484`). The H1 in `.tn-doc` (the workspace report viewer, `globals.css:1316-1323`) uses `var(--font-sans)` Geist 28/600. The H1 in `.report-document` (the post-generate preview, `globals.css:868-876`) uses `system-ui, -apple-system, sans-serif` 22/700. **Three different font/size/weight combos for the report's main heading** depending on which screen you're on.
- Body text in `.tn-doc` is Georgia serif 15/1.8. Body in `.report-document` is also Georgia 14/1.8. Visually almost identical but technically different — and they share screens in the same flow (post-generate preview + workspace).
- Insufficient-data marker style differs across the two: `.report-document .insufficient-data` (line 921-929) is `bg #fef3c7` (a warmer amber), `.tn-doc .tn-insuf` (line 1418-1429) uses `var(--tn-warn-bg) = #FEF3E2` (cooler amber). Same idea, slightly different color, different sizing, different border treatment (3px solid left vs 3px left). **Same UI element rendered two different ways depending on view.**
- Workspace topbar breadcrumbs: 13px font with `<b>` for the active crumb at default font-weight (700). The shadcn body weight is 500. Visual jolt.
- Many uses of `font-size: 13.5px`, `13px`, `12.5px`, `11px`, `12px` mixed without a clear scale. Linear/Notion typically use a 4-step scale: 11/12 caption, 13 body-sm, 14 body, 15 body-lg.

**How to fix**
- **(P0)** Pick ONE report renderer. The `.tn-doc` style (used in workspace) is the more polished version — extend it to also be used post-generate. Delete the `.report-document` ruleset (or vice versa). Single source of truth for the report visual identity.
- **(P0)** Normalize the H1 used for "Functional Capacity Assessment" across login, Generate, Workspace, Report preview, and DOCX export. Use Urbanist 32/500 with `letter-spacing: -0.025em`, color `var(--tn-ink)`.
- **(P1)** Drop the unused Inter import from `globals.css:1`. Keep Geist (loaded via `next/font`) and Urbanist (CSS-imported).
- **(P1)** Define a typography scale and use only those values: `--text-xs: 11px / --text-sm: 13px / --text-base: 14px / --text-lg: 16px / --text-xl: 20px / --text-2xl: 28px / --text-3xl: 32px`. Replace ad-hoc `13.5px`, `14.5px`, `12.5px` with the scale.

**Priority:** P0 (single report style) + P1 (font/scale cleanup)

---

## 11. Spacing and density

**What's wrong**
- Inconsistent paddings inside the Generate card (covered in 4): 6 distinct padding combos in one component.
- Gap between sections in the intake stack: `border-bottom: 1px solid var(--tn-line-soft)` only — no breathing room. Two adjacent collapsed sections have their summary rows directly touching across a 1px border. Most modern apps use 8-16px gap *and* a divider, not a divider alone.
- Workspace paper has 64px top + 80px side + 96px bottom padding (`tn-paper-inner`, line 1303) — this is print-grade and looks great when full of content but enormous when the report is short. Consider responsive padding.
- The post-generate report screen (`/generate` after isDone) has `padding-bottom: pb-24` (96px) on the report container plus a fixed footer at 60px or so. That's almost 160px of dead space at the bottom of the viewport. Less.
- Reports grid uses `gap-4` (16px) which is fine, but the cards themselves have `py-4` only (16px vertical inside the Card). On small grid items the `<h3 line-clamp-2>` text wrap can make 2-line cards differently sized than 1-line cards — Linear uses `min-height` to keep cards uniform.

**How to fix**
- **(P1)** Standardize internal card padding (per #4).
- **(P1)** Add `gap: 6px` between intake sections — or replace the borders with dividers + breathing room.
- **(P2)** Card `min-height: 88px` on reports grid items.

**Priority:** P1

---

## 12. Colors — semantic vs decorative

**What's wrong**
- The accent blue is defined in 3 places with subtly different values: `--brand-blue: #3B82F6` (theme-inline, line 49), `--tn-accent: hsl(225 65% 50%)` ≈ `#2D5BD9` (line 141), and shadcn `--primary: oklch(0.546 0.215 264)` ≈ `#3457D8`. Three blues. They're close but not identical.
- The `<Button variant="default">` (shadcn primary) renders as `bg-primary` = oklch blue. The custom `tn-btn-primary` is `var(--tn-ink)` black pill. These two coexist on the *same screens* (e.g. validation card uses shadcn `outline` + `default` blue buttons; the rest of generate uses `tn-btn` black pills if they were used). The user sees BOTH black pills AND blue squares as "primary" actions.
- Severity colors (`tn-warn`, `tn-crit`, `tn-ok`, `tn-sugg`) are well-defined and consistently used in the report flag system. Good.
- But `bg-yellow-500/10`, `bg-purple-500/10`, `bg-green-500/10`, `bg-red-500/10` (report-card.tsx:9-26) are raw Tailwind colors NOT mapped to severity tokens. The Reports list uses **different status colors** than the Workspace flag system. Critical = red in workspace; failed = red in cards; ready = green in cards; ok = green in workspace. They look similar but aren't from the same palette.
- "Brand" color: there isn't one. The accent blue is so neutral it could be from any product. There is no signature TheraNotes color. Compare: Linear = magenta+violet, Notion = pure black+orange-red, Cursor = teal, Vercel = pure black.

**How to fix**
- **(P0)** Pick ONE primary blue. Settle on `var(--tn-accent)`. Override shadcn `--primary` to use it. Delete the unused `--brand-blue`.
- **(P0)** Pick ONE primary button style. Either everything is dark-ink-pill (`tn-btn-primary`) or everything is shadcn-default. The current ambiguity is the loudest "I'm built from two systems" signal.
- **(P1)** Map status colors in `report-card.tsx` to `tn-warn-bg/line`, `tn-crit-bg/line`, `tn-ok-bg/line`, etc. Single source of truth for severity color.
- **(P1)** Consider a memorable secondary brand color — a deep teal or a warm amber for the "TheraNotes mark" specifically. Not the accent. Just for the logo.

**Priority:** P0

---

## 13. Iconography

**What's wrong**
- Lucide is consistent across the app — that's good. However, **Sparkles is used 8+ times for unrelated things** (covered in #2 and #4). The list:
  - `topbar.tsx:21` — brand
  - `progress-screen.tsx:39` — generation
  - `editor-toolbar.tsx:153, 240` — AI refine
  - `toc-sidebar.tsx:38` — sidebar brand
  - `error.tsx:5` — error fallback
  - `not-found.tsx:5` — 404
  - `generate/page.tsx:452` — success toast
- The `<ArrowUp>` send button on Generate (line 947) and the `<ArrowRight>` Refine send button (editor-toolbar.tsx:174) signal "submit" with two different icons across two surfaces. Pick one direction.
- Icon sizes are spread: 13, 14, 16, 22 px. Lucide ships with 16/20/24 as default common sizes. The project uses 13 a lot for "small" icons — 14 might be more visually balanced with 14px text.

**How to fix**
- **(P0)** Replace Sparkles with semantic icons:
  - Brand topbar/sidebar: custom mark
  - Progress / generation: `Wand2` or `Cpu`
  - AI refine: `Wand2` (consistent within AI surface)
  - Error: `AlertCircle`
  - Not found: `Compass` or `MapOff`
  - Success toast: `CheckCircle2`
- **(P1)** Standardize icon sizes to 14 / 16 / 20.

**Priority:** P0

---

## 14. Micro-interactions

**What's wrong**
- The codebase ships these animations (`globals.css:840-851`):
  - `tn-fade-up` (0.3s, 6px translate) — used on banner, validation, progress card, toolbars. Good.
  - `tn-fade-in` (0.12s, 4px) — selection toolbar.
  - `tn-pulse-dot` — typing dots, save indicator.
  - `tn-pulse`, `tn-shimmer`, `tn-shimmer-move`, `tn-spin` — defined but I didn't see consumers in the code I read. Dead code or under-used.
- Hover states are mostly just `background` color changes — no scale, no elevation lift. The `tn-send-btn:hover` uses `transform: translateY(-1px)` (good — gives a subtle press). But `.tn-btn-primary:hover` only changes color. Cursor's "press" feel is what differentiates real apps from spreadsheets.
- No focus animations. `outline-ring/50` (globals.css:177) is the global outline rule but the brand has no signature focus-ring color/style.
- The `<details>` collapse has no height animation (it's a native abrupt collapse). On a Linear-grade app, the chevron rotates with `transition: transform 120ms` (which exists, line 1830) but the *content* slot snaps. Replace with shadcn Accordion to fix both.
- The Generate button's disabled state is just opacity 50 + grayscale color. No hint of *why* (no notes? incomplete intake?). A disabled tooltip explaining "Add clinical notes to generate" is missing.
- Workspace TOC items have `transition: all 0.15s` but no specific hover shift. Could add a 2px left-border accent on hover that animates in (Linear pattern).
- Sidebar collapse animation: the grid columns change instantly (`tn-ws[data-sidebar-collapsed="true"]` swaps `grid-template-columns`). No transition. Add `transition: grid-template-columns 200ms ease`.

**How to fix**
- **(P1)** Audit every interactive surface; add either hover-elevation or hover-color (not both) consistently. Buttons should always have a 1px translate on press.
- **(P1)** Add a tooltip on the disabled Generate button explaining the gating.
- **(P2)** Animate sidebar collapse with `transition: grid-template-columns 200ms ease` on `.tn-ws`.
- **(P2)** Replace native `<details>` with Accordion for height animation.

**Priority:** P1

---

## 15. Detailing

**What's wrong**
- **Focus rings.** The `outline-ring/50` (line 177) is applied globally but `--ring: oklch(0.546 0.215 264)` shadcn blue. The custom `tn-id-input` and similar elements have `outline: none` (overriding it). Many inputs are unfocusable-looking on tab. This is a **WCAG accessibility issue** in addition to a polish issue.
- **Scrollbar styling.** `tn-side-toc::-webkit-scrollbar` and `tn-paper-scroll::-webkit-scrollbar` (globals.css:1757-1769) only show on hover. Nice. But Firefox doesn't support these prefixed rules — Firefox shows default chunky scrollbars. Add `scrollbar-width: thin; scrollbar-color: var(--tn-line) transparent` for Firefox.
- **Skeleton loaders.** Workspace has a real skeleton (lines 269-306). Reports list does not (just text "Loading reports..."). Settings does not (just text "Loading exemplars..."). Inconsistent.
- **Optimistic UI.** Reports list deletes via `setReports((previous) => previous.filter(...))` *after* the fetch resolves (report-list.tsx:74-80). That means a 500ms delay before the card visibly disappears. Optimistic delete (remove first, restore on error) would feel snappier.
- **Toast notifications.** None. Saves, deletes, exports — all silent. The autosave footer pulse is the only feedback. A clinician deleting a report sees the card vanish but no "Report deleted ⌘Z" toast.
- **Keyboard shortcuts.** None visible. No `⌘S` to save (autosave covers it but a hint would help). No `⌘E` to export. No `⌘/` for help. No `?` for shortcut sheet. Compare Linear (every action has a shortcut).
- **Empty character treatment in the report.** `.report-document` uses `text-align: justify` (line 918). Justified text on web with no hyphenation creates "rivers" of whitespace and looks like a 1995 Word doc. Use `text-align: left` for clinical reports — easier to scan.
- **Cursor styles.** `.tn-toc-item`, `.tn-chip`, `.tn-tool-chip` have `cursor: pointer`. But shadcn Buttons don't have explicit cursor in the variant system. Many buttons may render as `cursor: default` on Safari unless a global `button { cursor: pointer }` is applied.

**How to fix**
- **(P0)** Define ONE focus-ring style: `box-shadow: 0 0 0 3px color-mix(in srgb, var(--tn-accent) 20%, transparent)` on `:focus-visible`. Apply it to all interactive elements including the "borderless" identity inputs.
- **(P1)** Add Sonner toaster. Wire delete, save, export to it.
- **(P1)** Add a `?` keyboard-shortcut sheet (radix Dialog) listing all available shortcuts. Implement at least: `g g` go to generate, `g r` go to reports, `g s` go to settings, `⌘/` open help, `⌘k` quick search.
- **(P1)** Optimistic delete on report cards.
- **(P1)** Drop `text-align: justify` from `.report-document p`.
- **(P2)** Firefox scrollbar styling.
- **(P2)** Real skeletons for reports list and settings list.

**Priority:** P0 (focus ring) + P1 (toaster, shortcuts, optimistic UI)

---

## 16. Brand presence

**What's wrong**
- No actual brand mark. The "logo" is `<Sparkles size={16} />` next to the wordmark "TheraNotes" — the Sparkles is the lucide default and it's also used as a generic AI icon all over the app. There is no symbol that says "this is TheraNotes and not any other AI app".
- The wordmark "TheraNotes" is set in Geist `font-weight: 600, letter-spacing: -0.01em` (`globals.css:212`). Geist is a beautiful neutral typeface — it's also the font Vercel use for their entire brand. So the word "TheraNotes" set in Geist looks like a Vercel-template app, not TheraNotes.
- Color: no signature brand color (covered in #12). Either the app needs a memorable accent or the typography needs to do all the work — neither is happening.
- Tagline / voice: the only product copy on the marketing surfaces (login, generate header, footnote) is functional ("Sign in to start generating FCA reports", "Draft a Functional Capacity Assessment", "Data stays in Australia"). Functional ≠ memorable. There's no opinionated voice. Compare:
  - Linear: "The issue tracking tool you'll enjoy using"
  - Notion: "The connected workspace where better, faster work happens"
  - Cursor: "The AI Code Editor"
  - TheraNotes (current): no tagline
- The favicon is the Next.js default favicon.ico (still shipping in `app/`). Public folder still contains `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg` — the boilerplate Next.js placeholder assets, never removed. **This is a strong "this is a starter project" tell.**

**How to fix**
- **(P0)** Build a custom mark. Even 30 minutes of typographic work yields a distinctive monogram. Suggestion: a "T" in Urbanist Bold with a dot under the crossbar (the dot referencing a clinical note's bullet). Set the wordmark in Urbanist (already loaded) at semibold with -0.025em tracking.
- **(P0)** Delete `public/next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`. They're a dead giveaway. Replace `favicon.ico` with a custom one that matches the new mark.
- **(P0)** Pick a tagline. Three drafts:
  - "FCA reports, drafted in minutes."
  - "The clinical writing assistant for Australian OTs."
  - "Your evidence, written up properly."
- **(P1)** Pick a single signature accent color — the current blue is fine, but commit to one and use it sparingly so it *means* something (current state: blue means accent, blue means primary, blue means link, blue means suggestion-flag, blue means refine — overused).

**Priority:** P0

---

## P0 punch list — ordered by impact-per-effort

These are the highest-leverage changes. Each one moves the perceived quality of the app significantly. Estimates are rough engineering hours.

| # | Fix | Files | Effort | Why it's first |
|---|-----|-------|--------|----------------|
| 1 | **Delete the boilerplate placeholder SVGs in `public/` + replace `favicon.ico`** | `public/*` | 0.5h | Single biggest "starter project" tell. Free win. |
| 2 | **Replace the 8 Sparkles uses with semantic icons** (Wand2 for AI, AlertCircle for error, Compass for 404, CheckCircle2 for success, custom mark for brand) | 7 files | 1h | Removes the "AI demo" cliché immediately. |
| 3 | **Build a real Login screen** — drop Supabase Auth UI, build with shadcn Input/Button/Label, two-column layout (form + brand panel), correct theme | `app/login/page.tsx` | 3-4h | First impression. Highest-leverage single screen. |
| 4 | **Replace native `<select>` with shadcn `Select` and `<input type=date>` with shadcn `DatePicker`** on Generate intake | `app/generate/page.tsx` | 2-3h | Removes the "spreadsheet" feel. ~10 inputs converted. |
| 5 | **Replace native `<details>` with shadcn `Accordion`** for intake collapsibles | `app/generate/page.tsx`, `globals.css` | 1.5h | Animated heights, consistent chevrons, ARIA. |
| 6 | **Pick ONE primary button style and ONE primary blue.** Standardize the validation card and footer to match. | global | 2h | Removes the "two design systems" feel. |
| 7 | **Promote the Generate button** from icon-circle to labeled pill ("Generate report") with cost/section preview | `app/generate/page.tsx` | 0.5h | A $$ action shouldn't hide. |
| 8 | **Render `<Topbar />` on Settings.** | `app/settings/page.tsx` | 5min | Bug fix masquerading as polish. |
| 9 | **Pick ONE report stylesheet.** Delete `.report-document` *or* `.tn-doc`, pipe both consumers to the survivor. | `globals.css`, `formatted-report.tsx` | 2h | Same UI element rendered two ways across two screens — the highest-impact polish issue users will notice. |
| 10 | **Define one focus-ring style and apply it everywhere** — including the borderless identity inputs that currently have `outline:none`. | `globals.css` | 1h | Accessibility + polish in one. |
| 11 | **Custom brand mark + tagline.** | `public/`, `topbar.tsx`, login | 4-6h | The brand-presence moves you from "shadcn template" to "TheraNotes". |
| 12 | **Wire up or hide the dead-end controls:** Attach/Dictate/Template chips on Generate, Appendices/Signatures in workspace TOC. | 2 files | 0.5h | Dead ends erode trust. |
| 13 | **Fix `0 suggestion` plural bug** + similar grammar in counts. | `toc-sidebar.tsx` | 5min | Tiny but visible. |

Total P0 effort: roughly 18-25 hours of focused work. After that, the app crosses the threshold from "shadcn starter" to "a real product".

---

## P1 follow-up themes (briefly)

- Settings IA: rename to Exemplars or build out real subnav.
- Empty states with illustrations + CTAs.
- Sonner toaster wired to deletes/saves/exports.
- Keyboard shortcut sheet (`?`).
- Loading skeletons on reports list + settings.
- Sidebar background slightly off-white for separation.
- WHODAS scores with inline severity bars.
- Optimistic delete on report cards.
- Tooltip on disabled Generate button.
- Sidebar collapse animation.
- Drop `text-align: justify` in report.

---

## What's actually good (don't break these)

- The `.tn-progress-screen` ProgressScreen is genuinely well-designed. Done/active/pending row states with Check/typing-dot/empty are crisp. Pulse animation timing is right.
- The `tn-margin-dot` + `tn-flag-span` pattern in workspace is clever — Notion-style margin annotations on a clinical document is a memorable detail.
- Dark-pill selection toolbar (`tn-sel-toolbar`) is the right pattern for "AI assist" surfaces.
- The autosave indicator (`tn-saved-dot`) is small and respectful.
- Color tokens are mostly well-defined (warm whites, ink hierarchy, severity sets) — the issue is *applying* them consistently, not the palette itself.
- Workspace skeleton loader exists and works.
- The "Will generate X of 8 sections" preview is information-dense and useful — it just needs to be promoted visually.
- The pending-section placeholder card (`report-pending-card`) handles the "missing intake" case gracefully — nice touch.

---

## Closing note

The fundamental issue isn't taste — your tokens are mostly right and your workspace surface in particular has real craft. The issue is that **two design systems were started and neither finished**, and the brand layer (mark, tagline, signature color) was never put in. Pick one system. Finish it. Add 3 brand atoms. The app will already feel 3x more "real" with the P0 punch list alone.
