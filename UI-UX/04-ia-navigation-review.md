# TheraNotes-AI - Information Architecture & Navigation Review

**Reviewer perspective:** Senior IA / UX strategist (Stripe, Vercel, Linear lineage)
**Method:** Walk every route in `app/`, read every layout/topbar/sidebar component, trace user journeys against clinician mental models. (Live browse tool unavailable in this environment, so findings are sourced from definitive code reads of the route tree, layouts, navigation components, and page-level state machines - the rendered DOM is fully determined by what these components produce.)
**Date:** 2026-05-10

---

## 1. Actual Sitemap (what exists today)

Walking `/Users/ceazar/code-base/TheraNotes-AI/app/`:

```
/ (app/page.tsx)                 server-side redirect
 |-- if user        -> /generate
 |-- if no user     -> /login
 |
/login                           full-screen Supabase Auth UI (no Topbar)
 |   on SIGNED_IN  -> /generate
 |
/generate          [DEFAULT LANDING]                Topbar visible
 |  state-machine, single page, three visual modes:
 |    (a) intake form (default)
 |    (b) ProgressScreen (in-flight)
 |    (c) FormattedReport + bottom action bar (success)
 |  on success ----> auto-redirect to /workspace/<id> after 1.5s
 |
/reports                                            Topbar visible
 |  ReportList -> grid of ReportCard
 |  card click -> /workspace/<id>
 |  per-card delete with 3s confirm
 |  "Clear N failed" bulk action
 |
/workspace/[id]                                     NO Topbar (its own chrome)
 |  TocSidebar | tn-ws-topbar (breadcrumbs) | PaperScroll | WorkspaceFooter
 |  In-app "Reports" breadcrumb -> /reports
 |  Sidebar shows: Draft progress %, TOC, NDIS Planner Review summary
 |  Footer: Saved status, Print, Run NDIS review, Download DOCX
 |
/settings                                           NO Topbar (its own back link)
 |  "<- Back to Generate" link
 |  Upload Exemplar form
 |  Uploaded Exemplars list (delete each)
 |
API routes (not user-facing):
/api/chat | /api/companion | /api/generate | /api/ingest |
/api/refine | /api/reports/[id] | /api/review | /api/revise
```

**Reachability map:**

| Page | Reachable from | Orphan? |
|---|---|---|
| `/login` | `/` redirect, sign-out | no |
| `/generate` | Topbar, brand mark, root redirect, sign-in, "Add more notes" | no |
| `/reports` | Topbar, "Open in workspace" sibling link, workspace breadcrumb, workspace 404 fallback | no |
| `/workspace/[id]` | Report card click, post-generate auto-redirect, "Open in workspace" | only via list - no global "recent reports" jump |
| `/settings` | Topbar | partial - the "Tip" banner on /generate references "Settings" but isn't a link |
| `/api/*` | internal only | n/a |

**Key absent routes a user might expect (and would type):**

- `/clients` - none. Clients are a denormalised string field on assessments.
- `/clients/<id>` - none.
- `/reports/<id>` - none. The id namespace is `/workspace/<id>` even though the list lives at `/reports`. URL/IA mismatch.
- `/workspace` (no id) - 404. Would naturally redirect to `/reports`.
- `/account`, `/billing`, `/team`, `/help`, `/exemplars` - none.
- `/search` or Cmd+K - none.

**Orphan / hard-to-reach:**

- The "Tip: upload your previous FCA reports in Settings" banner on /generate is plain text - "Settings" should be a link, it isn't.
- Settings doesn't render the Topbar (verified in `app/settings/page.tsx` and `app/settings/layout.tsx`), so once you are in Settings you cannot reach Reports without going Back-to-Generate-then-up. Two clicks to do a one-click thing.

---

## 2. Topbar / Global Nav

**Source:** `components/layout/topbar.tsx` + `user-menu.tsx`

**Items:**
- Brand mark (Sparkles + "TheraNotes") -> `/generate`
- "Generate" -> `/generate`
- "Reports" -> `/reports`
- "Settings" -> `/settings`
- Avatar (initials of email) -> dropdown with email label and "Sign out"

