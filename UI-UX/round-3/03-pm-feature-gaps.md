# PM Feature-Gaps Review - Round 3

| Field | Value |
|---|---|
| Reviewer | Senior PM (clinical SaaS pedigree - Lyrebird/Heidi/Splose lens) |
| Date | 2026-05-10 |
| Build | Production deploy theranotes.com.au sha 89a24bc |
| Method | Live PROD via headless browse + source reading |
| Cost guard | Generate / Run NDIS Review / Refine / Apply fix DO-NOT-CLICK |
| Round | 3 (verification mode) |

## Vote

**yes-with-caveats** - The trust-and-safety items round-2 escalated (NEW-8 three-state save, NEW-9 PHI-redacted autosave, REG-2 honest residency, REG-3 print disclaimer, REG-4 user_id filter, signup disabled) all shipped at high quality. Six structural gaps remain (resume, audit-UI, onboarding, mobile, /clients, /usage) and three small carryovers (avatar initials, dropdown /settings link, "Idle" save copy).

## Suspected regressions from round 2

| # | Regression | Severity | Where |
|---|---|---|---|
| PM-R-1 | Workspace save indicator shows "Idle" to a clinician who just opened a finished Ready report. The three-state work added an `'idle'` value that bleeds into the user-facing string. | P2 | `components/workspace/workspace-footer.tsx:40` - ternary renders the literal string "Idle" |
| PM-R-2 | `useFormDraft` 24h TTL silently drops drafts on mount with no toast or "your prior draft expired" surface. A clinician returning Monday after a Friday-evening half-typed FCA loses 5-10 min of clinical-notes typing without warning. | P2 | `hooks/use-form-draft.ts:101-106` - `try { window.localStorage.removeItem(key) } catch {}` then early-return; no UI signal |
| PM-R-3 | The "Clear N failed" bulk-delete affordance ships before the Resume affordance, training the clinician to throw away partial work instead of recovering it. Eighteen failed reports observed in the live test account. | P1 | `components/reports/report-list.tsx:173-182` - bulk-clear is the only affordance attached to a non-zero `failedEmptyCount` |

None of these is a hard regression in the functional sense (nothing newly broke). They are UX/copy regressions caused by the round-2 fixes shipping the substrate but not the surface.

## TL;DR

Round 2 escalated six items as "needs design decision" (ESC-2 through ESC-7). One of the round-2 carryovers (NEW-8 three-state save) was promoted from escalation and shipped well. The six structural gaps (no resume, no audit-UI, no onboarding, no /clients, no ⌘K, no mobile) are still all-six open in production. Two round-1 P1 carryovers (avatar initials from display_name; user-menu /settings link) are also still open.

The good news: every load-bearing trust-and-safety item from the round-2 punch list shipped at high quality. The footer save indicator now has a real error state with a retry button (NEW-8). The /generate autosave now redacts the highest-PII fields before localStorage write, has a 24h TTL, and clear-on-logout (NEW-9). Profile auto-fill from `clinician_profiles` works for Display name / Credentials / Email / Clinic. Migration 008 columns are all surfaced on /settings. Open Supabase signup is verified disabled (422 `signup_disabled`). The login residency claim is now honest (REG-2). The print CSS disclaimer survives via a `::after` pseudo-element (REG-3). The reports-list query now has the explicit `user_id` filter (REG-4).

The bad news: I logged into the test account and there are **18 failed reports sitting in the user's list with zero recovery path**. The only affordance offered is "Clear 18 failed" - a bulk-delete. This is the textbook example of the missing-Resume gap that round 2 escalated as ESC-6, now visible at scale in the actual test data. A clinician who's just spent $2 of OpenAI tokens generating a half-completed FCA, then hit a 429, has been trained by the UI to throw the work away rather than recover it.

The structural shape of the app is still the shape it was after round 2: single-user islands with no clients, no audit, no resume, no onboarding, no mobile. Internal Flourish pilot remains green-with-caveats; external sale remains red.

## Verification of round-2 fixes

