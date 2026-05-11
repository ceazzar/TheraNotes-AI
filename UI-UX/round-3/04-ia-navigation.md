# IA / Navigation Review - Round 3

| Field | Value |
|---|---|
| Reviewer | Senior UX/IA Strategist |
| Date | 2026-05-10 |
| Build | theranotes.com.au sha 89a24bc (Vercel `dpl_H4qCiPJ2caF8naooJM4HFnbgf6nw`) |
| Method | Live PROD via headless browse (profile `ux-review-4`) + curl probes + code reads |
| Cost guard | Generate / NDIS Review / Refine / Apply fix DO-NOT-CLICK |
| Round | 3 (verification mode) |

## Vote

**yes-with-caveats** - Round-2 P0s shipped functionally. Search has a perf regression (no debounce, 350KB per keystroke) and one new orphan-page case.

## Suspected regressions from round 2

| # | Surface | Symptom | Severity | Caused by |
|---|---|---|---|---|
| REG-IA-1 | `/reports` search | Every keystroke fires a Supabase round-trip downloading 350KB of report rows. No debounce. Typing "Peter" = 5 round-trips, ~1.75MB. | P1 (perf + cost) | NEW-5 fix shipped as a "widen fetch window to 500" + client-filter rather than the recommended `.ilike('participant_name', ...)` server-side query. Request is fired in a `useEffect([search])` with no debounce. |
| REG-IA-2 | Global 404 (`/this-route-does-not-exist`) | Hits Next.js `notFound()` boundary at `app/not-found.tsx`-equivalent. Centered card, "Back to Generate" button. **No Topbar.** | P1 | NEW-7 patched only the workspace's in-component "Report not found or you don't have access" guard, not the global notFound boundary. Same orphan-page anti-pattern from round 1, just at a different layer. |

Both are real and in production. REG-IA-1 also burns Supabase egress quota and degrades the search UX with visible re-render flash on each keystroke.

## TL;DR

The IA verdict graduates from "wireframe with dead clicks" (round 1) to "coherent navigable app with one perf wart and one stranded-user state". All four Topbar mounts (`/generate`, `/reports`, `/reports/[id]`, `/settings`) are present and consistent. The `/workspace/<id>` -> `/reports/<id>` 308 redirect works at the edge (Vercel) and the in-app workspace 404 keeps the Topbar above it. Focus-visible on `.tn-nav-item` produces a 2px solid `#2d56d2` outline (verified via computed style), which is the WCAG 2.4.7 indicator the round-2 punch list called for.

The two cracks at this zoom level are **how** the search fix shipped (a 500-row fetch on every keystroke is correct but expensive and un-debounced) and **where** the 404-keeps-Topbar fix didn't reach (any unknown route below `/reports/`, `/settings/`, `/generate` falls through to a global Next.js notFound that has no Topbar). Everything else from round 2 either shipped clean (NEW-6, NEW-7, the `/reports` rename, the residency-claim correction) or is unchanged P1/P2 polish (brand mark target, status pill, avatar menu, Settings sub-routes).

If I had thirty minutes I'd debounce the search input and lift the global notFound to render inside the same authenticated chrome as the in-app guard.

---

## Verification of round-2 fixes