**Active state logic:**
```js
isActive =
  pathname === item.href ||
  (item.href === '/generate' && pathname === '/') ||
  (item.href === '/reports' && (pathname.startsWith('/reports') || pathname.startsWith('/workspace')))
```
Reports stays highlighted when in `/workspace/<id>` - good intent. But the Topbar is **not rendered** on `/workspace/<id>` (workspace has its own chrome) or on `/settings`, so this active state only ever resolves on `/generate` or `/reports`. The "where am I" cue is wasted.

**Findings:**

| Issue | Mental model expected | Mental model delivered | Fix | Priority |
|---|---|---|---|---|
| Topbar disappears on /workspace and /settings | "I'm always on the same site, I see where I am at a glance" | App splits into 3 separate visual chrome systems | Render a slim Topbar on workspace and settings, OR keep Topbar visible on settings but allow workspace its full-bleed mode (still link out to Reports/Settings via a compact menu) | P0 |
| Avatar dropdown only contains "Sign out" | "Profile, Account, Preferences, Help, Sign out" | Just sign out | Add Account, Help/Docs, Keyboard shortcuts, Theme | P2 |
| No "Help / What's new" affordance | Most SaaS has a `?` or doc link | Nothing | Add a `?` icon with quick keyboard tour | P2 |
| Brand mark and "Generate" point to the same URL | Distinct affordances usually mean distinct destinations | Two ways to do the same thing | Brand goes `/generate`, "Generate" stays - but mark "Generate" in sentence-case as the verb, and let the brand mark be a logo home. Acceptable as-is, low priority | P2 |
| No global Cmd+K | Search any client, jump to any report, go to any flag | None | Cmd+K palette (clients, reports, flags, sections, settings, "new report") | P1 |

---

## 3. Page-level Navigation

### 3a. /generate

The page mixes **three jobs** into one route: intake, in-flight progress, and post-gen results. The state machine is:

```
intake form  --click Send-->  validation panel (first click) --confirm-->
   ProgressScreen  -->  FormattedReport + bottom action bar
   (then auto-redirect to /workspace/<id> after 1.5s)
```

**Issue: nothing explains the 3-step nature.**
A new user landing on `/generate` sees an intake form and doesn't know that (a) clicking Send shows a validation pass first, (b) generation takes ~3 minutes, (c) they will be redirected to a workspace. There is no progress hint, no step indicator, no estimated time.

**Issue: chip "+ Sensory / + Scores / + Mental health / + Goals" appears below the textarea** but the collapsible intake fields above already cover Sensory, Scores, Goals. The chips append text into the notes textarea instead of opening the relevant collapsible. Two parallel data-entry paths for the same data.

**Issue: nothing in the page tells the user they have 4 prior reports.**
There is no "Continue last draft", no "Recent reports" rail. The path back to /reports is a single Topbar click but it isn't surfaced when it would be most useful (the empty state of an intake form for a returning user).

| Issue | Mental model expected | Delivered | Fix | Priority |
|---|---|---|---|---|
| No 3-step indicator | "Step 1: notes -> Step 2: AI drafts -> Step 3: workspace edit" | Looks like a one-shot form | Add a 3-dot stepper above the title: "1 Notes / 2 Draft / 3 Refine". Highlight step 1 | P1 |
| Quick-add chips conflict with collapsibles | One canonical place to enter sensory data | Chips append plaintext while collapsible sets structured data | Reframe chips as "expand & focus" - clicking "+ Sensory" opens the Sensory collapsible and scrolls to it | P1 |
| No "Recent reports" surface for returning users | Two-clicks-from-anywhere to my open drafts | Topbar Reports only | Add a 3-row "Continue editing" strip at the bottom of /generate showing 3 most recent drafts | P1 |
| "Tip: upload your previous FCA reports in Settings" - Settings is not a link | One click to act on the suggestion | Read it, navigate manually | Make "Settings" a Link to `/settings?tab=exemplars` | P0 |

### 3b. /workspace/[id]

**Sidebar (`TocSidebar`):**
- Brand mark + collapse toggle
- Draft progress %
- "Report" label, then per-section TOC items with edited dot + per-section flag count badge
- "Document" label, then static "Appendices" / "Signatures" buttons (no `onClick` handlers - dead clicks)
- NDIS Planner Review summary with severity counts and top-4 list
- "Review all N" button