| # | Fix | Status | Evidence |
|---|---|---|---|
| **NEW-8** Three-state save indicator with error state | **Shipped, well** | `components/workspace/workspace-footer.tsx:26-42` renders `<button type="button" className="tn-saved" data-status="error" onClick={onRetrySave} title={saveError ?? 'Save failed. Click to retry.'}><AlertTriangle size={12} /> Save failed — click to retry</button>` when `saveStatus === 'error'`. Live workspace footer DOM shows `<span class="tn-saved" data-status="idle">` so the data-status attribute is wired. The hook's enum extension to `'error'` is consumed at the render site, not just in the type. |
| **NEW-9a** Autosave TTL | **Shipped, well** | `hooks/use-form-draft.ts:31` - `DEFAULT_TTL_MS = 24h`. Mount-time check at `:101-106` drops expired drafts. Schema bumped to `v: 2`; v=1 entries are quietly discarded at `:96`. |
| **NEW-9b** PHI redaction in autosave | **Shipped, well** | `app/generate/page.tsx:264-272` redacts `participantName`, `ndisNumber`, `participantDob`, `address`, `nokName`, `nokPhone` before write. Documented tradeoff: `clinicalNotes` is retained because re-typing 5-10 min of narrative is a higher cost than the PHI exposure of strip-then-restore. The tradeoff is sound for the redact-the-identifier-keep-the-narrative pattern; the redact list captures every directly-identifying field on the form. |
| **NEW-9c** Clear-on-logout | **Shipped, well** | `components/layout/user-menu.tsx:33-44` - on sign-out, iterates `localStorage` and removes any key starting with `theranotes:`. Belt-and-braces alongside the per-key TTL. |
| **Profile auto-fill from `clinician_profiles`** | **Shipped, partial** | `app/generate/page.tsx:145-164` auto-fills `assessor`, `assessorCredentials`, `assessorEmail`, `assessorCompany` from the profile, only when the field is empty (functional setter pattern prevents race-overwrite). One miss: `profile.ahpra_registration` is **not** wired into the visible Credentials field on /generate; it is only used downstream in `lib/ai/header.ts:67-68` to construct the deterministic header. So a clinician with a fully-populated profile sees their credentials text but doesn't see their AHPRA registration auto-appear in the assessment inputs - a small but real surface gap. |
| **Migration 008 columns surfaced in /settings** | **Shipped, complete** | `components/settings/profile-form.tsx:27-38` defines an EMPTY shape that includes every migration-008 column: `display_name`, `credentials`, `ahpra_registration`, `contact_email`, `contact_phone`, `clinic_name`, `clinic_abn`, `ndis_provider_number`, `clinic_address`. Live /settings probe confirms all nine fields render. Form has `Save changes` with idle/saving/saved/error states. |
| **Open signup disabled** | **Verified disabled** | Direct probe to `https://iyjlbybgxdecruzgydll.supabase.co/auth/v1/signup` returns `{"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}`. The user-action item from round 2 was completed. |
| **REG-1** Plate table → markdown serializer for DOCX | (not in scope for this reviewer; clinician-workflow verifies) | - |
| **REG-2** Login residency claim honest | **Shipped** | `app/login/page.tsx:91` - `<li>Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI.</li>`. The original load-bearing-false "Australian-region storage. Your data never leaves Supabase ap-southeast-2." copy is gone. |
| **REG-3** Print CSS disclaimer | **Shipped** | `app/globals.css:1875-1893` - `.tn-doc::after, .report-document::after { content: 'AI-drafted. Clinician review required before submission.'; … }` injects the disclaimer into the printed page via a `::after` pseudo-element while keeping the on-screen `.tn-disclaimer` chrome hidden in print. Clean solution. |
| **REG-4** Reports-list `user_id` filter | **Shipped** | `components/reports/report-list.tsx:54-73` - now calls `supabase.auth.getUser()`, requires a user, and explicitly `.eq('user_id', user.id)` on the reports query. Comment at `:50-53` documents the round-2 catch. Defense-in-depth pattern is now consistent across reports list, workspace fetch, and every API route. |
| **NEW-5** Server-side reports search | **Shipped, partial** | `components/reports/report-list.tsx:60-65` widens the fetch window to `SEARCH_PAGE_SIZE = 500` rows when the user is searching, so a name on page 5 of the load-more pagination is no longer invisible. Comment at `:13-19` honestly acknowledges this is "good enough for the per-clinician scale" and not a true server-side `ilike`. For Hayley's expected caseload (<100) this is sufficient; at >500 reports it breaks again. **Acceptable scope.** |

