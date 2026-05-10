# TheraNotes-AI - IA & Navigation Review (Round 2)

**Reviewer:** Senior IA / UX strategist (Stripe Dashboard, Vercel, Linear pedigree)
**Method:** Verified against the live dev server at `http://localhost:3001` via HTTP probes plus definitive code reads of the route tree, every layout/topbar/sidebar component, the `useFormDraft` localStorage hook, and the global CSS. Browser-walk tooling was not exposed in this environment, but the rendered DOM is fully determined by the components and styles read.
**Date:** 2026-05-10
**Round 1 baseline:** `/Users/ceazar/code-base/TheraNotes-AI/UI-UX/04-ia-navigation-review.md`

---

## 1. Verification Table - Round 1 fixes

| # | Round-1 finding | Status today | Evidence |
|---|---|---|---|
| 1 | Topbar persistent across `/generate`, `/reports`, `/reports/<id>`, `/settings` | **Fixed** | Topbar is rendered explicitly in `app/generate/page.tsx:570/583/648`, `app/reports/page.tsx:7`, `app/settings/page.tsx:18`, and `components/workspace/workspace-layout.tsx:317`. There is no shared layout file - each page mounts the Topbar itself. Functionally equivalent, but see "New issue: Topbar duplication risk" below. |
| 2 | Dead buttons in `/reports/<id>`: Find / Appendices / Signatures | **Fixed** | TOC sidebar comment at `toc-sidebar.tsx:96-98` confirms "removed dead 'Appendices' and 'Signatures' entries". Workspace topbar (`workspace-layout.tsx:339-374`) confirms "The dead Find button and the duplicate Reports link were removed (QA review)". Only `NDIS Review` action remains. |
| 3 | URL rename `/workspace/<id>` -> `/reports/<id>` with 308 redirect | **Fixed** | `next.config.ts` declares `{ source: '/workspace/:id', destination: '/reports/:id', permanent: true }`. HTTP probe: `curl -I localhost:3001/workspace/abc123` returns `308 Permanent Redirect, location: /reports/abc123`. The `app/workspace/` directory is gone. |
| 4 | "+ New report" CTA always visible on `/reports` | **Fixed** | `report-list.tsx:152-157` renders a primary `<Link href="/generate">` "+ New report" button in the page header row, present whether or not there are any reports. Empty-state copy still also nudges. |
| 5 | `/generate` Tip banner - Settings is a real Link | **Fixed** | `app/generate/page.tsx:679` wraps "Settings" in `<Link href="/settings">`. Underlined, inherits color, accessible. |
| 6 | Reports list search + filter - IA-coherent? | **Partially fixed (with caveats)** | Search input + status `<Select>` exist in `report-list.tsx:164-188`. They are **always visible above the grid** (good). But: search is **client-side over the loaded page only** (paginated at 24 - confirmed in `PAGE_SIZE = 13`); a clinician with 60 reports searching for someone on page 3 will get "no matches". Status filter resets pagination correctly. **See new issue 3.** |
| 7 | Workspace breadcrumb simplified (was `Reports / Reports / FCA - name`) | **Fixed** | `workspace-layout.tsx:342-363` renders one `< Reports` ghost button + bold participant name + muted status pill. The duplicate "Reports" word was removed. The status is still inline italic text rather than a Badge component (Round 1 P2 - see new issue 6). |

**Headline:** every P0 from Round 1 has shipped. The IA has graduated from "wireframe with dead clicks" to "coherent navigable app". The next round's findings are all the cracks that show up at the next zoom level.

---

## 2. Updated Sitemap