**Topbar within workspace (`tn-ws-topbar`):**
- Back button "<- Reports"
- Then text "Reports / FCA - <name> · Ready · <date>"
- Right side: "Find" (button only, no functionality wired in this file), "NDIS Review"

**Footer (`WorkspaceFooter`):**
- "Saved just now" / "Saving..."
- Print / Run NDIS review / Download DOCX

**Findings:**

| Issue | Expected | Delivered | Fix | Priority |
|---|---|---|---|---|
| "Appendices" and "Signatures" sidebar items have no handler | Click navigates / inserts | Dead buttons | Either wire them up or remove until shipped | P0 |
| "Find" button in workspace topbar has no `onClick` | Cmd+F-style search overlay | Button does nothing | Wire to a panel, or remove | P0 |
| Two back affordances side-by-side ("<- Reports" button and the breadcrumb word "Reports" both link to /reports) | One canonical back | Two | Drop the duplicate; keep just the breadcrumb chain | P1 |
| No client/case context in breadcrumb | "Reports / Peter Parker / FCA - 2026-01-27" | "Reports / FCA - Peter Parker · Ready · <date>" | Add a Client level once clients become a real entity (P2 if linking to a client page exists) | P2 |
| Run NDIS review appears in three places (sidebar "Review all", topbar "NDIS Review", footer "Run NDIS review") | One canonical action | Three | Keep footer + sidebar "Review all", drop topbar duplicate | P2 |
| Sidebar "Document" group has only stubs, but its existence implies more | Real navigation | Stubs | Hide group until wired | P0 |
| Status pill "Ready / Draft" lives in breadcrumb text node | A visual badge, not body text | Inline italic | Promote to a Badge component matching the report list cards | P2 |

### 3c. /reports

**Strengths:** clean grid, status colour, time-relative date, per-card delete with confirm, bulk "Clear N failed", graceful empty state with CTA back to /generate.

**Gaps:**
- No filter (by status, by participant, by month).
- No search box for participant name or NDIS number.
- No "New report" button at the top - the implied CTA is in the empty state only. A returning user sees their list and has no big "+" anywhere.
- No grouping by client. With 50+ reports the list becomes a flat scroll.
- No sort control - hard-coded `updated_at desc`.
- Card title "FCA - <name>" is the only identifier; no NDIS number visible to disambiguate two clients with same first name.
- "Clear N failed" is borderline destructive, ghost-styled, no separate visual hierarchy.

| Issue | Expected | Delivered | Fix | Priority |
|---|---|---|---|---|
| No "+ New report" button on /reports | Big CTA, top-right | Only in empty state | Add primary button "+ New report" -> /generate | P0 |
| No search/filter | Search, status filter, date filter | Flat list | Add a filter bar (search, status pills) | P1 |
| Cannot disambiguate clients with same name | Show NDIS number | Only name + section count | Add NDIS number in card subhead | P1 |
| "Clear N failed" treated as ghost | Destructive bulk actions visually distinct | Quiet ghost | Style as outline-destructive with a confirm modal | P2 |

### 3d. /settings

**Strengths:** simple, focused, clear empty state.

**Gaps:**
- Topbar removed -> orphaned.
- "Settings" implies more than just exemplars (Account, Team, Billing, Preferences) but the page has only one job.
- No tab structure even though future settings will need it.
- Back link lives at top-left; this is fine but inconsistent with workspace's breadcrumb pattern.

| Issue | Expected | Delivered | Fix | Priority |
|---|---|---|---|---|
| No Topbar on /settings | Same global nav everywhere | Custom back link | Render Topbar; rename page heading to "Settings - Exemplars" | P0 |
| No tab structure | Sidebar/tabs (Exemplars, Account, Profile, Billing, Team) | Single column | Add a left rail with sections, even if only "Exemplars" is wired today (gives it room to grow) | P1 |

---

## 4. URL Design