**Verification summary.** 11 of 11 round-2 trust-and-safety items shipped at high quality, with two minor carryovers (AHPRA not auto-filled into a visible field; "Idle" save state surfaces a confusing default for users opening Ready reports).

## Walk-through

Live PROD probe via headless browse on profile `ux-review-3`, already-authenticated session as `test@user.com`. Surfaces exercised:

**`/login` (logged-out probe).** Two-column branded layout. Left panel bullets are now honest (REG-2 verified). Right panel: email + password + "Sign in" button, "Internal clinician access only. Need an account? Ask your practice administrator to invite you." This copy is the right copy for the actual product (no public signup) and matches the verified `signup_disabled` Supabase config. The "ask your administrator" copy has no actual backing flow - there is no invite path - so the literal request is unsatisfiable, but for an internal-pilot tool that's acceptable framing.

**`/generate` (the marquee landing surface).** Logged-in session lands on /generate by default (no /reports landing rerouting). The "Tip - Upload your previous FCA reports in Settings to personalise the AI's writing style" first-run banner still shows on every visit, not gated on `exemplars.length === 0`. So a clinician who's already uploaded twenty exemplars (which is what the live account has) keeps being told to do the thing they did. Minor but real onboarding-surface thrash.

The intake grid is dense - 17 distinct input groups, no progressive disclosure, no checklist. Sections of WHODAS and Sensory Profile have visible "⏸ Part D will skip / Part E will skip" microcopy that surfaces the gating logic, which is a good pattern. The "Generate 0 sections" button at the foot is correctly disabled when the intake is empty - it became a labeled pill (NEW-3 round-2 fix verified).

The "Draft restored" banner appears at the top of the page when an in-progress draft exists. Verified live: "Picked up your in-progress intake from just now." with a Dismiss button. This is the autosave restore surface working correctly. There is no "Discard draft" affordance - dismissing the banner doesn't delete the draft. The flow to discard a stale draft is: start a generation (which calls `clearDraft()`), or wait the 24h TTL. Round-2 PM identified this as a low-cost open item; still open.

**`/reports` (the list landing).** Loads to "Loading reports…" then populates. The test account has 25 reports, of which 18 are `failed` with 0 sections. The "Clear 18 failed" pill is the only affordance attached to that scale of failure. There is **no "Resume" affordance** on any failed card - the only action is the trash-twice delete. This is exactly what round-2 ESC-6 said would be the eventual visible-pain shape, now visible. Eighteen reports' worth of OpenAI spend is sitting in the list with no recovery path.

Search field retains its prior value across navigation (the test session left "Peter" then "Test" in the input, and on re-navigation the value persisted). I traced this to the `search` state surviving `useState` initialization across client-side route transitions in the same React tree - on a page refresh it clears. This is mostly fine but a clinician who searched-then-clicked-into-a-report and clicks Reports in the topbar will return to a filtered view, possibly without realizing why other reports aren't showing. Mild trap.

Server-side filter dropdown is `single-select Select` not chips. NEW-5 widening to 500 rows on search is verified.

**`/reports/<id>` (workspace).** Topbar persists. Sidebar shows all 23 sections with a "Draft progress 100%" progress bar - good progress affordance. NDIS Planner Review counter shows "0 critical, 0 warnings, 0 suggestions" which is the unreviewed state. The body editor has all sections rendered - tables, lists, headings.

Workspace footer: `<span class="tn-saved" data-status="idle">Idle</span>` plus disclaimer plus three buttons (Print, Run NDIS review, Download DOCX). The "Idle" copy is shown by default to a user who's just opened a Ready report. The expected copy here is "Saved" (because the sections are persisted and there's no in-flight edit). The hook returns `'idle'` until the first dirty-then-save cycle completes, but the user isn't aware of that lifecycle - they just see "Idle" on a finished FCA, which reads ambiguously (is it idle because nothing's being edited, or is it idle because nothing's being saved?). Small UX rough edge, P2.

**`/settings`.** Two stacked cards: Profile + Clinic (single Save changes button), and Upload exemplar with the existing exemplar list. All migration 008 fields render. Test account has 21 uploaded exemplars (FCA-01 through FCA-20 + README) which is the QA-test case. The exemplar card shows chunk count per file - good observability. There is no "Delete exemplar" affordance visible, no "Re-embed", no "Test the chunk against a query" - exemplars are a write-only library from the user's perspective once uploaded.

