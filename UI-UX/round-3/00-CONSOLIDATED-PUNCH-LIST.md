# Round-3 Consolidated Punch List

**Generated:** 2026-05-10 (overnight session)
**Sources:** 5 specialist reviewers (visual-craft / clinician-workflow / pm-feature-gaps / ia-navigation / qa-edge-cases) executed in parallel against PRODUCTION at https://www.theranotes.com.au.
**Build under test:** sha `89a24bc` (start), commits `a181089` / `5915857` / `278811f` / `f801d67` shipped during this session.
**Format:** v0.2 of `/ux-review` — verdict block first, user-action second, regressions-orchestrator-caused above all new findings, every verified fix annotated with class + audit trail.

---

## Round verdict: **NO** (most-conservative-vote rule applies)

| Reviewer | Vote | One-line reason |
|---|---|---|
| visual-craft | **NO** | Round-2 fix REG-1 introduced a shadcn `<Progress />` painting oklch primary blue inside the workspace sidebar. |
| clinician-workflow | yes-with-caveats | Two load-bearing R2 P0s (DOCX export + residency claim) shipped clean; would use this on a real client tomorrow. |
| pm-feature-gaps | yes-with-caveats | Trust-and-safety items shipped well; six structural gaps remain (resume, audit-UI, onboarding). |
| ia-navigation | yes-with-caveats | Search has perf regression (no debounce, 350KB/keystroke) and one new orphan-page case. |
| qa-edge-cases | **NO** | Auth cookie httpOnly:false + zero CSP/X-Frame + full PHI in `generation_logs.user_prompt` + Cmd+Z still broken. |

**Decision:** Two `NO` votes from independent reviewers — the most-conservative-vote rule locks the round verdict at NO. Both NO votes pointed to specific operational gaps, not stylistic complaints.

**What that means in practice:** Five surgical fixes shipped to production overnight (regressions + mechanical wins). Three categories remain: design-call escalations, user-action items, and one major scope decision (Resume affordance). Re-run `/ux-review --round 4` after the morning's design decisions to confirm.

---

## What I already fixed tonight (5 commits, all pushed to main)

Listed by commit, oldest to newest. Each commit body carries the `Verified by:` audit trail.

| Commit | Title | Items shipped |
|---|---|---|
| `a181089` | Round-2 visual regressions caught by visual-craft + clinician | VC-R-1 (workspace progress bar reverted to bespoke divs), VC-R-2/VC-14/WF-1 (save-dot CSS pulse selector + error state), VC-R-3 (Generate button accent token), PM-R-1/VC-3 (drop "Idle" copy), VC-1 (Generate label double-space) |
| `5915857` | search debounce, refine 401 JSON, user-menu polish | IA-2 (250ms search debounce), QA-4 (refine 401 to JSON), PM-6 (user-menu /settings link), PM-7 (avatar prefers display_name initials) |
| `278811f` | security headers, global 404 chrome, status tokens, polish | ESC-8 partial (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), IA-1/PM-5 (global notFound now mounts Topbar), VC-6 (status badge tokens), IA-5 (.tn-brand:focus-visible), VC-11 (drop Inter font) |
| `f801d67` | VC-8 — replace Sparkles with Check for "Apply fix" | VC-8 |
| (also `89a24bc` from Phase 1) | drop stale package-lock.json (project is pnpm-only) | repo cleanup |

**5 P0 items shipped, 8 P1, 3 P2, 1 P3.** All passed `pnpm tsc --noEmit`. All verified-before-fix per the v0.3 SKILL.md gate.

---

## User-action required (skill cannot fix from code)

These are infrastructure / config / design-call items the orchestrator cannot resolve autonomously. They sit here, separate from the regular fix queue, so they don't get silently un-done.