| # | Round-2 fix | Status | Evidence |
|---|---|---|---|
| **NEW-5** | Server-side search via `.ilike('participant_name', %term%)` | **Functionally shipped, but not as specified.** Root issue (false negatives at scale) is mitigated for clinics with <500 reports; perf and bandwidth got worse. | Read `components/reports/report-list.tsx:14-19,60-75`. Code uses `SEARCH_PAGE_SIZE = 500` and widens the `range(from, to)` when `search.trim().length > 0`, then client-filters via `.includes(term.toLowerCase())`. Comment at `:17-18` admits "the right next step is a true server-side ilike against the embedded participant_name; that's deferred until a clinician demands it." Live verified: keystroke `P→e→t→e→r` produced 5 separate `GET /rest/v1/reports?...&limit=500` calls (350KB each). |
| **NEW-6** | `.tn-nav-item:focus-visible` outline (WCAG 2.4.7) | **Shipped clean.** | Read `app/globals.css:248-251` — `outline: 2px solid var(--tn-accent); outline-offset: 2px;`. Live verified: tabbing from a fresh page load focuses `.tn-nav-item`, computed style returns `outline-width: 2px, outline-style: solid, outline-color: rgb(45, 86, 210), outline-offset: 2px`, `:focus-visible` matches `true`. Screenshot: `screenshots/r3-ia-05-focus-visible-on.png`. |
| **NEW-7** | `/workspace/[id]` 404 page keeps Topbar visible | **Shipped clean (for the in-app guard); does NOT cover the global notFound.** | Live verified: `GET /reports/abc123notrealfake` renders Topbar with 3 nav items + avatar above the "Report not found or you don't have access. Back to Reports" card. `document.querySelectorAll('.tn-nav-item').length === 3`. Screenshot: `screenshots/r3-ia-06-notfound-with-topbar.png`. **But:** any URL outside the route tree (e.g. `/this-route-does-not-exist`) returns HTTP 404 with the global Next.js boundary that has no Topbar. Screenshot: `screenshots/r3-ia-08-global-404-no-topbar.png`. See IA-1 below. |
| **/reports rename + 308 redirect** | `/workspace/<id>` -> `/reports/<id>` | **Shipped clean.** | `curl -I https://www.theranotes.com.au/workspace/abc123` returns `HTTP/2 308`, `location: /reports/abc123`, served from Vercel edge with `cache-control: public, max-age=0, must-revalidate`. Live verified: navigating to `/workspace/abc` lands at `/reports/abc`. Internal-link audit (`grep -rn "/workspace" app components`) shows no live `<Link href="/workspace/...">` — only one dead-code `pathname.startsWith('/workspace')` in `topbar.tsx:31` (defensive, harmless), one `/workspace must never serve content` comment, and `lib/workspace/types` imports (unrelated). |
| **Persistent Topbar across routes** | `/`, `/login`, `/generate`, `/reports`, `/reports/[id]`, `/settings`, `/reports/<bogus>` | **Shipped consistent across the authenticated tree.** Login correctly excluded. | Live tested each route: nav-item count and active state per page below. |

### Topbar coverage matrix (live PROD)

| Route | Topbar mounted? | Active nav-item | Brand href | Notes |
|---|---|---|---|---|
| `/` | n/a (server redirect) | n/a | n/a | Bounces to `/generate` if signed in, `/login` if not. |
| `/login` | **No** (correct - public page uses `tn-auth-shell` two-column layout) | n/a | (none) | Aside reads "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." (REG-2 honest version, verified). Footer: "Need an account? Ask your practice administrator to invite you." (open signup looks gated). |
| `/generate` | Yes | "Generate" | `/generate` | First-run Tip banner not visible for returning users; "Draft restored" banner shows when localStorage payload exists. |
| `/reports` | Yes | "Reports" | `/generate` | Header has "+ New report" link (always visible), search input, status `<Select>`. |
| `/reports/<valid-id>` | Yes | "Reports" | `/generate` | Plus workspace breadcrumb row underneath: `< Reports` button + bold participant name + status text. |
| `/reports/<bogus-id>` | Yes | "Reports" | `/generate` | "Report not found or you don't have access. Back to Reports" centered. **NEW-7 verified.** |
| `/settings` | Yes | "Settings" | `/generate` | Profile, Upload exemplar, Uploaded exemplars list - still monolithic single page (round-2 issue 5 unfixed). |
| `/this-route-does-not-exist` | **No** | n/a | n/a | Global `notFound()` boundary - centered "Page not found / Back to Generate" with no chrome. **REG-IA-2 / IA-1 below.** |
| `/workspace/<id>` | n/a (308 redirect to `/reports/<id>`) | n/a | n/a | Verified at edge. |