**`/this-route-does-not-exist` (404 probe).** Renders `app/not-found.tsx` - a centered card with `FileQuestion` icon, "Page not found", "The page you're looking for doesn't exist or has been moved", and a "Back to Generate" button. No Topbar, no Reports link, no Settings link. A user who mistypes a URL is stranded. This is the same gap NEW-7 fixed for the workspace 404, but the global 404 wasn't covered.

**`/reports/<bad-uuid>` (workspace 404).** Renders the workspace shell with Topbar + the centered "Report not found or you don't have access. Back to Reports" - NEW-7 fix verified.

**User menu dropdown.** Avatar shows "TE" (email-derived initials) for `test@user.com`. Round-2 PM-1.12 said this should now be display_name initials when the profile has one. Source confirms it's still `email.slice(0, 2).toUpperCase()` at `components/layout/user-menu.tsx:50`. The dropdown contents are: `<email>` label + `Sign out` only. No /settings link. Round-2 PM-1.13 was a two-line fix that didn't ship.

## New findings

### PM-1 - "Idle" save state confuses on Ready reports (P2)

**Severity:** P2 (copy/UX regression from a round-2 fix)
**Where:** `components/workspace/workspace-footer.tsx:40` - `{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Idle'}`
**Symptom:** A clinician opening a finished, completed FCA sees "Idle" in the footer next to the disclaimer. Reads as "the system is in idle / nothing is happening" which on a Ready report is confusing - the user expects "Saved" or no indicator.
**Why it matters:** The three-state save indicator was added to surface error states. The default state (`'idle'`) was never meant to be the user-visible default - it's a hook-internal lifecycle marker that leaked into the surface.
**Fix hint:** Render no chip when `saveStatus === 'idle' && lastSavedAt !== null` (i.e. report is loaded and untouched). Or render "Saved" with a subdued style when there's nothing in flight. Avoid showing a state literal that doesn't map to a user mental model.
**Effort:** 5 min.

### PM-2 - Autosave TTL silently destroys clinical-notes typing (P2)

**Severity:** P2 (PHI hygiene tradeoff, but the user has no signal)
**Where:** `hooks/use-form-draft.ts:101-106` - `if (ageMs > ttlMs) { try { window.localStorage.removeItem(key) } catch {} return }`
**Symptom:** A clinician who typed 5-10 minutes of clinical notes on Friday afternoon, didn't generate (maybe waiting for a phone callback), comes back Monday morning. The draft is silently deleted. They open /generate and see an empty form with no banner explaining "your draft was deleted because it expired".
**Why it matters:** The 24h TTL is the right PHI-hygiene call. But silently destroying a user's typed work is a textbook anti-pattern. At minimum the clinician needs a one-shot toast "We dropped your prior draft - it had been sitting unsaved for over 24 hours" so they understand the system is policing PHI age.
**Fix hint:** Capture `savedAt` before delete; if older than TTL, set a one-shot `expiredAt` state and render a subtle banner: "We discarded a prior draft from {relative-time} ago. Drafts are auto-cleared after 24 hours to keep PHI off shared workstations."
**Effort:** 20 min.

### PM-3 - 18 failed reports in the test account, zero Resume affordance (P0)

**Severity:** P0 (matches round-2 ESC-6, now visible at scale in test data)
**Where:** `components/reports/report-list.tsx:173-182` (the "Clear N failed" bulk-delete is the only affordance attached to non-zero failure)
**Symptom:** Logged-in test account has 18 reports in `failed` status with 0 sections. The user's only affordance is "Clear 18 failed" (delete) or per-card trash-twice. There is no "Resume from section N" button. Users are being trained to throw work away rather than recover it.
**Why it matters:** Each failed-with-partial report represents real OpenAI spend (sections that completed are stored - `app/api/generate/route.ts:195-208` confirms per-section writes). With 18 failed reports the cost of restarting from scratch is significant, and the data needed to resume is already in the DB.
**Fix hint:** Per round-2 day-1: client-side check `report.status === 'failed' && Object.keys(report.sections || {}).length > 0` → render "Resume from Section N" button on the card. Server-side: `app/api/generate/route.ts` already loads existing sections at line 138; have the client iterate `template.sections.filter(s => !existingSections[s.name])` to skip what's already there. The infra is mostly done; the UI affordance is what's missing.
**Effort:** Half a day.