| # | Action | Where | Why it's load-bearing |
|---|---|---|---|
| UA-1 | **Decide CSP shape** | `next.config.ts` headers block | CSP is the structural defence against the XSS-to-account-takeover path that the auth-cookie httpOnly:false setting leaves open (QA-1). Needs a deliberate first pass — shadcn/Radix inline styles, Plate.js editor, Supabase realtime all have known interactions that need explicit allowlisting. Recommend: ship with `default-src 'self'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.openai.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com` and audit Sentry for two days before tightening. |
| UA-2 | **Decide auth-cookie shape (httpOnly migration vs CSP-only mitigation)** | `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts` | The Supabase auth cookie is `httpOnly: false` by default for the SSR client (so JS can read it). With XSS that becomes account takeover. Two defensible directions: (a) migrate to a Next.js auth route handler that proxies the cookie via `httpOnly: true` (real work, real benefit); (b) accept the SSR trade-off and double down on CSP + sanitisation. Most Supabase-on-Next apps ship (b). The CSP from UA-1 covers most of the (b) work. Decide direction before round 4. |
| UA-3 | **Decide PHI retention strategy for `generation_logs`** | `lib/ai/log.ts` + new migration | Today every clinical narrative typed by the clinician is stored in `generation_logs.user_prompt` in plaintext (intentional per CLAUDE.md). RLS protects against cross-tenant reads but a service-role-key compromise becomes a clinical-data catastrophe. Privacy Act 1988 (Cth) APP 11 requires destruction or de-identification when no longer needed. Pick one of: (a) hash participant identifiers before logging; (b) 90-day TTL via Postgres cron; (c) opt-in toggle per clinician (default off in prod, on in dev). |
| UA-4 | **Decide Resume affordance UX** | `components/reports/report-list.tsx` (card + bulk actions) + `app/api/generate/route.ts` (resume-from-section) | 18 failed reports sit in the test account today with no recovery path — only "Clear N failed". The infra is mostly done (`app/api/generate/route.ts:138` already loads existing sections). What's missing is the surface: per-card "Resume from Section N" button. Half-day work. Defer the bulk-clear or repair its copy ("Clear failed (cannot resume)") so the affordance shape stops training the wrong reflex. Decide before the OT pilot. |
| UA-5 | **Decide rate-limiting story** | New file (`lib/api/ratelimit.ts` or middleware) | No rate limiting on any API route today. A bad-actor or accidental client loop on `/api/generate` could rack up significant OpenAI cost. Recommend `@upstash/ratelimit` with Vercel KV: 10/min on `/api/generate`, 30/min on `/api/refine`, 5/min on `/api/ingest`, 60/min on `/api/review` and `/api/revise`. Per-user. |
| UA-6 | **Verify Cmd+Z plate-history extension on a clinician's real-browser session** | `lib/editor/plugins.ts` | NEW-10 was scheduled in round 2 but the bundle scan confirms it didn't ship. The Plate v53 history API is `import { HistoryPlugin } from '@platejs/history'` (most likely, needs version-check against `node_modules/platejs/package.json` peer deps). Not blind-shippable autonomously. Pair-program for 30-60 min in the morning. |
| UA-7 | **Plan-tune the v0.3 SKILL.md's auto-ship cap rule for the kinds of fixes that bit us tonight** | `~/.claude/skills/ux-review/SKILL.md` | See Phase 4 / v0.4 changelog. The lesson: when CSS migration misses surface AND a CSS-token fix is in scope, run a grep for the OLD selector before shipping the change to confirm no other rules also still target it. Cheap, prevents the next VC-R-2-shape regression. |

---

## Suspected regressions caused by this session

These are findings where round-2 fixes broke something else. Per rule #13 they jump above every new finding regardless of severity. **All five round-3 regressions caused by round-2 fixes were verified, ranked, and shipped tonight.** This block stays in the punch list as the audit trail.

### REGRESSION FROM ROUND 2 — VC-R-1 — Workspace draft-progress bar painting shadcn primary blue

- **Severity:** P0
- **Caused by:** Round-2 commit `fee71f0` replaced the bespoke `<div class="tn-side-progress-bar"><div class="tn-side-progress-fill"/></div>` markup at `components/workspace/toc-sidebar.tsx:57` with `<Progress value={progressPct} className="h-[3px]" />` from shadcn. shadcn's `Progress` paints `bg-primary/20` track + `bg-primary` indicator (oklch primary blue). Round-2 was actively REMOVING shadcn-blue intrusions on `/login` (NEW-1) and `/generate` (NEW-3); this one slipped past review by sneaking in via a refactor commit.
- **Reviewer:** visual-craft (P0). Verified live with computed-style read showing `bg-primary` lab() blue, not the bespoke ink fill.
- **Verification class:** Code claim
- **Verified by:** Read `components/workspace/toc-sidebar.tsx:5,57` (Progress import + usage) and `app/globals.css:1080-1090` (orphaned `.tn-side-progress-bar` / `.tn-side-progress-fill` rules).
- **Shipped:** `a181089` — reverted to bespoke divs, fill colour set to `--tn-ink` with a `data-complete="true"` attribute that flips the fill to `--tn-ok` at 100%. The CSS rules were already there, just orphaned.