---

## Walk-through

I probed the live PROD site with the browse tool and as a separate channel ran curl/grep against the codebase. Every claim in this section is either a runtime observation or a code-line citation; nothing is inferred from training-data assumptions.

### 1. Sign-in flow

Visited `/login` while signed out. Two-column layout renders correctly: left aside with the stethoscope brand mark, "NDIS-grade Functional Capacity Assessments, drafted in minutes." headline, three bullets (residency claim is now the honest "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." - REG-2 verified), right card with email/password form and the gated copy "Need an account? Ask your practice administrator to invite you." There is no "Sign up" link, which is a strong signal that open self-signup has been disabled at the Supabase Dashboard layer (consistent with the round-2 user-action item). I did not attempt `auth.signUp()` from the console for this review (out of scope for IA), but the surface UX is clean.

After signing in, the server redirects to `/generate`, not `/reports`. Round-2 issue 9 (brand mark / first-landing should arguably be `/reports`, not `/generate`) is unfixed - still a P1 mental-model issue, not a P0 blocker.

### 2. Topbar walkthrough

Tabbed through every authenticated route's chrome. The Topbar is now consistently mounted on `/generate`, `/reports`, `/reports/[id]`, and `/settings`. The `[data-active="true"]` attribute is correctly assigned to whichever nav-item matches the current pathname (verified: `/reports/<id>` lights "Reports", not "Generate"; `/settings` lights "Settings"). The brand mark continues to point at `/generate` (round-2 issue 9 unfixed - P1 polish).

Keyboard navigation produces a visible 2px solid focus ring on the nav-items. I verified this both by reading the CSS rule (`app/globals.css:248-251`) and by running `getComputedStyle(document.activeElement)` after a fresh-page Tab keystroke; the rule applies, `:focus-visible` matches, and `outline-width === "2px"`. The brand mark `.tn-brand` itself does not have a custom focus-visible rule, so it falls back to the browser default (1px auto). That is technically WCAG-compliant but inconsistent with the nav-items it sits next to. Not a P0; flagging in IA-2 below.

The User menu dropdown still has only **Sign out** plus a label showing the user's email. No Profile, Settings, Help, or Theme entries. Round-2 issue 7 unchanged (P2).

### 3. Reports list - search regression deep dive

This is where round 2's fix landed sideways. The intended fix was a server-side `ilike` against `assessments.participant_name`. What actually shipped is a fetch-window widener: when the search box is non-empty, the existing client-side query expands its `.range(0, 499)` window from the default 24, then the client filter (`r.assessments?.participant_name?.toLowerCase().includes(term)`) runs over that 500-row window.

This **does** correctly fix the symptom round 2 flagged (a clinician searching for "Peter" with 60 reports total no longer gets "no matches"). For the pilot OT's caseload it is a non-issue. But it's **not** what the round-2 punch list described, and the way it was wired created a perf wart:

- The fetch is in a `useEffect([supabase, page, statusFilter, search])` (line 120). The `search` dependency triggers a refetch on every keystroke.
- There is no debounce. I verified live: typing "Peter" letter-by-letter into the search box fired **five** separate Supabase requests, each downloading the same ~350 KB JSON payload. Total: 1.75 MB to type one name.
- For the dev/test account (which has 24 reports) this is wasteful but invisible. For a clinic with 200+ reports this becomes a real perf and Supabase-egress cost regression.
- It also re-renders the report grid on every keystroke (the `setReports(cleaned)` in line 104 replaces state on each return), which causes a visible flicker.