| Current URL | Issue | Better |
|---|---|---|
| `/workspace/<uuid>` | UUIDs are unfriendly, unbookmarkable, leak nothing about content | `/reports/<short-id>` or `/reports/<slug>` (e.g. `peter-parker-2026-01-27`) |
| `/reports` (list) and `/workspace/<id>` (detail) | Same noun should share the prefix | Move detail to `/reports/<id>`, make /workspace either a verb-mode or remove |
| `/generate` (verb URL) | Acceptable for a primary action, but most SaaS uses noun-based with `?new=true` | Acceptable. Could be `/reports/new` if collapsing into the reports namespace |
| No `/clients` | Clients aren't first-class | Add `/clients` and `/clients/<id>` once data model supports it |
| Settings has no sub-routes | All settings on one page | `/settings/exemplars`, `/settings/account`, `/settings/team` |

**Deep-linkability:**
- `/workspace/<id>` is bookmarkable - good.
- No anchors per section (e.g. `/workspace/<id>#part-d`). The TOC scrolls but doesn't update the URL. Sharing "scroll here" is impossible.
- No query params for state (e.g. `?review=1` to open the NDIS review panel). All state is in-component.

---

## 5. Going Between States

| Action | Where you land | Affordance | Verdict |
|---|---|---|---|
| Generate completes | /workspace/<id> after 1.5s success banner | Auto-redirect with delay | OK, but 1.5s is short. Consider showing a "View in workspace" button alongside the auto-redirect for power users |
| Click "Open in workspace" on /generate success | /workspace/<id> | Subtle text link `var(--tn-muted-1)` | Underweighted. This is the next primary action - make it a Button |
| Export DOCX from /generate success | File download, stays on /generate | OK | OK |
| Export DOCX from /workspace | File download, stays on /workspace | OK | OK |
| Click TOC item in workspace | Smooth scrolls to heading; sets `activeSection` | Doesn't update URL hash | Add `replaceState` so URL becomes `#partD-functional` and is shareable |
| Click flag in sidebar | Calls `jumpTo` to its section, but does NOT open the flag detail/refine panel | Just a scroll | Should expand the flag inline or open a side panel |
| Click "Reports" breadcrumb in workspace | /reports | Two adjacent buttons that do the same thing | Collapse to one |
| After delete on /reports | Stays on /reports, item removed from list optimistic | OK | OK |
| Sign out | /login | OK | OK |
| 404 on /workspace | "Back to Reports" button | Good | OK |

---

## 6. Mental-Model Alignment

A clinician's mental model:

```
my caseload (clients)
  |- this client (Peter Parker, NDIS 430...)
       |- their FCA report (one or more over time)
            |- sections within that FCA
                 |- flags in that section
```

What the app surfaces (from `lib/template.json`, `assessments` table, `reports` table, `sections`, `planner_review`):

```
assessments (technical row)  ----- 1:1 ------  reports (technical row)
   participant_name (string)         sections (jsonb)
   ndis_number (string)              planner_review.flags (jsonb)
   assessor_*, intake_metadata
```

**Gap:** the entire "client" abstraction is missing. Clients exist only as denormalised name strings on individual assessments. A clinician with two FCAs for Peter Parker (initial + review) sees them as two unrelated cards. There is no client view, no "see all reports for this client", no client edit, no contact history.