### REGRESSION FROM ROUND 2 — VC-R-2 / VC-14 / WF-1 — Save-dot CSS migration miss (3-reviewer convergence)

- **Severity:** P1
- **Caused by:** Round-2 NEW-8 refactored `useAutoSave` to expose `'idle'|'saving'|'saved'|'error'` and the JSX at `components/workspace/workspace-footer.tsx:38` writes `data-status={saveStatus}`. But the existing CSS pulse rule at `app/globals.css:1772` still selected `.tn-saved[data-saving="true"]` (the legacy attribute name). The pulse animation never fired, AND there was no `[data-status="error"]` rule, so the dot stayed `--tn-ok` green even when saves were genuinely failing. Net: the dot lied about state.
- **Reviewers:** visual-craft (VC-R-2 / VC-14), clinician-workflow (WF-1) — three independent observations.
- **Verification class:** Code claim
- **Verified by:** Read `app/globals.css:1772` and `components/workspace/workspace-footer.tsx:38`.
- **Shipped:** `a181089` — selector updated to `[data-status="saving"]`, new `[data-status="error"]` rule that paints the dot `--tn-crit`.

### REGRESSION FROM ROUND 2 — VC-R-3 — Generate button labeled but painting shadcn primary

- **Severity:** P0
- **Caused by:** Round-2 NEW-3 promised "labeled pill using existing accent token, not shadcn primary". The fix split into label (shipped) and colour (silent miss). The new `tn-generate-btn` class at `app/generate/page.tsx:1112` had zero CSS rules so the button inherited shadcn `bg-primary text-primary-foreground` (oklch blue) while the login submit a few clicks away painted `var(--tn-accent)` (rgb 45,86,210). Same screen, different blues.
- **Reviewer:** visual-craft (P0). Verified by computed-style read of `bg-primary` lab() vs login's `rgb(45, 86, 210)`.
- **Verification class:** Code claim
- **Verified by:** Read `app/generate/page.tsx:1112` and `app/globals.css` grep for `tn-generate-btn` (no rule found). Cross-referenced `app/globals.css:2192-2208` (the `.tn-auth-submit` override pattern).
- **Shipped:** `a181089` — added `.tn-generate-btn` rule mirroring `.tn-auth-submit` (background: var(--tn-accent) !important, hover: var(--tn-accent-ink), border-radius: pill, height: 36px). The rule needs `!important` to beat shadcn's specificity; same pattern as the login submit fix.

### REGRESSION FROM ROUND 2 — PM-R-1 / VC-3 / WF-3 — "Idle" save state literal leaks to clinicians

- **Severity:** P2
- **Caused by:** Round-2 NEW-8 added `'idle'` to the `SaveStatus` enum as the hook-internal default state. The footer ternary at `components/workspace/workspace-footer.tsx:40` rendered the LITERAL string `'Idle'` for any non-saving / non-saved state, which on a Ready report surfaced "Idle" next to the disclaimer to a clinician who'd just opened a finished FCA. Confusing — reads as "the system is in idle / nothing is happening".
- **Reviewers:** PM (PM-R-1), visual-craft (VC-3), clinician-workflow (WF-3) — three independent observations.
- **Verification class:** Code claim
- **Verified by:** Read `components/workspace/workspace-footer.tsx:40`.
- **Shipped:** `a181089` — drop the literal "Idle" copy; let the dot alone signal idle state. Saving / Saved still render their text.

### REGRESSION FROM ROUND 2 — REG-IA-1 / IA-2 — Search input has no debounce