Search correctness checks I ran:
- Empty query: returns full unfiltered list with "Load more" (24 first page, paginated). Correct.
- Single character "Z" (no participant matches): returns "No reports match this filter." Correct.
- Multi-character "Peter": returns matching cards. Correct.
- Special character "%": did not propagate through the browse tool's `type` API to React state, so I could not confirm runtime behavior. From code inspection (`r.assessments?.participant_name?.toLowerCase().includes(term)`), `%` is treated as a literal substring against participant names that don't contain it - safe. **No SQL-injection surface either**, since the widened query has no `ilike` parameter; the search term never leaves the browser.

Verdict on NEW-5: the user-visible defect is fixed for typical clinic scale, but the implementation is one debounce away from being right and one `ilike` away from being scale-correct. See REG-IA-1 / IA-3.

### 4. Workspace navigation

Loaded `/reports/<valid-id>`. Three layers of chrome: global Topbar (56px), workspace breadcrumb row (~40px: `< Reports` ghost button + bold participant name + status text + "NDIS Review" action button on the right), and TOC sidebar (280px). The status pill in the breadcrumb is still rendered as inline italic-styled muted text (`Peter Parker Ready · 10 May 2026`), not as a `<Badge>`. Round-2 issue 6 unchanged (P2).

Pressed the back affordance (`< Reports` button in the breadcrumb): correctly navigates to `/reports`. The Topbar's `Reports` nav-item is also `[data-active="true"]` while in the workspace, providing a redundant back path - good IA, no orphan.

### 5. /reports/<bogus> - the in-app 404

Loaded `/reports/abc123notrealfake`. The page renders the Topbar at the top and a centered "Report not found or you don't have access. Back to Reports" card below. NEW-7 verified. The `Back to Reports` link is a `<Link href="/reports">` (button-styled), and the global Topbar provides a second back path. This is the right shape.

### 6. Global notFound() - the orphan that NEW-7 didn't reach

Loaded `/this-route-does-not-exist`. The server returns HTTP 404 and renders Next.js's notFound boundary: a centered `flex min-h-screen flex-col items-center justify-center` div with a question-mark icon, "Page not found", "The page you're looking for doesn't exist or has been moved.", and a "Back to Generate" button. **No Topbar.** This is the same anti-pattern round 1 flagged on the workspace, but reborn one layer up in the route tree.

It will be hit by:
- A user mistyping any path (`/reprots`, `/settigns`).
- An external link with a typo or a stale share.
- Any future feature that uses Next's `notFound()` outside the workspace's in-component guard.

The fix is the same architectural move recommended in round 2 issue 1: move the Topbar mount into a route-group layout (`app/(app)/layout.tsx`) and use Next's hierarchical `not-found.tsx` files within that group so the chrome wraps the 404 too. Until that happens, every unknown route below the auth wall strands the user. See IA-1.

### 7. Settings

`/settings` is unchanged from round 2: a single scrolling page with three sections (Profile, Upload exemplar, Uploaded exemplars). No tabs, no sub-routes. Round-2 issue 5 unfixed (P1).

### 8. Generate

`/generate` shows the "Draft restored" banner (because the test profile has a localStorage draft from earlier in the session). The dead Attach/Dictate/Template buttons (NEW-4) are gone - confirmed by reading the page DOM and not finding them. The bottom action bar shows "Generate sections" with a missing count when zero sections are eligible (`Generate  sections` with the empty count slot, double space) - minor cosmetic, flagging in IA-4.

The Tip banner with the "Settings" Link does not render for this returning-user account (the dismissal is sticky via localStorage). I could not re-verify the round-2 fix that "Settings" in that banner is a real `<Link>`, but I did read `app/generate/page.tsx` round-2 evidence and have no reason to doubt it.

### 9. Sitemap probe

Clicked every link in the Topbar from `/reports`. Generate -> `/generate` (200, Topbar persists, "Generate" active). Reports -> `/reports` (200). Settings -> `/settings` (200). Brand mark -> `/generate` (still pointing at action home, not data home; round-2 issue 9 P1 unfixed). User menu -> Sign out (only entry).