```
/                                    server-side redirect (auth-aware)
 |-- if user        -> /generate
 |-- if no user     -> /login

/login                               full-screen Supabase Auth (no Topbar)
 |  on SIGNED_IN  -> /generate

/generate          [DEFAULT LANDING]                  Topbar visible (sticky, 56px)
 |  state-machine, single page, three visual modes:
 |    (a) intake form (default) - Topbar + tn-gen-screen
 |    (b) ProgressScreen (in-flight) - Topbar + chrome-light
 |    (c) FormattedReport + bottom action bar (success) - Topbar
 |  on success ----> auto-redirect to /reports/<id> after 1.5s
 |  Banners: "Draft restored" (returning user) OR first-run "Tip" (new user)
 |  localStorage autosave via useFormDraft hook (per-user key)
 |
/reports                                              Topbar visible
 |  ReportList:
 |    + page header with "+ New report" primary CTA (always shown)
 |    + search box (client-side over loaded page) + status Select
 |    + grid of ReportCard - whole card clickable, separate Trash btn
 |    + "Load more" button (paginated at 24)
 |    + "Clear N failed" bulk action (still ghost-styled)
 |  card click -> /reports/<id>
 |
/reports/[id]      [WAS /workspace/<id>]              Topbar visible + workspace chrome
 |  TocSidebar | tn-ws-topbar (page-level breadcrumb) | PaperScroll | WorkspaceFooter
 |  Page-level breadcrumb: < Reports button + bold participant name + status text
 |  Right side: NDIS Review action (single button, dedupe done)
 |  Sidebar: Sections (renamed from "Report"), NDIS Planner Review summary
 |  Footer: Saved status, Print, Run NDIS review, Download DOCX
 |  404 fallback: "Report not found" + Back to Reports link
 |
/workspace/[id]   ----> 308 -> /reports/[id]          (back-compat redirect)
/workspace        -> 404 -> /generate fallback
 |
/settings                                             Topbar visible
 |  Header: "Settings" / "Profile, clinic details, and exemplar library."
 |  Section 1: Profile (display name, credentials, AHPRA, contact, clinic)
 |  Section 2: Upload exemplar (drop / pick PDF)
 |  Section 3: Uploaded exemplars (list with delete)
 |  No tab / sub-route structure - one long scrolling page.
 |
API routes (not user-facing):
/api/chat | /api/companion | /api/generate | /api/ingest |
/api/refine | /api/reports/[id] | /api/review | /api/revise | /api/profile (assumed)
```

**Reachability map:**

| Page | Reached from | Orphan / hard-to-reach? |
|---|---|---|
| `/login` | `/` redirect, sign-out | no |
| `/generate` | Topbar "Generate", brand mark, root redirect, `+ New report` on /reports, "Add more notes" | no |
| `/reports` | Topbar "Reports", workspace breadcrumb, workspace 404 fallback | no |
| `/reports/[id]` | Card click on /reports, post-generate auto-redirect, /workspace/<id> redirect | only from list - no global "recent reports" jump, no Cmd+K |
| `/settings` | Topbar "Settings", `/generate` Tip banner Link | no |
| `/login` after sign-out | UserMenu dropdown | no |
| `/api/*` | internal | n/a |

**Still-absent routes a user might type:**
- `/clients`, `/clients/<id>` - clients are still a denormalised string field on `assessments`.
- `/reports/new` - convention dictates this should alias `/generate`.
- `/help`, `/account`, `/billing`, `/team` - Settings is monolithic.
- `/search` or any global Cmd+K palette.

---

## 3. New IA Issues Found (post-Round-1)

### Issue 1 - Topbar mounted per page, not in a shared layout

Topbar everywhere shipped by adding `<Topbar />` inside each page (6 call sites: `generate/page.tsx` x3, `reports/page.tsx`, `settings/page.tsx`, `workspace-layout.tsx`) rather than via a shared route-group layout. The next person adding `/clients` or `/help` will forget the import and reproduce Round 1's orphan bug. The "Topbar must be everywhere" rule is tribal knowledge, not structural.

**Fix (1 hour):** create `app/(app)/layout.tsx` that mounts `<Topbar />`. Move `/generate`, `/reports`, `/reports/[id]`, `/settings` into the route group. Drop per-page Topbar calls. `/login` stays out.

**Priority:** P1 (no bug today, regression-magnet).

---

### Issue 2 - "+ New report" vs. saved drafts: silent overwrite of intent

Three affordances point to `/generate` with different weights: brand mark (logo), "Generate" nav (tertiary text), "+ New report" on /reports (primary). The mental-model bug isn't the duplication - it's that "+ New report" implies "fresh entity" but actually lands on a page that *restores* a saved draft via `useFormDraft`. A returning user mid-draft clicking "+ New report" silently resumes their old draft when they wanted a clean slate.