**Gap:** the URL says `/workspace/<id>` but the list says "Reports". Workspace is technical jargon (Plate editor's term); Reports is the domain noun. Mixing both in the URL/UI is confusing.

**Gap:** "Sections" is exposed both as the report's structure (Part A, Part B, etc.) AND as a backend term ("Will generate 5 of 8 sections"). The clinician thinks in Parts. The "8 sections" framing leaks the template count.

**Gap:** "Assessment" appears in code (`assessments` table, `assessment_id` field) but never in user-facing copy except "Assessor & Assessment Details" - which conflates the assessment date with the report. From the clinician's view there is no separate assessment entity.

| Mental model leak | Where | Fix |
|---|---|---|
| `assessment_id` and `report_id` are different things | Database, but not yet leaking to UI - watch for it | Hide; surface only "Report" |
| "Will generate 5 of 8 sections" | /generate footer | Reframe as "Will draft 5 of 8 parts of the FCA. Add data above to unlock the others." |
| "Workspace" as URL/page name | /workspace/<id> | Rename route to `/reports/<id>`. Keep "Workspace" as an internal layout component name |
| Client is a string field, not an entity | Throughout | New `clients` table; new `/clients` page; everywhere a name appears, link to client |

**The right top-level noun is "client / case", not "report".** Reports are documents that belong to a case. A long-term clinician will eventually have multiple reports per client. Building the IA around Report-as-root will hit a wall in 12 months.

---

## 7. Breadcrumbs

Only `/workspace/<id>` has anything resembling breadcrumbs - and it has a duplicate (back button + breadcrumb word both link to /reports). /reports has a flat heading. /settings has a one-step "<- Back to Generate" link that isn't a breadcrumb.

**Where breadcrumbs would help most:**
1. /workspace - eventually `Clients / Peter Parker / FCA 2026-01-27`. Today it's just `Reports / FCA - Peter Parker`.
2. /settings - `Settings / Exemplars` once tabs land.
3. /clients/<id>/reports - once the client entity exists.

**Simple rule the codebase isn't following:** breadcrumbs should be the only back affordance. Drop the duplicate "<- Reports" button next to "Reports / ..." breadcrumb.

---

## 8. Search & Jump

**None of the following exist:**
- Cmd+K palette
- Per-page search (the workspace "Find" button is a dead UI - no `onClick`)
- Recent items / pinned items
- Search by participant name on /reports
- Search by NDIS number anywhere
- Jump-to-flag from a global view

**The "Find" button in workspace topbar is a wireframe-only element** - confirmed in `workspace-layout.tsx` lines 372-374, no handler. P0 to either implement or remove.

**Recommended additions, by priority:**
1. P0: kill or wire the workspace "Find" button.
2. P1: search box on /reports filtering participantName + NDIS number client-side.
3. P1: Cmd+K palette - clients, recent reports, sections, flags, settings.
4. P2: per-section quick-find inside the workspace editor (it's a Plate editor, so hooking native ctrl+F is fine, but a styled overlay is better).

---

## 9. Discoverability

**Settings:**
- Reachable via Topbar.
- Nudged via "Tip" banner on /generate, but the word "Settings" is not a link.
- The exemplar upload is the *real* differentiator (RAG-powered style) and most users will never know it exists. The Tip banner is dismissible and lost forever.

**Workspace exemplars / refining flow:**
- The Refine panel exists in `components/workspace/refine-panel.tsx` but I see no entry point in `workspace-layout.tsx`. It is **structurally orphan** unless triggered by a flag click - and flag click only does `jumpTo`. Verify that the refine panel is reachable; if not, P0.

**Empty states:**
- /reports empty state: link to /generate. Good.
- /settings empty state: text only, no CTA - "No exemplars uploaded yet" doesn't push you to the upload form which is right above. Fine, mild.
- /generate has a banner CTA but no example/sample notes button. A "Try a sample case" button populating the form would unblock first-run users.

| Discoverability gap | Fix | Priority |
|---|---|---|
| "Settings" word in tip banner not a link | Make it a Link | P0 |
| Refine panel may not be reachable from sidebar flag clicks | Wire `onOpenFlag` to open refine panel, not just jumpTo | P0 |
| First-run user has nothing to click to learn the app | "Try a sample case" button on /generate that prefills participant + clinical notes | P1 |
| Exemplar upload is hidden until you go to Settings | Surface "Add exemplar" CTA on first /reports load if no exemplars exist | P1 |

---

## 10. Affordance Consistency

**Inconsistencies found:**

| Affordance | Used as | Used as elsewhere | Fix |
|---|---|---|---|
| Send arrow button (round, with ArrowUp icon) | Submit clinical notes on /generate | Nowhere else | OK - it's the chat-style send convention |
| "Open in workspace" link | Subtle muted text link | Same destination clicked from /reports is a primary card | Promote to Button on /generate success bar |
| Delete | Inline `Trash2` icon button on report card AND on exemplar list | Both ghost-style | Both should be visually destructive (red on hover) |
| Sign out | Inside avatar dropdown | OK | OK - destructive-but-not-data-destructive, dropdown is fine |
| Run NDIS review | Topbar (workspace), sidebar (workspace), footer (workspace) | 3 places, 2 different visual styles (ghost vs outline vs icon-prefixed) | Pick one canonical place - I'd say footer + sidebar "Review all". Drop topbar |
| "<- Back" affordance | Topbar back button on workspace + breadcrumb word both link to /reports | /settings uses "<- Back to Generate" link | Standardise on breadcrumbs everywhere |
| Status pills | Badge component on /reports | Inline italic text in /workspace topbar | Use Badge in both |
| "Find" button in workspace | Has icon, looks active | No handler | Remove or implement |
| Quick-add chips on /generate ("+ Sensory") vs collapsible sections | Two ways to enter same data | Confusing | Make chips open the matching collapsible |

---

## 11. Information Density & Grouping

### /generate - intake form ordering

Current order:
1. Identity row (Participant name, NDIS number, Assessor)
2. Client Details (DOB, plan dates, address, NOK)
3. Assessor & Assessment Details (credentials, mode, dates)
4. WHODAS scores
5. Sensory Profile
6. NDIS Goals
7. Clinical notes (free text)
8. Send button + quick-add chips

**This order is wrong for the user's mental flow.** Clinicians type their session notes first (in /generate, that's the textarea at the bottom). They want to dump notes, then verify metadata, then click send. Today they scroll past 6 collapsibles before reaching the textarea.

**Better order:**
1. Participant name + NDIS number (1 line)
2. Clinical notes textarea (the big input, immediately visible)
3. Quick-add chips (immediately under)
4. "Add intake details" expander group (collapsed by default, contains all 5 current collapsibles + assessor)
5. Section preview ("Will generate 5 of 8 parts")
6. Send

This is the ChatGPT-pattern: input first, options second.

### /workspace sidebar

Current grouping:
- Draft progress (top, fine)
- "Report" group with sections
- "Document" group with Appendices, Signatures (both dead)
- NDIS Planner Review summary (bottom)

Better:
- Progress
- Sections (rename "Report" - sections ARE the report)
- NDIS Review
- (Cut "Document" group entirely until wired)

---

## 12. Cross-Link Map (Desired Adjacency)

For each major page, these are the screens that should be 1 click away:

### /generate (entering a draft)
- /reports (Topbar) - have it
- Continue last draft (3 most recent) - **missing**
- /settings/exemplars (banner CTA) - **missing as a link**
- "Try a sample case" - **missing**
- Sign out (avatar) - have it

### /reports
- /generate (Topbar + "+ New report") - half-have it (only Topbar, no top-right CTA button)
- /workspace/<id> (card click) - have it
- /clients/<id> for each card - **missing (clients don't exist yet)**
- /settings - have it
- Search / filter bar - **missing**

### /workspace/<id>
- /reports (breadcrumb) - have it (with duplicate)
- /clients/<id> for the client - **missing**
- Previous/next report for same client - **missing**
- /settings/exemplars - **missing** (relevant since exemplar quality drives this output)
- Sign out (avatar) - **missing entirely - no Topbar here**
- /generate to start a new report - **missing**

### /settings
- /generate (current "Back" link) - have it
- /reports (Topbar) - **missing - Topbar not rendered**
- Sign out (avatar) - **missing - same reason**

---

## Proposed Sitemap (4-6 weeks out)

```
/                                  redirect (auth-aware)
/login

/                                  marketing/landing OR /generate redirect
/dashboard                         (NEW) recent reports + drafts + caseload summary
/clients                           (NEW) caseload list, search, filter
/clients/<slug>                    (NEW) one client: identity, all reports, contact, history
/clients/<slug>/new-report         (NEW) prefilled /generate scoped to this client
/reports                           list of all reports across clients
/reports/<id>                      (RENAMED) was /workspace/<id>
/reports/<id>?review=1             (NEW) deep link to NDIS review pane
/reports/new                       (NEW alias) -> /generate flow
/generate                          (kept) generic entry without client context

/settings                          (default redirects to /settings/profile)
/settings/profile                  name, credentials, AHPRA, signature
/settings/exemplars                (current settings page contents)
/settings/team                     (NEW) future
/settings/billing                  (NEW) future
/settings/notifications            (NEW) future
/help                              (NEW) docs / shortcut cheat sheet
```

---

## Proposed Primary Nav

**Topbar (persistent on EVERY page including workspace and settings):**

```
[Logo] [Dashboard] [Clients] [Reports]  ........  [+ New report] [?] [Cmd+K] [Avatar]
```

- Logo -> /dashboard
- Dashboard - your today view
- Clients - caseload (NEW IA pillar)
- Reports - all reports (current /reports)
- Primary "+ New report" button (right side, primary colour)
- Help icon (?) - docs and shortcuts
- Cmd+K palette trigger (desktop) - icon hint
- Avatar dropdown - Profile, Settings, Sign out (Settings moves OUT of top-level nav into avatar)

**Why "Settings" leaves the topbar:** it's accessed once per month per user, not every session. The topbar is for things you click multiple times an hour. Move it to the avatar dropdown like Linear, Stripe, Vercel.

**Workspace deviation:** workspace gets a slim version of the same Topbar (logo + breadcrumb + actions on right). Don't lose global nav - just make it 40px tall and let the document take focus.

---

## Three Mental-Model Leaks

1. **"Will generate 5 of 8 sections"** on /generate footer.
   - The clinician thinks in **Parts A-E** of an FCA. "8 sections" is the template-author count (header + overview + assessment process + parts A-E + signatures = 8). The user counts 5 (A through E). Mismatch.
   - **Fix:** "Will draft Parts A-E plus header. Pending: Part D (need scores), Part E (need goals)."

2. **"Workspace"** as the URL and page concept.
   - This is Plate-editor jargon. The clinician opened a *report*, not a *workspace*. The breadcrumb says "Reports / FCA - Peter Parker" - good - but the URL says `/workspace/<uuid>` and the page chrome differs from the rest of the app. The terminology bleed is small but constant.
   - **Fix:** rename URL to `/reports/<id>`. Internal component can still be called WorkspaceLayout.

3. **"Assessor & Assessment Details" collapsible** mixes assessor identity (which is the OT, persistent across reports) with assessment metadata (date, mode - which belongs to this specific report).
   - Behind this lives a real entity confusion: in the database, `assessments` and `reports` are 1:1 today, but conceptually `assessor` belongs to the OT's profile, `participant` to the client, `assessment` (the one-off encounter) to the report. The UI conflates all three in one collapsible.
   - **Fix:** "Assessor (you)" should auto-fill from settings/profile - never re-typed. "This assessment" should contain only date + mode + report date. Splitting these two reflects how clinicians actually think and removes the most-typed field on the page.

---

## Findings Summary by Priority

### P0 (ship blocker for IA polish)
- /workspace dead buttons: "Find", "Appendices", "Signatures" - wire or remove.
- "Tip" banner "Settings" should be a Link.
- Topbar missing on /workspace and /settings - users lose global nav.
- /reports has no top-right "+ New report" CTA outside empty state.
- Verify Refine panel is actually reachable from a flag click; today the click only `jumpTo`s.
- Quick-add chips on /generate compete with collapsible intake sections - confusing duplicate.

### P1
- Reorder /generate: clinical notes textarea above intake collapsibles.
- "Open in workspace" success link -> primary Button.
- Cmd+K global palette (clients, reports, sections, settings).
- Search/filter on /reports (participant name, status, date).
- "Recent reports" rail on /generate for returning users.
- Settings tab structure (room to grow).
- Three-step indicator on /generate ("Notes -> Draft -> Refine").
- Map sidebar TOC click to URL hash for shareable deep links.

### P2
- Avatar dropdown beyond just Sign out (Account, Help, Theme).
- Group /reports cards by client once a `clients` table exists.
- Status pill consistency (Badge everywhere).
- Drop duplicate "back" affordance in /workspace topbar.
- Help / docs link in Topbar.

---

## If I Had to Fix Three Things First

If I had one afternoon, I'd: **(1) wire or delete the three dead buttons** in workspace ("Find", "Appendices", "Signatures") because dead UI corrodes user trust faster than missing UI - either implement them now or hide them until Q2; **(2) keep the Topbar persistent on every authenticated page** (workspace and settings included), so users always know where they are and have one-click access to Reports / Generate / Settings / sign-out from anywhere - this single change collapses the app's three different chrome systems into one and is a 30-line refactor; **(3) rename `/workspace/<id>` to `/reports/<id>` and add a top-right "+ New report" button to /reports**, because today the URL namespace fights the navigation namespace ("Reports" tab takes you to the list, but the detail lives at /workspace) and the most-used CTA on the most-visited page is hidden in an empty state. These three changes together would tighten the IA dramatically without touching the data model, the AI pipeline, or the editor.