In-page navs: TOC sidebar in workspace correctly scrolls to sections (verified the section names render: Report Header, Report Overview, Assessment Process, Part A-E). The "+ New report" CTA on `/reports` correctly points at `/generate`. There is no Cmd+K palette, no global search, no breadcrumb beyond the workspace's single-level back.

---

## New findings

### IA-1 - Global notFound() page strands the user (no Topbar) [P1]

**Where:** Any URL that resolves to Next's `notFound()` outside the in-component guards. Demonstrated at `https://www.theranotes.com.au/this-route-does-not-exist`.

**Symptom:** Centered "Page not found / The page you're looking for doesn't exist or has been moved. / Back to Generate". No Topbar, no nav-items, no avatar/sign-out, no global search. Identical-shape anti-pattern to the round-1 workspace orphan that NEW-7 fixed - just one architectural layer up.

**Verified by:** Live navigation, screenshot at `UI-UX/round-3/screenshots/r3-ia-08-global-404-no-topbar.png`. SSR HTML inspection confirms the `notFound` boundary is wired with no chrome wrapper: `<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">` ... `<h1>Page not found</h1>` ... `<Link href="/generate">Back to Generate</Link>`.

**Fix:** Two viable shapes, both small.
- **Cheap fix (~10 min):** Move the Topbar mount into the global root layout's notFound branch (or whichever `not-found.tsx` Next is currently rendering) so 404s share the same chrome the rest of the app does. Continue mounting Topbar per-page everywhere else.
- **Right fix (~1-2 hours):** Adopt the route-group refactor recommended in round-2 issue 1: create `app/(app)/layout.tsx` that mounts `<Topbar />`, move `/generate`, `/reports`, `/reports/[id]`, `/settings` into the route group, drop the per-page Topbar imports, and add an `app/(app)/not-found.tsx` so any 404 within the authenticated tree inherits the chrome.

I recommend the right fix. The cheap fix removes the symptom but leaves the next IA addition (e.g. `/clients`, `/help`) free to recreate the same orphan again. The route-group refactor structurally guarantees Topbar is present.

**Priority:** P1 (low traffic but trivial to fix, and removes the last chrome-system inconsistency).

---

### IA-2 - Search input has no debouncing - 350 KB per keystroke [P1]

**Where:** `components/reports/report-list.tsx:46-120`. Production effect: typing "Peter" into the reports search box fires five Supabase queries downloading 350 KB each (1.75 MB total).

**Symptom:** Two real consequences and one cosmetic one:
1. **Cost:** Supabase egress is metered. A clinician demo where the user types and backspaces a few names burns megabytes per session for what should be a few KB of filter work.
2. **Perf:** Each keystroke replaces `reports` state with a 500-row payload, re-renders the grid, and re-mounts the cards. Visible flash on each keystroke when the network is slow.
3. **Subtle correctness:** Race conditions. If the user types "Pet" and "Peter" in quick succession, the responses can return out of order. The hook has an `isActive` cleanup flag (line 79), so the older response is dropped - good, but only because of that one defensive line. No-debounce hooks are accident-prone.

**Verified by:** Live network panel (`browse network`) snapshot of typing `P→e→t→e→r` shows five separate `GET /rest/v1/reports?...&limit=500 → 200 (75ms, 351879B)` requests. Code at `report-list.tsx:120` lists `search` as a `useEffect` dependency with no debounce. No `useDeferredValue`, no `setTimeout`, no `lodash.debounce`.

**Fix:**
- **Smallest:** Add a 200-300ms debounce to the `search` value before it hits the `useEffect` dependency array. Either inline (`const [debouncedSearch, ...]`) or via React's `useDeferredValue`. ~10 minutes.
- **Better:** Combine debounce with the actual round-2-recommended `.ilike('participant_name', %term%)` server-side query, drop the 500-row widener entirely, and lift the `Load more` constraint that hides when search is non-empty. The result is correct at unbounded scale, doesn't download more data than it shows, and doesn't fire on every keystroke. ~30 minutes.