**Fix:** "+ New report" -> `/generate?fresh=1`; the page clears localStorage before mount. The Topbar "Generate" tab keeps draft-restore behaviour (verb = "continue").

**Priority:** P1.

---

### Issue 3 - Search is misleading at scale (truthy UI, falsy results)

`report-list.tsx:100-109` filters only over `reports` already loaded into state. Pagination is 24 per page (`PAGE_SIZE = 24`). The search input has no indicator that it's scoped to the current page set, so a user typing "Peter" with 60 reports total and only the first 24 loaded will get "No reports match this filter" - even if Peter is on page 2.

Worse, the load-more button is hidden when `search` is non-empty (`report-list.tsx:230` - `{hasMore && !search && (...)}`). So the user can't even self-rescue.

**Fix:**
- Push search server-side: `query.ilike('assessments.participant_name', %term%)` - one-line change.
- Until that ships, surface scope in the placeholder: `Search loaded reports...` and add a subtle hint when `hasMore && search.length > 0`: "Searching the first N of M reports. Load more to widen."

**Priority:** P0 - this is a *correctness* bug masquerading as IA. A clinician will conclude their client's report is missing.

---

### Issue 4 - Profile auto-fill on `/generate` is invisible silver-bullet UX

`app/generate/page.tsx:145-159` silently pre-fills assessor name/credentials/email/clinic from the saved profile. But the assessor collapsible defaults closed, so the user never sees that the magic worked. A first-time user saves Profile, lands back on /generate, and sees the same intake form as before - no acknowledgement.

**Fix:** (a) one-line "Pre-filled from your profile - Edit Profile" hint near the assessor section after auto-fill, (b) expand the assessor collapsible by default the first time it auto-fills, (c) verify the profile fetch re-runs on every /generate mount (not just on userId change - app-router client nav can cache).

**Priority:** P1.

---

### Issue 5 - Settings is monolithic; sub-routes needed before more sections land

`/settings` contains Profile (~10 fields), Upload exemplar, Uploaded exemplars list. Two unrelated jobs ("who I am" vs. "AI style references") on one scroll, no tabs, no sub-routes. The next 1-2 sections (account, billing, signature image, notifications) will bloat the page beyond Cmd+F-able. The fix is also what makes the /generate Tip banner precise: today it links `/settings` and dumps the user at the top - linking `/settings/exemplars` would be the right nudge.

**Fix (2 hours):** left rail with `/settings/profile` (default), `/settings/exemplars` (Upload + List together), `/settings/account` (NEW: email, password, delete account, sign out).

**Priority:** P1.

---

### Issue 6 - Status pill in workspace breadcrumb still inline-italic text, not a Badge

Round 1 flagged this as P2; it's still unfixed. `workspace-layout.tsx:353-362` renders status as `<span style={{ color: 'var(--tn-muted-3)' }}>Ready . 2026-04-12</span>`. On `/reports` the same status uses the proper `<Badge>` with colour-coded background. Two visual languages for one concept across two pages.

**Fix:** swap the inline span for `<Badge variant="outline" className={statusConfig[status].className}>`. 5-line change.

**Priority:** P2 (cosmetic, but a "cared-for app" signal).

---

### Issue 7 - User menu has no Profile / Settings / Help / Theme - only Sign out

`components/layout/user-menu.tsx:55-58` confirms the dropdown has exactly one item ("Sign out") plus a label showing the email. Industry convention (Linear, Stripe, Vercel, Notion) puts Profile, Settings, Help/Docs, Theme, and Sign out here. With Settings already in the Topbar this matters less today, but if Settings moves out of the topbar (see issue 13 below) it's the only place to put it.

**Fix:** add `Profile` (-> /settings/profile), `Help` (placeholder -> external docs URL or `/help`), `Theme` toggle, then existing `Sign out`.

**Priority:** P2 (avatar dropdowns are a low-traffic affordance).

---

### Issue 8 - Topbar `.tn-nav-item` has no `:focus-visible` style