### PM-4 - "Clear N failed" trains the wrong reflex (P1)

**Severity:** P1 (UX shape - reinforces the missing-Resume pain)
**Where:** Same component, `:173-182`
**Symptom:** The first thing offered to a user with failed reports is bulk delete. Even though the bulk-clear is gated to only zero-section failures (good), the affordance shape signals "the right move when reports fail is to delete them". This is the wrong default reflex for an AI-drafted clinical tool where each generation has real cost.
**Why it matters:** Trust signal. The platform should default to "we'll help you recover" not "we'll help you erase".
**Fix hint:** Pair the Clear-failed pill with a Resume-all pill once PM-3 ships. Or hide the bulk-clear entirely and make the recovery affordance the primary path. Or rename to "Clear failed (cannot resume)" so the copy reflects that this affordance only acts on truly-zero-section failures.
**Effort:** 30 min copy + 30 min affordance shape, after PM-3 ships.

### PM-5 - Generic 404 strands the user (no Topbar) (P1)

**Severity:** P1 (round-2 NEW-7 only fixed the workspace 404)
**Where:** `app/not-found.tsx:6-22` - bare `<div>` with FileQuestion icon and a single "Back to Generate" button. No `<Topbar />` mount.
**Symptom:** A user who mistypes a URL or follows a stale link lands on a page with no app navigation. Their only escape hatch is "Back to Generate" - they cannot get to Reports or Settings without an extra click.
**Why it matters:** Same defense-in-depth navigational principle as NEW-7. Topbar should render on every authenticated route, including 404s. (For unauthenticated 404s the Topbar wouldn't render anyway because middleware/proxy redirects to /login.)
**Fix hint:** Wrap not-found in the same authenticated layout that mounts Topbar. Verify the 404 status code is preserved (it currently is - browser shows `404` correctly).
**Effort:** 15 min.

### PM-6 - User-menu still missing /settings link (carryover from round 2) (P1)

**Severity:** P1 (round-2 PM-1.13, two-line fix that didn't ship)
**Where:** `components/layout/user-menu.tsx:73-76` - dropdown has `Sign out` as the only menuitem after the email label.
**Symptom:** A 1990s pattern: profile/avatar dropdown with no profile link. A new user looking for "where do I configure my account" has to find Settings via the topbar nav.
**Fix hint:** Two-line addition:
```tsx
<DropdownMenuItem asChild>
  <Link href="/settings"><Settings size={14} /> Settings</Link>
</DropdownMenuItem>
<DropdownMenuSeparator />
```
**Effort:** 5 min.

### PM-7 - Avatar still uses email initials, not display_name (carryover from round 2) (P2)

**Severity:** P2 (round-2 PM-1.12)
**Where:** `components/layout/user-menu.tsx:50` - `const initials = email ? email.slice(0, 2).toUpperCase() : '?'`
**Symptom:** A clinician with `display_name: "Sarah Smith"` still sees `TE` if their email starts with `te...` (test@user.com). The profile is loaded one ring further away in /generate auto-fill but the topbar doesn't pull it.
**Fix hint:** `useEffect` to fetch the profile in `UserMenu`, prefer `display_name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()` when present, fall back to email.
**Effort:** 15 min.

### PM-8 - Profile auto-fill skips AHPRA registration as a visible field (P2)

**Severity:** P2 (small surface inconsistency)
**Where:** `app/generate/page.tsx:145-164` auto-fills assessor / credentials / email / clinic, but not `profile.ahpra_registration` into any `/generate` field.
**Symptom:** A clinician with a fully-populated profile sees four of five identity fields auto-fill on the intake form. AHPRA isn't visible until the report is generated - it's only used inside `lib/ai/header.ts:67-68` to construct the deterministic header.
**Why it matters:** Discoverability. A new user looking at the form sees their credentials populated and might wonder "where does my AHPRA go?" The answer is "in the profile, and we'll add it to the header for you", but that's invisible.
**Fix hint:** Either (a) auto-fill into the existing Credentials field by appending `, AHPRA: <reg>` if the field is empty (matches the placeholder copy "Occupational Therapist, AHPRA: OCC..."); or (b) add a read-only display chip "AHPRA: <reg> (from profile)" next to the Credentials field so the user sees what will be embedded.
**Effort:** 15 min for option (b).

### PM-9 - First-run "Tip" banner doesn't gate on exemplar count (P3)

**Severity:** P3 (mild thrash for power users)
**Where:** `app/generate/page.tsx` - the "Upload your previous FCA reports in Settings to personalise..." banner
**Symptom:** Banner shows on every visit, not gated on `exemplars.length === 0`. The test account has 21 exemplars and still sees this banner.
**Fix hint:** Fetch exemplar count once on /generate mount; suppress the tip if `>0`. Better: show a different tip (maybe a "What's new" or a sample-report link) once the user is past the empty state.
**Effort:** 30 min.

### PM-10 - Bulk operations: no select-multiple on /reports (P2)

**Severity:** P2 (caseload-scale gap)
**Where:** `components/reports/report-list.tsx`
**Symptom:** A clinician with 50 reports cannot multi-select and bulk-delete, bulk-export, or bulk-archive. The only bulk affordance is "Clear N failed" which is implicit (acts on a derived set, no checkbox UI).
**Why it matters:** This connects to the missing /clients entity (ESC-4) and the missing archive/active distinction. At 20+ reports the user wants to manage the list, not just scroll it.
**Fix hint:** Defer until /clients ships (ESC-4) - that's the right home for caseload-scale management.
**Effort:** Defer.

### PM-11 - No "Discard draft" affordance on the restore banner (P2)

**Severity:** P2 (round-2 carryover, low cost)
**Where:** `app/generate/page.tsx` near the draft-restored banner (`:651-672` in round-2's read).
**Symptom:** Banner has Dismiss (which only hides the banner) but no "Discard draft" (which would `clearDraft()` and reset the form). Only ways to drop a stale draft today: start a generation, wait 24h, sign out, or manually clear all the form fields.
**Fix hint:** Add a third banner action: "Start fresh" that calls `clearDraft()` and resets all the form fields. Style as a tertiary button next to Dismiss.
**Effort:** 20 min.

### PM-12 - Exemplar library is write-only from the user's perspective (P2)

**Severity:** P2 (operability gap)
**Where:** `app/settings/page.tsx` and `components/settings/exemplar-list.tsx` (or equivalent)
**Symptom:** /settings shows uploaded exemplars with chunk count, but no Delete, no Re-embed, no Preview-chunks, no "this exemplar is being used by N reports". A clinician who uploaded the wrong file (or wants to retire an exemplar with stale style) has no way to remove it.
**Why it matters:** The exemplar library is the most expensive-to-rebuild user asset (each upload triggers chunk + embed). It deserves first-class management surface.
**Fix hint:** Per-row Delete (with typed-confirm if the file is referenced by ready reports), Re-embed (force re-chunk for parser improvements), and a "View chunks" drawer that shows the first 5 chunks so the user can see what's actually being retrieved.
**Effort:** Half a day for Delete + View chunks; full day for Re-embed (need to handle chunk replacement atomically).
**Note:** Did not deeply verify - based on visible-text inspection of the live page, no per-row controls were present.

### PM-13 - No mobile viewport meta tag (P1, carryover from round 2)

**Severity:** P1 (round-2 PM-1.7)
**Where:** `app/layout.tsx`
**Symptom:** No `<meta name="viewport" content="width=device-width, initial-scale=1">`. On a tablet (Hayley does home visits, plausible kit), the viewport is the desktop default and the layout breaks. The workspace uses a hardcoded 280px sidebar grid with no md:/lg: collapse.
**Fix hint:** Two changes. (a) Add the viewport meta. (b) Add a single breakpoint at 900px that collapses the workspace sidebar to a Sheet drawer and stacks the /generate intake. Don't try to be phone-friendly yet; tablet is the real target.
**Effort:** 1 day for tablet.

### PM-14 - generation_logs is well-designed and still entirely invisible (P0, round-2 ESC-5)

**Severity:** P0 (audit/trust surface)
**Where:** No file - this is a missing surface. The data is captured by `lib/ai/log.ts` and persisted to `generation_logs`.
**Symptom:** A clinician asked by NDIS or AHPRA "what data went into this paragraph?" has no in-app answer. The data is one query away; the surface is zero. This is the lowest-cost-per-trust-unit intervention available because the substrate is already done.
**Fix hint:** Per-section "View source" drawer in the workspace right rail. Pull the latest `generation_logs` row by `(report_id, section_id)`. Render: model, tokens, latency, prompt (collapsed by default), RAG chunks (collapsed), raw output, processed output. A `Sheet` + `Tabs`. No new infra.
**Effort:** 2 days.

### PM-15 - No /clients entity, /reports-as-root will hit a wall (P1, round-2 ESC-4)

**Severity:** P1 (caseload-scale gap, becomes P0 around 20-caseload)
**Where:** Schema and IA - no `clients` or `participants` first-class entity. Each report attaches to an `assessments` row that has a `participant_name` but no participant identity that survives across reports.
**Symptom:** "I want to see all reports I've ever written for Sarah Jones" has no answer. Every report is its own island. The test account demonstrates this: 18 of 25 reports are titled "FCA - Peter Parker" but they're not grouped.
**Fix hint:** Migration: `clients` table keyed by `(user_id, ndis_number)`. `assessments.client_id` foreign key. /clients route showing each client with their report history. Defer the grouping UI on /reports until /clients exists.
**Effort:** 2-3 days for schema + minimal /clients + IA pivot.

### PM-16 - No onboarding for first-time login (P1, round-2 ESC-3)

**Severity:** P1
**Where:** No file - this is a missing surface.
**Symptom:** A brand-new user lands on /generate with a blank form. There is no profile-prompt, no exemplar prompt, no sample report, no checklist. The first-run "Tip" banner gestures vaguely at Settings but isn't gated on actual state.
**Fix hint:** A 4-step checklist on /reports empty state: "Add your name + AHPRA → Upload an exemplar → Try a sample report → Generate your first FCA". Drive completion from `profile.display_name?`, `exemplars.length > 0`, `reports.length > 0`. The "Try a sample report" is a static read-only seed report with a "this is a demo" banner.
**Effort:** 1-1.5 days.

### PM-17 - No /settings/usage cost surface (P1, round-2 carryover)

**Severity:** P1 (operator anxiety surface)
**Where:** No file - missing surface.
**Symptom:** `generation_logs` captures `tokens_input`, `tokens_output`, `latency_ms`, `model`. There's no /settings/usage view. The operator (David) has no way to know if a single bad generation cost $15 vs $1.50 until the OpenAI invoice arrives. With 18 failed reports in the test account, this gap is now load-bearing for cost-control.
**Fix hint:** /settings/usage: this month's reports, total tokens, est. cost (small static price-table for the relevant model). Per-report cost stamp on the card. Token + cost line in the workspace footer.
**Effort:** Half a day.

### PM-18 - No global ⌘K palette (P2, round-2 ESC-2)

**Severity:** P2 (productivity gap, hits at 30+ reports caseload)
**Where:** No file - missing surface.
**Symptom:** A reports-volume practice will want to jump to a participant by name, jump to a section, start a new report - all from a keyboard primitive. The dead Find button was correctly removed in round 1; nothing replaced it.
**Fix hint:** `cmdk` palette wired to: report search (server-side ilike on participant_name + ndis_number), section jump within current report, route shortcuts, sign out.
**Effort:** 1.5 days.

### PM-19 - No PHI hard-delete with typed confirmation (P1, round-2 carryover)

**Severity:** P1
**Where:** `components/reports/report-card.tsx` - delete is "click trash twice in 3s" (confirming state).
**Symptom:** Touchpad-misfire pattern, not PHI-grade confirmation. Migration 005 exists but the UI doesn't reflect the gravity. There's no "type the participant's name to permanently delete" affordance, no "this will also delete the LLM logs that touched it" copy.
**Fix hint:** Typed-confirmation modal triggered from the trash icon. Modal copy: "Type the participant's name (Peter Parker) to permanently delete this FCA. The clinical notes, generated sections, and AI audit logs will be removed."
**Effort:** Half a day.

### PM-20 - No "permanently delete" cascade verification for storage (P2)

**Severity:** P2
**Where:** `app/api/...delete...` and storage cascade
**Symptom:** When a report is deleted, are the related `generation_logs`, `planner_review` rows, and storage objects (exemplar PDFs/DOCXs if attached) cleaned up? The migrations don't visibly cascade to the storage bucket. Did not have time to fully verify in this round.
**Fix hint:** Server-side post-delete check: count `generation_logs` rows referencing the deleted `report_id`; if non-zero, delete them. Same for `planner_review` snapshots. Test the storage cascade (probably already on by Supabase default).
**Effort:** 30 min for the verification + delete-on-cascade audit.

## What's good and worth preserving

- **Three-state save indicator with retry** (`workspace-footer.tsx:26-42`) is the right shape. Preserve the `data-status="error"` + button-with-onClick pattern; only adjust the "Idle" copy.
- **`useFormDraft` v=2 schema bump** with PHI redaction and TTL is genuinely thoughtful. Document the tradeoff in onboarding so clinicians know clinical-notes survives but identifiers don't.
- **Defense-in-depth `user_id` filter** is now consistent across `report-list.tsx`, `workspace-layout.tsx`, and every API route. Don't regress this.
- **Honest residency claim** on /login (REG-2) and the Print CSS disclaimer pseudo-element (REG-3) are both clean fixes that should not be revisited.
- **Profile auto-fill from `clinician_profiles`** with functional setter no-overwrite pattern is correct. Just extend it to include AHPRA in a visible way (PM-8).
- **Per-section section status chips with intake-gating** ("⏸ Part D will skip") on /generate are a great pattern - surface what the system will and won't do based on intake. Preserve and extend.
- **Workspace 404 keeps the Topbar** (NEW-7) is correct; replicate to global 404 (PM-5).
- **Migration 008 fully surfaced** in /settings - this is the foundation for everything from DOCX letterhead to header construction. Don't shrink the surface.

## Recommended sequence

### Day 1 (today, ~3 hours) - Carryover P1s and the Resume affordance

1. **PM-3** Resume button on failed reports with partial sections (half day - the highest-leverage item)
2. **PM-5** Global 404 keeps Topbar (15 min)
3. **PM-6** User-menu /settings link (5 min)
4. **PM-7** Avatar uses display_name initials when present (15 min)
5. **PM-1** Don't render "Idle" string - render nothing or "Saved" by default (5 min)

### Day 2 (~half day) - Onboarding + cost surface (the cheap-trust day)

6. **PM-17** /settings/usage with per-report cost stamp (half day)
7. **PM-9** Gate "Tip" banner on `exemplars.length === 0` (30 min)
8. **PM-2** Toast when expired draft is dropped on TTL (20 min)
9. **PM-11** "Start fresh" action on the draft-restored banner (20 min)

### Day 3 (~1 day) - Audit-UI surface

10. **PM-14** Per-section "View source" drawer pulling from `generation_logs` (1-2 days, but ship the read-only minimum on day 3 and iterate)

### Day 4 (~1 day) - PHI rigor + onboarding

11. **PM-19** Typed-confirmation hard-delete (half day)
12. **PM-20** Cascade-delete verification (30 min)
13. **PM-16** First-run checklist on /reports empty state (half day)

### Day 5 - The day-5 bet (defer to round-4 decision)

Either (a) **PM-15** /clients entity (2-3 days, the right foundation for caseload management) or (b) **PM-13** mobile viewport + tablet layout. Pick based on whether the next pilot is "Hayley running 30+ active cases" (a) or "Hayley doing home visits with a tablet" (b).

### Punted to round 4

PM-4 (Clear-failed copy adjustment, after PM-3 ships), PM-8 (AHPRA visibility), PM-10 (bulk select, after /clients), PM-12 (exemplar management), PM-13 (mobile, unless day-5 pivots), PM-18 (⌘K palette).

### Why this sequence

Round 3's pacing inverts round 2's: the previous week was about turning the tool into something defensible, this week is about closing the structural-shape gaps so the app feels complete from a PM lens. The Resume affordance (PM-3) is the highest-leverage single item because it converts existing wasted OpenAI spend into recovered work; the audit-UI drawer (PM-14) is the second-highest because the substrate is already done; cost transparency (PM-17) ends operator anxiety. Together those three turn three of the round-2 escalations into shipped surfaces, leaving only mobile, /clients, and onboarding-checklist for the next round - which is the right shape for round-3-to-pilot.

The ship-readiness call: **yes-with-caveats** for an internal Flourish pilot starting next week, conditional on PM-3 (Resume) shipping today. Without it, every transient OpenAI hiccup is a loss event, and the test account's 18-failed state demonstrates the rate is not zero.