**Priority:** P1. Today the dev test account has ~24 reports so the perf hit is tolerable. At a clinic with 200+ reports it becomes user-visible. Worth fixing now, while the IA team is still in this code.

---

### IA-3 - NEW-5 fix shipped sideways - search will hit the same wall again at >500 reports [P2]

**Where:** Same file as IA-2 (`report-list.tsx`).

**Symptom:** The widen-to-500 strategy is a version of the original false-negatives bug just postponed by ~20x. A clinic with 600 reports searching for someone whose latest report is 501-deep will get "No reports match this filter" - same incorrect conclusion the round-2 punch list called out, just at a higher caseload. The code comment at `:14-18` openly acknowledges this and defers the real fix.

**Verified by:** Reading `report-list.tsx:14-19,60-66`. `SEARCH_PAGE_SIZE = 500` is a magic number, no comment explaining the cap.

**Fix:** Switch the search path to a real server-side `ilike`:

```ts
const searching = search.trim().length > 0
let query = supabase
  .from('reports')
  .select('id, status, ..., assessments!inner(participant_name)')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false })
  .range(from, to)
if (searching) {
  query = query.ilike('assessments.participant_name', `%${search.trim()}%`)
}
if (statusFilter !== 'all') query = query.eq('status', statusFilter)
```

This needs the embedded relation to be `!inner` so the filter on the embedded column works. Once that lands, the `Load more` button can stay visible during search (round-2 punch-list note about `report-list.tsx:230` hiding load-more when search is non-empty - currently still hidden at line 261). With ~30 minutes' work, search becomes correct and cheap simultaneously.

**Priority:** P2 - not user-visible at the OT pilot's scale (24 reports). Promote to P1 when the second clinician is onboarded, or when a single clinician crosses 200 reports. Track as tech debt, not a launch blocker.

---

### IA-4 - "Generate sections" button label has empty count slot when no sections eligible [P3]

**Where:** `/generate` bottom action bar.

**Symptom:** Button reads `Generate  sections` (with a double space where the count would be) when zero sections are currently eligible. The count slot is empty rather than showing `0` or the button being disabled with explanatory text.