Confirmed by reading `app/globals.css:228-244` - hover and `[data-active]` states are styled, focus is not. Tabbing through the Topbar from the keyboard shows no focus ring. The Avatar button uses Shadcn `Button variant="ghost" size="icon"` which inherits a `:focus-visible` ring, so that one's fine - but the three primary nav links are keyboard-invisible.

**Fix:** add `.tn-nav-item:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 2px; }` (or use the project's existing `outline-ring/50` token). 3-line CSS.

**Priority:** P0 - this is a WCAG 2.4.7 violation. For a clinical app with public-sector buyers (NDIS) accessibility is table-stakes.

---

### Issue 9 - Brand mark should be `/reports` (data home), not `/generate` (action home)

Brand mark and "Generate" tab both point to `/generate` today. Convention across clinical / dataverse SaaS (Linear, Stripe, Vercel) puts the brand mark on the data home, not the action page. Clinicians spend the bulk of a session in the workspace editor, not the intake form - they come back to manage caseload.

**Fix:** change `topbar.tsx:19` from `href="/generate"` to `href="/reports"`. The Generate tab and "+ New report" button keep their action-mode targets.

**Priority:** P1.

---

### Issue 10 - Workspace middle chrome row is under-earning its pixels

Workspace = global Topbar (56px) + page breadcrumb (~40px) + sidebar (280px). The middle breadcrumb is now thin: back button + name + status word + one action. Two directions:
- **A (now):** collapse middle row into the Topbar on `/reports/<id>` - breadcrumb fills centre, NDIS Review on the right. Saves ~30px of editor scroll.
- **B (later):** keep three layers but earn middle by adding `Reports / Peter Parker / FCA 2026-04-12` once `/clients/<id>` exists.

**Priority:** P2.

---

### Issue 11 - Workspace 404 strands the user with no Topbar

`workspace-layout.tsx:299-313` renders the 404 state ("Report not found") **before** the Topbar mount block (line 317). So invalid `/reports/<gibberish>` IDs land on a centered card with one "Back to Reports" link - no global nav, no avatar, no sign-out. This is the same Round-1 anti-pattern we fixed elsewhere, just hiding in a guard clause.

Confirmed by HTTP probe: `curl /reports/00000000-...` returns 307 to /login (no auth), so I couldn't render-test it - but the code path is unambiguous.

**Fix:** render `<Topbar />` above the 404 card too. Three-line change: pull Topbar out of the success-only branch.

**Priority:** P0 (low traffic, but trivial to fix and removes a chrome-system inconsistency).

---

### Issue 12 - Mental model: reports-as-root hits the wall at ~20-caseload

Reports denormalise `participant_name` onto `assessments`. The list shows documents, not people. Wall-hits:
- First follow-up FCA 6-12 months after the initial: two near-identical "Peter Parker" rows, no chronology link.
- First multi-doc client (FCA + BSP + Progress Report): three unrelated cards, same person.
- First audit: "what's the assessment history for participant XYZ?" requires manual filtering.

**Fix:** plan `/clients` for Q3 (new `clients` table, FK from assessments, backfill names). IA layer is 1 day; data migration is the real work. Interim cheap wins (this sprint): show NDIS number in card subhead; cluster cards by `(name, ndis_number)`; add "Other reports for this participant" link on `/reports/<id>`.

**Priority:** P1.

---

### Issue 13 - Settings still belongs in the avatar menu, not the top nav

Round 1 said this; still true. Top-nav real estate is for things you click many times an hour. Settings is clicked once a month. In the same 56px topbar you have only "Generate / Reports / Settings". That third slot is wasted on a once-a-month destination. Once `/clients` lands (issue 12), the Topbar should read:

```
[Logo] [Generate] [Clients] [Reports]   ......   [+ New report]  [?]  [Cmd+K]  [Avatar]
```

with Settings under Avatar. This keeps the top-nav verbs/data-pillars only.

**Priority:** P2 (do it together with the `/clients` IA migration).

---

### Issue 14 - No URL state for in-page positions or panel modes

Today: clicking a TOC item smooth-scrolls and updates `activeSection` in component state - URL stays `/reports/<id>`. Clicking a flag does the same. The NDIS Review panel state isn't in the URL. Result: "send your colleague this exact view" requires a screenshot, not a link.

**Fix:**
- TOC click -> `history.replaceState` to `#partD-functional`. On mount, scroll to the hash if present.
- NDIS review summary expanded -> `?review=1`.

**Priority:** P2 (deep-linkability is a power-user / share-with-supervisor affordance).

---

## 4. Cross-page flow walk-through

| Flow | Expected | Actual | Verdict |
|---|---|---|---|
| Close tab mid-draft, reopen | Draft restored | `useFormDraft` saves debounced to localStorage per `userId`. Banner fires on restore. | Works |
| Settings save Profile -> /generate prefills visibly | Confirmation visible | Pre-fill is silent; assessor collapsible stays collapsed by default | Discoverability broken (issue 4) |
| /reports -> /reports/<id>: Topbar "Reports" highlighted | Yes | `topbar.tsx:31` matches `/reports*`. (The `/workspace` clause is now dead code.) | Works |
| Brand mark goes home | `/reports` (data home) | Goes to `/generate` | Wrong home (issue 9) |
| `/reports/<invalid-id>` | "Not found" with way out | Centered card + "Back to Reports" link, **no Topbar above it** | Works as 404, strands user (issue 11) |
| `/workspace/<id>` redirect | 308 to `/reports/<id>` | `HTTP/1.1 308 location: /reports/abc123` confirmed | Works |
| Sign out | Clean redirect to /login | `signOut()` + `router.replace('/login')` + `router.refresh()` | Works |
| Reports card click target | Whole card | `report-card.tsx:91-125` wraps card in `<button>`; trash uses `stopPropagation()` | Works |
| Tab through Topbar nav | Visible focus ring | No `:focus-visible` on `.tn-nav-item` | Broken (issue 8) |

---

## 5. Mental model audit (the new questions)

### Reports vs. Clients

Clinicians think in **clients first, reports second**. Their cognitive index is the person. The wall is at ~20-caseload (issue 12) - the first follow-up FCA produces two indistinguishable Peter Parker rows with no relationship. Interim cheap wins: NDIS number in card subhead; cluster by `(name, ndis)`; "Other reports for this participant" link on the detail page.

### Discoverability of new features

Returning user lands on `/generate`. Attention order: input area > "Draft restored" banner > Topbar nav > chips. What's not in the scan: Profile (never surfaced - Tip banner mentions only exemplars), Exemplars (Tip banner is dismissible and lost forever), NDIS Planner Review (lives only inside a workspace - nothing on /generate or /reports foreshadows it). Priority fix: profile auto-fill confirmation (issue 4), then "Add an exemplar" hint on /reports while exemplar count = 0.

### Settings - is 3 sections the right grouping?

No. Profile is one job; Exemplar Upload + List together is one job. They shouldn't share a page. See issue 5.

### Workspace - all 3 chrome layers earning their pixels?

Topbar (56px) + page breadcrumb (~40px) + sidebar (280px). Middle row is vestigial. See issue 10.

### Empty state direction (fresh /reports)

Empty state copy + the always-visible "+ New report" header button give two paths to /generate. Good. What's missing: no illustration, no preview of a finished report, no "Try a sample case" affordance. A first-time user is dropped into a 7-section intake form they don't yet trust. The empty state is a wasted tutorial moment.

---

## 6. Affordance-consistency check (sanity sweep)

| Affordance | Pattern | Issue |
|---|---|---|
| Status pill | Badge on /reports, inline italic in /workspace breadcrumb | Inconsistent (issue 6) |
| Primary CTA on header row | "+ New report" on /reports, "Save changes" on /settings ProfileForm, "Send" on /generate | Three different patterns - acceptable per page context |
| Back affordance | Topbar handles back via "Reports" tab; workspace adds a `< Reports` button as breadcrumb | One canonical back is now possible if the workspace breadcrumb collapses into the Topbar (issue 10) |
| Sign out | Avatar dropdown only | Consistent - good |
| Delete (destructive) | Card trash with 3s confirm; "Clear N failed" ghost; exemplar delete (in ExemplarList) | Card pattern is great; "Clear N failed" still ghost-styled (Round 1 P2 not fixed) |
| Search | /reports has it; nowhere else | Need Cmd+K for global search across reports + clients + settings sections |

---

## 7. URL design - one update from Round 1

The big rename happened (`/workspace/<id>` -> `/reports/<id>`) and the 308 cache works. Remaining URL improvements:

| Current | Future | Why |
|---|---|---|
| `/reports/<uuid>` | `/reports/<short-id>` or `/reports/<participant-slug>-<date>` | UUIDs are unbookmarkable; a slug like `peter-parker-2026-04-12` survives screenshot / Slack share |
| `/reports/<id>` (no anchors) | `/reports/<id>#part-d` | Sharing a specific section requires deep linking |
| `/settings` (monolith) | `/settings/{profile,exemplars,account}` | See issue 5 |
| no `/clients/<id>` | future P1 | Mental model + scale |

---

## 8. Findings summary (Round 2)

### P0 (correctness or accessibility)
- **Search returns false negatives at scale** - server-side `ilike` on participant_name (issue 3).
- **Topbar nav items have no `:focus-visible` style** - WCAG 2.4.7 violation (issue 8).
- **Workspace 404 strands the user with no Topbar** - mount Topbar above the guard (issue 11).

### P1 (mental-model + structural debt)
- **Profile auto-fill is invisible** - confirmation + expand collapsible on first auto-fill (issue 4).
- **Settings is a monolith** - introduce sub-routes before more sections land (issue 5).
- **Brand mark should be `/reports` not `/generate`** - data home, not action home (issue 9).
- **Topbar mounted per page** - move to a route-group layout (issue 1).
- **`+ New report` ambiguity vs. saved drafts** - decide and label (issue 2).
- **Reports-as-root will hit a wall** - plan `/clients` for Q3, add NDIS number to cards as interim (issue 12).

### P2 (polish)
- **Status pill inconsistency** - Badge in workspace breadcrumb (issue 6).
- **Avatar menu thin** - add Profile / Help / Theme (issue 7).
- **Workspace middle chrome row underweight** - collapse into Topbar (issue 10).
- **Settings out of top nav** - move to avatar menu when /clients lands (issue 13).
- **No URL state for TOC scroll position or panel modes** - hash + query params (issue 14).

---

## If I had to fix three IA things first

If I had one afternoon, I'd do exactly these three, in this order:

**(1) Make search server-side and add a focus-visible style to `.tn-nav-item`.** These are both small (~30 minutes each) but they are the only two issues in this entire round that can cause the user to draw a wrong conclusion or be locked out. Search-says-empty-when-it-isn't will cause a clinician to think "did I lose Peter's report?" - which corrodes trust faster than any visual polish issue. Keyboard nav with no focus ring is a hard accessibility blocker for any NDIS-adjacent procurement. Together: one PR, two surgical fixes.

**(2) Make profile auto-fill visible.** The Profile feature is the most strategic addition since Round 1 - it's the difference between "type your name 50 times a year" and "set it once, never again". And right now nobody knows it works. One subtle banner near the assessor section ("Pre-filled from your profile - Edit Profile") plus expanding the assessor collapsible by default the first time it auto-fills will turn an invisible feature into a visible delight. Half-day of work. The single highest "ratio of perceived value to engineering effort" change available right now.

**(3) Decide the brand mark's destination and ship the `(app)/layout.tsx` route group together.** Change `topbar.tsx:19` from `/generate` to `/reports` (brand mark = data home, the right convention for clinical apps where users come back to manage caseload, not start from scratch). At the same time, refactor the per-page `<Topbar />` mounts into a single shared layout under a route group. This is one PR that locks in the "every authenticated page has the same chrome" rule structurally - so the next route someone adds (the /clients page that's coming) inherits it for free instead of recreating Round 1's orphan-page bug. Two hours of work, but it sets up the next 6 months of routes to be consistent without anyone having to think about it.

These three together would close the only correctness/a11y gaps left in the IA, make the most strategic feature discoverable, and structurally guarantee the IA stays coherent as the route tree grows toward `/clients`, `/help`, and the inevitable settings sub-routes. Everything else - the breadcrumb-into-topbar collapse, the Cmd+K palette, the URL hash anchors, the data-model migration - can wait for the quarter.