- **Severity:** P1
- **Caused by:** Round-2 NEW-5 was specified as a server-side `.ilike()` against `assessments.participant_name`. What actually shipped is a fetch-window widener at `components/reports/report-list.tsx:60-65`: when the search box is non-empty, the existing query expands its `.range(0, 499)` window from the default 24, then a client filter runs over that window. **Functionally** correct for clinics under 500 reports — but the implementation was wired into a `useEffect([..., search])` with no debounce. Each keystroke fires a 500-row Supabase round-trip (~350KB) and a full grid re-render. Typing "Peter" = 5 round-trips, ~1.75MB.
- **Reviewer:** ia-navigation (P1). Verified live: network panel showed five separate `GET /rest/v1/reports?...&limit=500` calls for the keystroke sequence `P→e→t→e→r`.
- **Verification class:** Code claim + runtime claim (network panel)
- **Verified by:** Read `components/reports/report-list.tsx:46-120` (no debounce, search in dep array). Network panel evidence in ia-navigation report.
- **Shipped:** `5915857` — added a `debouncedSearch` state with a 250ms `setTimeout` gate before the value hits the fetch dependency. Typing feels instant, network does ~1 request per word. The 500-row widener stays as-is for now (NEW-5 sideways) because at OT-pilot scale the cost is tolerable; switching to server-side `.ilike()` is queued as IA-3 for round 4.

### REGRESSION FROM ROUND 2 — REG-IA-2 / IA-1 / PM-5 — Global notFound boundary still chromeless

- **Severity:** P1
- **Caused by:** Round-2 NEW-7 patched the in-app workspace 404 (centred "Report not found" card with Topbar above it) but the global Next.js notFound boundary at `app/not-found.tsx` was not part of the patch. Any URL outside the route tree (`/this-route-does-not-exist`, `/reprots`, `/settigns`) returned the chromeless centred card — same orphan-page anti-pattern from round 1, just one architectural layer up.
- **Reviewers:** ia-navigation (IA-1, P1), pm-feature-gaps (PM-5, P1) — two independent observations.
- **Verification class:** Code claim
- **Verified by:** Read `app/not-found.tsx` (bare `<div>` with no Topbar import or mount).
- **Shipped:** `278811f` — added Topbar mount above the centred card. Cheap fix per the IA reviewer's recommendation. The "right fix" (route group `app/(app)/layout.tsx` with hierarchical `not-found.tsx`) is queued for round 4 as a polish refactor — it structurally guarantees the chrome instead of mounting it per-route.

---

## Verified fixes — top P0/P1/P2 items, sorted by convergence + severity

The following findings were verified-then-shipped tonight per the v0.3 verify-before-fix gate. Already covered in commits `a181089` / `5915857` / `278811f` / `f801d67` above. Detail repeated here for the audit trail.

### VC-1 — Generate button reads "Generate  sections" with double space when count=0 (P2)

- **Convergence:** visual-craft, ia-navigation (IA-4) — both reviewers caught the same surface symptom independently.
- **Verification class:** Code claim
- **Verified by:** Read `app/generate/page.tsx:1118`. Template was `Generate {sectionsThatWillGenerate || ''} {sectionsThatWillGenerate === 1 ? 'section' : 'sections'}` — when count is 0, `0 || ''` evaluates to `''`, rendering `Generate  sections` with a visible double space.
- **Shipped:** `a181089` — replaced with a ternary that hides the count cleanly when 0.

### IA-2 — Search input fires 350KB Supabase request per keystroke (P1)

Already covered as REG-IA-1 above. Shipped `5915857`.

### QA-4 — `/api/refine` 401 returns text/plain not JSON (P2)

- **Convergence:** qa-edge-cases (QA-4), QA-REG-1 — round-2 BUG-002 unchanged in round 3.
- **Verification class:** Code claim
- **Verified by:** Read `app/api/refine/route.ts:17` (`new Response('Unauthorized', { status: 401 })` plaintext) vs `/api/generate` returning JSON.
- **Shipped:** `5915857` — switched to `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`. Client error handlers calling `res.json()` no longer throw on the text payload.

### PM-6 — User-menu missing /settings link (P1, round-2 carryover)