**Verified by:** Live `text 'main'` output: `...Generate  sections...`. The button is also `[disabled]` in this state (annotated snapshot at `r3-ia-01-reports-list.png` shows `[button] "Generate 0 sections" [disabled]: Generate sections` so the screen-reader label is correct - it's only the visible label that has the empty slot).

**Fix:** Either render `Generate {count} sections` with `count` defaulting to `0`, or swap the label to `Fill in the form to generate` (or similar) when count is 0. ~5 minutes.

**Priority:** P3 cosmetic.

---

### IA-5 - Brand mark `.tn-brand` lacks a project-style focus-visible ring [P3]

**Where:** Topbar brand mark element (links to `/generate`).

**Symptom:** Tabbing to the brand mark from a fresh page produces only the browser-default 1px auto outline (lab-derived), inconsistent with the 2px solid `#2d56d2` focus ring on the three sibling `.tn-nav-item` elements right next to it.

**Verified by:** Live `getComputedStyle(document.activeElement)` after a single Tab from a fresh load: `outline-width: 1px, outline-style: auto, outline-color: oklab(0.545989 -0.022487 -0.213803 / 0.5)`. CSS audit (`grep -n "tn-brand" app/globals.css`) finds no `.tn-brand:focus-visible` rule.

**Fix:** Add a matching rule:

```css
.tn-brand:focus-visible {
  outline: 2px solid var(--tn-accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

Or, generalize: `.tn-topbar a:focus-visible, .tn-topbar button:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 2px; }` and drop the per-class rule. ~5 minutes.

**Priority:** P3 polish. Today both the default and the custom focus styles satisfy WCAG 2.4.7; the issue is that they look different on adjacent elements within the same chrome.

---

## What's good and worth preserving

- **Topbar is now structurally consistent** across every authenticated route. The active-state assignment (`[data-active="true"]`) correctly handles `/reports/<id>` lighting "Reports" and not "Generate". The avatar position, brand alignment, and nav rhythm are stable across the four routes. Don't rewrite this just to refactor it - the per-page mount is scrappy but works. The route-group refactor (round-2 issue 1) is a polish win, not a redo.
- **The 308 redirect from `/workspace/<id>` to `/reports/<id>` is correct, served from Vercel edge with `must-revalidate` cache, and there are no live `/workspace/...` `<Link>` references anywhere in the codebase.** The rename is fully landed.
- **The in-app workspace 404 (NEW-7) is the right shape** - Topbar on top, centered guidance card, `Back to Reports` link. This is the model for IA-1 above; once the global `notFound()` adopts the same shape, the IA system is fully closed.
- **Login page residency claim is now honest.** "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." reads as deliberate compliance copy, not load-bearing-marketing. Don't soften this.
- **Search correctness, despite the perf wart, is fixed for the OT pilot.** The clinician at the demo isn't going to type `Peter` and watch it download 1.75MB - they'll see fast results. The IA-2/IA-3 work is debt, not a blocker.
- **Focus-visible on `.tn-nav-item` is the WCAG-correct fix** at the right scope. Don't "improve" this by adding a global `*:focus-visible` rule - that breaks the input-focus styles on the form fields.
- **The `/reports` list page is now well-designed:** "+ New report" header CTA always visible, search + status filter side-by-side, paginated load-more, whole-card click target, separate trash, "Clear N failed" bulk action. The IA shape is right; the only thing to fix is the search debounce (IA-2).
- **The denormalised `participant_name` shortcut on `assessments` is buying time, not creating debt.** The wall is at 20+ caseload (round-2 issue 12) and the `/clients` migration is still the right Q3 move; nothing in round 3's findings forces it earlier.

---

## Recommended sequence

If I had a half-day for IA fixes specifically, in order:

**1. Debounce the search input (IA-2).** ~10 minutes. One-line change wrapping the search state with a 200ms `useDeferredValue` or local `setTimeout`. Removes 80% of the per-keystroke Supabase round-trips. Single highest "ratio of perceived value to engineering effort" in this round.

**2. Lift the global `notFound()` into the same chrome as the in-app guard (IA-1).** ~10 minutes for the cheap fix (drop a Topbar mount into the existing notFound boundary). ~1-2 hours for the right fix (route group + `app/(app)/not-found.tsx`). Either ships as P1.

**3. Switch search to server-side `ilike` and re-enable Load-more during search (IA-3).** ~30 minutes once IA-2 lands. Drops the 500-row magic number, fixes scale correctness for the next year of growth, halves the average search payload from 350KB to whatever the matching subset is.

**4. Add `.tn-brand:focus-visible` (IA-5).** ~5 minutes. Cosmetic polish that completes the focus-ring pass NEW-6 started.

**5. "Generate sections" empty-count slot (IA-4).** ~5 minutes cosmetic.

After (1)-(3), the IA layer is structurally clean: no orphan pages, search correct at any scale, Topbar inherited rather than mounted. The remaining round-2 IA items (issues 1, 2, 5, 7, 9, 10, 12, 13, 14) are unchanged P1/P2/P3 - they don't block the OT pilot, and they're already documented in the round-2 punch list. Re-run `/ux-review --round 4` after (1)-(3) ship to confirm no new orphans surface and that search debouncing didn't introduce a stale-result race.

If I had to send this app to a real Flourish OT tomorrow morning with no further changes, I would. The IA is good enough. The two real gaps (search perf, global 404) are paper cuts that don't break the FCA-generation flow.