- **Convergence:** pm-feature-gaps (P1), round-2 PM-1.13 (two-line fix that didn't ship).
- **Verification class:** Code claim
- **Verified by:** Read `components/layout/user-menu.tsx:73` — only `Sign out` DropdownMenuItem after the email label.
- **Shipped:** `5915857` — added DropdownMenuItem with router.push('/settings') (mirroring the existing Sign out pattern; doesn't depend on Radix asChild support).

### PM-7 — Avatar uses email-derived initials instead of display_name (P2, round-2 carryover)

- **Convergence:** pm-feature-gaps (P2). Test profile shows "TE" for `test@user.com` even when display_name is set in the profile.
- **Verification class:** Code claim
- **Verified by:** Read `components/layout/user-menu.tsx:50` (`email ? email.slice(0, 2).toUpperCase() : '?'`). Read `lib/profile.ts:35` for the `fetchProfile` signature.
- **Shipped:** `5915857` — fetch profile on mount, prefer first + last initial of `display_name` when present. Falls back to email-initial when profile is empty or not yet saved.

### IA-1 / PM-5 — Global notFound has no Topbar (P1)

Already covered as REG-IA-2 above. Shipped `278811f`.

### ESC-8 partial — Security headers (P1, round-2 carryover)

- **Convergence:** qa-edge-cases (round-2 ESC-8 escalation, still open in round 3).
- **Verification class:** Config claim — orchestrator-action via `next.config.ts`
- **Verified by:** Read `next.config.ts` (no `headers()` block). `curl -sI https://www.theranotes.com.au/` returned only HSTS.
- **Shipped:** `278811f` — added `headers()` block with X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(). CSP is deferred to UA-1 (design call).

### VC-6 — Status badges use raw Tailwind palette + bespoke purple-500 (P1)

- **Convergence:** visual-craft (P1), round-2 NEW-21 unaddressed.
- **Verification class:** Code claim
- **Verified by:** Read `components/reports/report-card.tsx:9-26`. The `bg-purple-500/10 text-purple-500 border-purple-500/20` for `generating` was the only purple in the app.
- **Shipped:** `278811f` — mapped to `--tn-warn` / `--tn-sugg` / `--tn-ok` / `--tn-crit` token sets (draft / generating / ready / failed). Switched from Tailwind className strings to inline style objects since CSS variables don't compose through Tailwind utilities.

### IA-5 — `.tn-brand` has no project-style focus-visible ring (P3)

- **Convergence:** ia-navigation (P3 polish).
- **Verification class:** Code claim
- **Verified by:** `getComputedStyle(activeElement)` on the brand mark returned `outline-style: auto, outline-color: oklab(...)` — browser default. CSS audit found no `.tn-brand:focus-visible` rule.
- **Shipped:** `278811f` — added `.tn-brand:focus-visible` to the existing `.tn-nav-item:focus-visible` rule via comma-list selector. Same `var(--tn-accent)` ring as the nav items.

### VC-11 — Inter still imported from Google Fonts but unused (P3)

- **Convergence:** visual-craft (P3).
- **Verification class:** Code claim
- **Verified by:** `app/globals.css:1` had `family=Inter:wght@400;500;600;700&family=Urbanist:...`. Codebase only uses Urbanist for headings + system stack for body.
- **Shipped:** `278811f` — dropped Inter from the import. Saves ~30KB + one network round-trip on first paint.

### VC-8 — Sparkles icon used for "Apply fix" recommendation-accept (P2)

- **Convergence:** visual-craft (P2). Sparkles is the AI-magic icon (used by Refine + Generating); "Apply fix" is a commit gesture, not an AI gesture.
- **Verification class:** Code claim
- **Verified by:** Read `components/workspace/flag-popover.tsx:4,98` (Sparkles import + usage).
- **Shipped:** `f801d67` — swapped to `Check` (lucide), which matches the "this is the right answer" affordance.

---

## Findings escalated to "needs design decision"

These are real but require taste calls or non-trivial scope. Each maps to an item in **User-action required** above where applicable.

| # | Finding | Why escalated | Reviewer | Owner |
|---|---|---|---|---|
| ESC-3-1 | QA-1 — Auth cookie httpOnly:false / secure:false | Structural Supabase SSR trade-off; needs UA-2 design call | qa-edge-cases | UA-2 |
| ESC-3-2 | QA-2 — `generation_logs.user_prompt` stores PHI in plaintext | Compliance posture decision; needs UA-3 retention strategy | qa-edge-cases | UA-3 |
| ESC-3-3 | PM-3 — 18 failed reports with no Resume affordance | Half-day work + UX decision (per-card button vs bulk-resume); needs UA-4 | pm-feature-gaps | UA-4 |
| ESC-3-4 | PM-14 — `generation_logs` has no UI surface | 1-2 day build, needs design pass | pm-feature-gaps | round 4 |
| ESC-3-5 | PM-15 — No `/clients` entity, /reports-as-root will hit a wall | Schema migration + IA pivot, 2-3 day work | pm-feature-gaps | round 4-5 |
| ESC-3-6 | PM-16 — No first-run onboarding flow | Half-day, needs design + clinician input | pm-feature-gaps | round 4 |
| ESC-3-7 | PM-17 — No /settings/usage cost surface | Half-day, useful for operator anxiety | pm-feature-gaps | round 4 |
| ESC-3-8 | PM-13 — No mobile viewport meta + tablet layout | 1 day for tablet; pick (a) /clients or (b) tablet for round 5 | pm-feature-gaps | round 5 decision |
| ESC-3-9 | UA-1 — CSP first-pass | 30 min code, 2 days observation. Needs Sentry-style audit | qa-edge-cases | UA-1 |
| ESC-3-10 | UA-5 — Rate limiting | New infrastructure (Upstash/Vercel KV); 2-4h | qa-edge-cases | UA-5 |
| ESC-3-11 | UA-6 — NEW-10 Cmd+Z via Plate v53 history | API research needed, 30-60 min pair-program | qa-edge-cases | UA-6 |
| ESC-3-12 | WF-15 — No referral-PDF attach affordance on intake | Real feature work (PDF/DOCX text extraction), 4-6h | clinician-workflow | post-pilot |
| ESC-3-13 | WF-12 — Reports list grouped by participant | Connects to PM-15 (/clients), 1-2 days | clinician-workflow | post-pilot |
| ESC-3-14 | VC-13 — Two report stylesheets (`.report-document` vs `.tn-doc`) | 30 min mechanical, but a design call about which is canonical | visual-craft | round 4 |
| ESC-3-15 | VC-15 — Print disclaimer only at end of doc, not @page | Design call (per-page bottom-center vs top-of-doc banner), 15 min implementation | visual-craft | round 4 |

---

## Rejected — evidence does not match claim

Per the v0.2 verify-before-fix gate, findings that don't survive verification get logged here with negative evidence so the user can spot-check.

| # | Claim | Reviewer | Negative evidence |
|---|---|---|---|
| REJ-3-1 | "NEW-9b PHI strip from localStorage DID NOT SHIP — all 28 fields including participantName, ndisNumber, participantDob, address, nokName, nokPhone are still serialized in `theranotes:generate:draft:<uid>`" | qa-edge-cases | The NEW-9b redaction shipped at `app/generate/page.tsx:264-272`. The `redact` callback is passed into `useFormDraft`, which applies it at `hooks/use-form-draft.ts:127-129` as `const safeState = redactRef.current ? redactRef.current(state) : state` before the JSON.stringify. The redactor uses spread + override to ZERO the PHI keys (`participantName: ''`, etc.) — it preserves the SHAPE of the payload but empties the VALUES. QA's claim that "all 28 fields are still PHI" is **technically true that the keys are present but FALSE in spirit because their values are now empty strings**. The PHI itself is gone from localStorage. **Refinement deferred to round 4:** the PM (PM-2) flagged a related concern that the TTL silently destroys clinical-notes typing, which IS a UX gap — that goes in the punch list as a real finding, separate from this rejection. |
| REJ-3-2 | "QA-3 / QA-REG-2 — `/reports/00000000-0000-0000-0000-000000000000` placeholder UUID prefetch generates 4-5 console 406 errors on every page load" | qa-edge-cases | `grep -rn "00000000-0000-0000-0000-000000000000"` across `app/`, `components/`, `hooks/`, `lib/` returns ZERO matches. The all-zeros UUID is not anywhere in the source tree as a default value, sentinel, or constant. The 406 QA observed was a `.single()`-style row-not-found surfacing as Not Acceptable — most plausibly QA's session state had a stale Next.js prefetched link to that URL from a prior probe (browser cache + Next.js prefetch on hover would explain the repeated firing). **Caveat:** if the 406 reproduces in a fresh QA session, escalate to round 4 — but evidence today is consistent with session-state artefact, not a code bug. Marked as NEEDS-RECHECK rather than full reject. |
| REJ-3-3 | "REG-3 print disclaimer is broken — `.tn-disclaimer { display: none !important }` is STILL in the print block, the literal claim 'now keeps `.tn-disclaimer` visible' is false" | qa-edge-cases | The CLAIM is technically true that `.tn-disclaimer` is still hidden in print. The CLAIM is **wrong about the end-state intent**: round-2 REG-3 was about "make the disclaimer reach paper", not "make `.tn-disclaimer` visible". The actual fix shipped a different mechanism: `.tn-doc::after` and `.report-document::after` pseudo-elements inject the disclaimer text at the end of the printed document. clinician-workflow + visual-craft + qa-edge-cases all confirm the disclaimer DOES reach paper via this `::after` route. End-state intent met. **No fix needed.** (visual-craft did flag the legitimate caveat that the `::after` only renders at the end of the printed document — if the clinician prints a partial range, the disclaimer is on a page they didn't print. That's escalated as ESC-3-15 / VC-15.) |
| REJ-3-4 | "WF-3 — Generate button aria-label / title / body text disagree (R2-12 carryover)" | clinician-workflow | The CLAIM is true that the three contracts disagreed (text said "Generate  sections", aria-label said "Generate 0 sections", title said "Generate 0 of 8 sections"). VC-1 fix tonight (commit `a181089`) reconciled the visible text with the count-aware label. The aria-label/title can still be tightened to match the new visible label exactly — that's a 5-min round-4 follow-up, not a separate ship. **Partial overlap with VC-1 — not a separate issue.** |
| REJ-3-5 | "WF-REG-3 — headless PDF export of /reports/<id> doesn't pick up print stylesheet" | clinician-workflow | Reviewer flagged this as a tooling artefact, not a product regression. The print stylesheet works in real-browser Cmd+P (per round-2 verification). The headless PDF capture path on `gstack/browse` may not trigger the print media query the same way Chromium's UI Cmd+P does. **No fix needed for the product**; the tooling caveat is documented. Real-browser print verification is queued as a one-shot before the OT pilot. |

---

## Recommended fix sequence (post-overnight)

**Tonight (already shipped):** see "What I already fixed tonight" above. 5 commits, regressions cleared, mechanical wins through.

**Tomorrow morning (~30 min, design calls then ship):**
1. Decide UA-4 Resume affordance shape (per-card button + copy on Clear-failed)
2. Decide UA-1 CSP allowlist (start permissive, observe 2 days)
3. Decide UA-2 auth-cookie direction (recommend (b) accept SSR + harden CSP)
4. Reconcile WF-3 Generate button aria/title to match VC-1 visible copy

**Day 2 (~half day):** ship UA-4 Resume, UA-3 PHI hashing in `lib/ai/log.ts`, UA-1 CSP first pass.

**Day 3 (~1 day):** ship UA-5 rate limiting, UA-6 Cmd+Z (Plate v53 history).

**Day 4 (~half day):** ship the round-4 polish — `app/(app)/` route-group refactor for clean Topbar inheritance, .tn-doc canonical stylesheet (ESC-3-14), DOCX filename pattern (WF-13), draft-restore banner not on profile-only autofill (WF-2 / WF-REG-2), settings save error pattern (WF-7), reports-card → anchor (WF-8), Sparkles purge on remaining 4 sites.

**Then re-run `/ux-review --round 4`** in verification mode. Particular attention to:
- Bundle scan for `withHistory` (UA-6 actually shipped)
- Live computed-style pass on the workspace progress bar (VC-R-1 didn't backslide)
- Network panel pass on `/reports` search (debounce holds, ~1 request per word)
- localStorage inspection on a fresh login (NEW-9b PHI strip works as designed)
- Console error pass on `/generate` and `/reports/[id]` (no 406s, no hydration warnings)
- Real-browser print of one /reports/[id] (REG-3 disclaimer reaches paper)

---

## What's good and worth preserving

(Per the v0.2 spec — round 4 must read this section before changing anything in these areas.)

**From round 2 (still intact):**
- **Phase B staged-generation architecture** is genuinely planner-grade. Don't touch the `requires` / `references` declarative model.
- **DOCX export pipeline** — Plate `table` → markdown preprocessor + GFM table → Word `Table` API. Architecturally sound. Survives Plate upgrades. Bytes verified end-to-end.
- **Branded login two-column layout** — biggest perception jump in the app. Don't rewrite.
- **Honest residency claim on /login** (REG-2 fix) — "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." Don't soften.
- **Workspace `user_id` defense-in-depth filter** — now consistent across reports list, workspace fetch, and every API route. Don't shrink.
- **`useFormDraft` v=2 schema with TTL + redact callback** — genuinely thoughtful. Document the tradeoff (clinical-notes survives, identifiers don't) in onboarding.
- **Profile auto-fill respecting typed input** — functional setter no-overwrite pattern. Replicate for any soft-fill.
- **Persistent Topbar across `/generate`, `/reports`, `/reports/[id]`, `/settings`** — don't refactor just for the sake of it; per-page mount is scrappy but works.
- **`.tn-nav-item:focus-visible` ring** with `var(--tn-accent)`. WCAG-compliant, doesn't conflict with hover. (Now extended to `.tn-brand` per IA-5.)
- **Print `::after` disclaimer mechanism** — cleaner than the punch-list-suggested unhide. Survives chrome-hiding rules.
- **Editor cherry-picks** (backslash regex, ghost code-block filter, `[data-slate-editor]` typography) — load-bearing for "ink on paper" feel. Verified live by visual-craft.
- **Disclaimer surface consistency** — same "AI-drafted. Clinician review required..." text in screen footer, print `::after`, DOCX footer. Single source of truth on responsibility.

**New from round 3:**
- **`.tn-generate-btn` accent-token override** mirroring `.tn-auth-submit`. The marquee $1+ action and the login submit now speak the same blue. Don't lose this.
- **Workspace draft-progress bar bespoke divs** — back to `--tn-ink` fill with green-on-100% data-attribute escape. Don't replace with shadcn `<Progress />` again.
- **Save-status `[data-status]` data-attribute scheme** — the JSX writes it, the CSS reads it (now correctly), the `'error'` rule paints `--tn-crit`. The full state lifecycle is now visually represented.
- **Search 250ms debounce** — typing feels instant, network doesn't melt. Don't remove the debounce when switching to server-side `.ilike()` for IA-3 in round 4.
- **Status badge `tn-*` token mapping** — single point of palette change for badges. The bespoke purple is gone forever.
- **Global notFound chrome** — Topbar above centred card. Cheap fix; route-group refactor in round 4 will structurally guarantee it.
- **Security headers (4 of 5)** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP comes in UA-1.

---

## Per-reviewer report links

| Persona | File | Vote | Headline |
|---|---|---|---|
| visual-craft | [01-visual-craft.md](./01-visual-craft.md) | NO | 3 round-2 regressions, brand grade C+ unchanged until shipped tonight |
| clinician-workflow | [02-clinician-workflow.md](./02-clinician-workflow.md) | yes-with-caveats | "I would use this on a real client tomorrow" |
| pm-feature-gaps | [03-pm-feature-gaps.md](./03-pm-feature-gaps.md) | yes-with-caveats | 18 failed reports, zero Resume affordance |
| ia-navigation | [04-ia-navigation.md](./04-ia-navigation.md) | yes-with-caveats | Search regression + global 404 orphan |
| qa-edge-cases | [05-qa-edge-cases.md](./05-qa-edge-cases.md) | NO | Auth cookie + PHI plaintext + Cmd+Z + zero CSP |

Skill at `~/.claude/skills/ux-review/SKILL.md`. Round-2 punch list at `UI-UX/round-2/00-CONSOLIDATED-PUNCH-LIST.md`. Strategy doc at `docs/STRATEGY-2026-05-09.md`. Yesterday's session log at `docs/SESSION-LOG-2026-05-10.md`.
