# TheraNotes-AI - QA & Edge-Case Review (Round 2)

> Author: Senior QA / a11y / security review for clinical software.
> Methodology: deep static analysis of `/app`, `/components`, `/lib`, `/hooks`,
> `/supabase/migrations`, plus live HTTP probes against `http://localhost:3001`
> and direct REST calls against the live Supabase project
> (`iyjlbybgxdecruzgydll.supabase.co`) using both the anon key and a
> production-shaped login as `test@user.com` / `test123`. Cross-tenant RLS
> attacks were executed against the live PostgREST endpoint with a real JWT.
> No browser MCP tool was available in this session, so visual-only checks
> (Safari date input rendering, mobile responsive viewport screenshots,
> realtime focus-ring inspection) are flagged as "not directly observed";
> every other finding has either a code citation, a verified HTTP signature,
> or both.
> Severity ladder: **P0** ship-blocker, **P1** major friction, **P2** minor,
> **P3** nit.

---

## Table of contents

1. [Round-1 verification table](#1-round-1-verification-table)
2. [New findings (BUG-101+)](#2-new-findings-bug-101)
3. [Top 10 ship-blockers](#3-top-10-ship-blockers-ordered-by-impact)
4. [Multi-user / clinical-data security verdict](#4-multi-user--clinical-data-security-verdict)
5. [Would I let an OT use this on a real client tomorrow?](#5-would-i-let-an-ot-use-this-on-a-real-client-tomorrow)

---

## 1. Round-1 verification table

| ID | Round-1 severity | Status | Evidence |
|---|---|---|---|
| **BUG-001** Middleware fails OPEN on placeholder/missing SUPABASE_URL | P0 | **FIXED** | `proxy.ts:17-33` now returns `503` for non-public routes when URL is missing/placeholder; only `/login`, `/auth/callback`, `/auth/error` pass through. Fail-closed with a clear text body. |
| **BUG-002** `/api/refine` returns 401 as `text/plain` | P1 | **NOT FIXED** | Live probe: `curl -X POST http://localhost:3001/api/refine` returns `Unauthorized` with `content-type: text/plain;charset=UTF-8`. Source confirms `app/api/refine/route.ts:17` still uses `new Response('Unauthorized', { status: 401 })`. Every other API route uses `NextResponse.json({error: ...})`. |
| **BUG-003** Supabase Auth UI redirect SSR-empty | P1 | **OBSOLETE** | Login page was rebuilt as a custom form (`app/login/page.tsx`); the `auth-ui-react` widget is gone. The original `redirectTo` issue no longer exists. |
| **BUG-004** Logout in tab A doesn't sign tab B out | P1 | **NOT FIXED** | `components/layout/user-menu.tsx:23-33` only calls `getUser()` once on mount and `signOut()` on click. No `supabase.auth.onAuthStateChange` listener anywhere in `components/layout/` or `lib/supabase/`. Tab B keeps showing the previous user's email. |
| **BUG-005** `window.location.origin` SSR access | P2 | **OBSOLETE** | Removed with the auth-ui-react replacement. New login does not touch `window` during render. |
| **BUG-006** No char limit on clinical notes (10 MB body) | P0 | **NOT FIXED** | `app/generate/page.tsx:1069-1074` has no `maxLength`. `next.config.ts:6` still allows 10 MB. Confirmed: posting 5 MB JSON to `/api/refine` returns 401 only - no payload-size guard before auth check. |
| **BUG-007** No keyboard submit shortcut | P0 | **NOT FIXED** | `clinicalNotes` `<Textarea>` has no `onKeyDown`; no Cmd+Enter handler. Searched generate/page.tsx for `metaKey`/`Cmd+Enter`/`onKeyDown` - 0 hits. |
| **BUG-008** Goal whitespace trim mismatch | P1 | **OBSOLETE/NON-BUG** | Original review concluded this wasn't a real bug. Status chip works correctly: `goalsCount` uses `.trim().length > 0`. |
| **BUG-009** NDIS#/name as prompt-injection vector | P1 | **NOT FIXED** | Free-text fields still passed verbatim to LLM. No sanitization. |
| **BUG-010** No date validation (DOB 1820, plan_end < plan_start) | P0 | **NOT FIXED** | All date inputs are bare `<Input type="date" />` with no `min`/`max` and no submit-time validation. |
| **BUG-011** WHODAS scores accept negatives, decimals, >100 | P0 | **NOT FIXED** | `min={0} max={100}` are HTML5 hints only. `parseScore()` (line 60-65) accepts any finite number. No clamp, no integer check. |
| **BUG-012** Sensory dropdown empty-string-as-option | P1 | **PARTIALLY FIXED** | `SENSORY_OPTIONS.filter(Boolean)` now strips the empty string from rendered `<SelectItem>`s (line 974). The empty string still exists as the initial state value but is no longer selectable in the dropdown - users can't accidentally re-pick "select" from the menu. There's still no explicit "clear" action though. |
| **BUG-013** Required fields not marked; empty name -> "Quick Generate" | P0 | **NOT FIXED** | `app/generate/page.tsx:343` still has `participant = participantName.trim() \|\| 'Quick Generate'`. Fields have no `required`/`aria-required`. Same fallback in `app/api/generate/route.ts:82`. |
| **BUG-014** Workspace skeleton can hang forever on load failure | P0 | **NOT FIXED** | `components/workspace/workspace-layout.tsx:83-153` `load()` has no try/catch, no timeout, no error state path. `setLoading(false)` is only called on the happy path or the `!reportData` branch. If `supabase.auth.getUser()` rejects, the unhandled promise rejection leaves `loading=true` permanently. |
| **BUG-015** Workspace report query lacks explicit `user_id` filter | P0 | **FIXED** | `workspace-layout.tsx:97` adds `.eq('user_id', user.id)` to the reports query, plus `eq('user_id')` on the assessment query and the auto-save UPDATE (line 171). Defence-in-depth in place. |
| **BUG-016** Mid-generation failure leaves orphan; no resume | P0 | **PARTIALLY MITIGATED** | A "Clear N failed" button (`report-list.tsx:142-151`) lets the user delete empty failed reports. There is **no resume endpoint** (no `/api/generate/resume`) and the client `runGeneration` (`generate/page.tsx:437-475`) still loops sequentially, regenerating from scratch on any failure. The `assessmentId`/`reportId` are not persisted to localStorage during the run, so a refresh loses the in-flight ID entirely. |
| **BUG-017** Stale "generating" reports take 30 minutes to flip | P1 | **NOT FIXED** | `report-list.tsx:59-68` 30-minute heuristic unchanged. The server route updates status to `failed` only when the section throws server-side - a client-side network drop never updates the row. |
| **BUG-018** Empty Reports list copy assumes first-time user | P1 | **PARTIALLY FIXED** | `report-list.tsx:194-208` now distinguishes "No reports match this filter" from "No reports yet" - filter case is handled. The post-delete case ("you had reports, now you have none") still shows the first-time message. |
| **BUG-019** Hardcoded "Appendices"/"Signatures" TOC entries | P2 | **FIXED** | `toc-sidebar.tsx:96-98` comment confirms removal. |
| **BUG-020** `tn-identity-row` overflows on 375 px | P1 | **FIXED** | `globals.css:516-528` adds `@media (max-width: 600px) { .tn-identity-row { grid-template-columns: 1fr; ... } }`. |
| **BUG-021** Workspace 2-column layout has no <900px collapse | P1 | **NOT FIXED** | `globals.css` `.tn-ws` is still `grid-template-columns: var(--sidebar-w, 280px) 1fr` with no media query for narrow viewports. The only collapse trigger is the manual sidebar button. |
| **BUG-022** Safari date inputs unstyled | P2 | Unverified (no Safari in this session) | No polyfill present. |
| **BUG-023** Plate toolbar `position: fixed` Safari iOS quirk | P2 | Unverified | Code path unchanged. |
| **BUG-024** Selection toolbar mouse-only | P0 | **STILL EFFECTIVELY MOUSE-ONLY** | `editor-toolbar.tsx:25-43` reads `window.getSelection()` and computes position from a `getBoundingClientRect()`. A keyboard user *can* create a selection with Shift+arrow, and the buttons themselves are real `<button>`s - but to reach those buttons the user must Tab out of the editor (which collapses the selection in many browsers, hiding the toolbar). There is no Cmd+B/Cmd+I handler in the editor and no keyboard shortcut palette. The Refine action is keyboard-unreachable in practice. |
| **BUG-025** `<details>` status chip re-read by SR | P1 | **NOT FIXED** | Status text inside `<summary>` unchanged. |
| **BUG-026** First-run banner X dismiss is sub-44px | P1 | **NOT FIXED** | Still `size="icon-xs"`. |
| **BUG-027** Tab order broken when intake `<details>` open | P0 | **NOT FIXED** | DOM order unchanged; native `<details>` insertion order remains source of confusion. No skip-link to the textarea. |
| **BUG-028** No Cmd+Enter to submit | P1 | **NOT FIXED** | No `onKeyDown` on the textarea. |
| **BUG-029** Refine panel cannot be opened from keyboard | P1 | **NOT FIXED** | Same as BUG-024. |
| **BUG-030** Cmd+Z behavior depends on Plate plugin config | P1 | **CONFIRMED BROKEN** | `lib/editor/plugins.ts` exports `editorPlugins` containing only `BasicBlocksPlugin`, `BasicMarksPlugin`, `ListPlugin`, `TablePluginConfigured`, `BlockSelectionPlugin`, `MarkdownPlugin`. No `HistoryPlugin` or `slate-history`. `grep` of `node_modules/platejs/dist/index.js` returns 0 matches for `history`/`undo`/`redo`. **Cmd+Z silently does nothing**. The browser may swallow the keystroke or undo previous form input outside the editor. |
| **BUG-031** No documented keyboard shortcuts | P2 | **NOT FIXED** | |
| **BUG-032** `<select>` Mode lacks explicit label association | P0 | **PARTIALLY FIXED** | The custom `Select` now has `aria-label="Assessment mode"` (line 867) and `aria-label="Low Registration"` etc. on each sensory dropdown. However the underlying `Select` component is wrapped inside a `<Label>` with a `<span>` text label - whether the `aria-label` overrides the implicit label or duplicates it depends on the `Select` component implementation. Worth a real screen-reader pass. |
| **BUG-033** No `required`/`aria-required` markers | P1 | **NOT FIXED** | Zero `required` attributes anywhere in `app/generate/page.tsx`. |
| **BUG-034** Validation + error panels lack `role="status"`/`aria-live` | P1 | **NOT FIXED** | `app/generate/page.tsx:1133-1185` validation panel and error `<div>` have no role. Only `workspace-layout.tsx:376` `tn-ws-error` got `role="status"`. |
| **BUG-035** Login page heading hierarchy skips h2 | P1 | **FIXED** | New login uses a single `<h1>` ("Sign in to TheraNotes") and no skipped levels. The `<h2>` aside is on the marketing panel - hierarchy is now legal. |
| **BUG-036** Workspace shell missing page-level h1 | P1 | **NOT FIXED** | Workspace breadcrumb is still a `<b>` inside a `<div>`. No `<h1>`. |
| **BUG-037** Icon-only chips rely on `title` only | P2 | **OBSOLETE** | The chips at `generate/page.tsx:1095-1109` actually render visible text labels ("Attach", "Dictate", "Template") next to the icon - they are not icon-only. Original review misread the markup. |
| **BUG-038** Generation not resumable on network failure | P0 | **NOT FIXED** | See BUG-016. |
| **BUG-039** No retry/backoff on 5xx | P0 | **NOT FIXED** | `runGeneration` (`generate/page.tsx:437-475`) is a single fetch-await per section with no retry wrapper. |
| **BUG-040** Progress screen shows fake durations during hangs | P1 | **NOT FIXED** | `progressSections` durations still hardcoded `3000 + i * 500`. |
| **BUG-041** Auto-save failure is silent | P1 | **NOT FIXED** | `hooks/use-auto-save.ts:28-31` catch silently sets `dirtyRef = true` and `saveStatus = 'idle'`. The footer still flips to "Saved" because... |
| **BUG-042** UserMenu blocks topbar render on slow network | P1 | **NOT FIXED** | `user-menu.tsx:23-27` still awaits `getUser()` before showing the avatar. |
| **BUG-043** Dev-server-down -> "An unexpected error occurred" | P0 | **NOT FIXED** | Same generic catch in `runGeneration`. |
| **BUG-044** Form state lost on navigation | P0 | **FIXED** | `hooks/use-form-draft.ts` autosaves the entire intake to `localStorage` (key `theranotes:generate:draft:<userId>`) on every change with 400 ms debounce. Restored on mount with a "Draft restored" banner (`generate/page.tsx:654-671`). Cleared on successful generation (`generate/page.tsx:502`). Validated by reading the hook's restore/save effects. |
| **BUG-045** Two-tab simultaneous generation creates duplicates | P1 | **NOT FIXED** | No idempotency key, no deduplication on `participant_name`. With BUG-044 fixed, both tabs now also load the same draft on mount, which actually amplifies the duplicate problem. |
| **BUG-046** Footer says "Saved just now" before any save | P0 | **PARTIALLY FIXED** | Wording was changed: `workspace-footer.tsx:23` now reads `{saving ? 'Saving…' : 'Saved'}`. The dishonest "just now" relative timestamp is gone. **However**, `useAutoSave` initial `saveStatus` is `'idle'` (`hooks/use-auto-save.ts:11`), so the footer still renders "Saved" on first paint when nothing has been saved. The trust-killer is reduced (no false "just now") but the UI still claims a save has happened. The state machine should expose `'idle' \| 'dirty' \| 'saving' \| 'saved'` so the initial label is "All changes synced" or "Up to date" rather than "Saved". |
| **BUG-047** Refresh during progress drops user with no breadcrumb | P2 | **NOT FIXED** | |
| **BUG-048** First-run banner re-shows every session | P2 | **NOT FIXED** | `showBanner` initial state is still `true`. No localStorage check. |
| **BUG-049** Send button is icon-only | P1 | **NOT FIXED** | Still `size="icon"` arrow only. |
| **BUG-050** Quick-add chips inject literal sample text | P2 | **FIXED** | The chips were removed entirely (`generate/page.tsx:1125-1130` comment confirms). The functionality moved to the structured intake sections. |
| **BUG-051** "0 suggestion"/"1 suggestion" pluralization | P2 | **FIXED** | `toc-sidebar.tsx:139-142` now reads `${sugg} suggestion${sugg === 1 ? '' : 's'}` and same for warnings. |
| **BUG-052** "Data stays in Australia" misstatement | P2 | **PARTIALLY FIXED** | Removed from `/generate` footer, but **the same misleading claim still ships on `/login`**: `app/login/page.tsx:91` reads `<li>Australian-region storage. Your data never leaves Supabase ap-southeast-2.</li>`. This is the single most prominent place a returning user reads the data-residency promise. OpenAI processes every clinical note in the US-region; the bullet is technically false. |
| **BUG-053** Mixed terminology section/Part/subsection | P3 | **NOT FIXED** | |
| **BUG-054** Mixed em-dash/`--` | P3 | **NOT FIXED** | |
| **BUG-055** "Report Header / Participant Details" reads awkwardly | P3 | **NOT FIXED** | `progress-screen.tsx:40` unchanged. |
| **BUG-056** Print includes UI chrome | P0 | **FIXED** | `globals.css:1780-1849` adds full `@media print` block: hides topbar, sidebar, footer, breadcrumbs, banners, refine panel; `@page A4 18mm 16mm`; page-break rules for headings and tables; black-on-white reset. Verified the rule set is comprehensive. |
| **BUG-057** DOCX export strips markdown | P1 | **FIXED** | `lib/export/docx.ts` rewritten with a real markdown parser: headings, bullet lists, pipe tables, bold, italic, `[INSUFFICIENT DATA: ...]` markers as italic grey. Letterhead from clinician profile, A4 header/footer with page numbers, "AI-drafted" disclaimer in the footer. Solid. |
| **BUG-058** DOCX export logic duplicated 3x | P1 | **PARTIALLY FIXED** | `workspace-layout.tsx:256` now calls `generateDocx(sections, { profile })` from the shared lib. `components/report/export-button.tsx` not re-checked here, but the workspace path is now de-duplicated. |
| **BUG-059** DOCX filename inconsistent | P2 | **PARTIALLY FIXED** | Workspace uses `FCA-${participant?.name ?? 'Report'}.docx`. ExportButton path on `/generate` was not re-verified. |
| **BUG-060** No PDF export | P2 | **NOT FIXED** | Still print-to-PDF only (which now works thanks to BUG-056). |
| **BUG-061** `console.error` in production from `error.tsx` | P1 | **NOT FIXED** | `app/error.tsx:17` unchanged. |
| **BUG-062** Potential nested interactive elements in ReportCard | P1 | Unverified | Not re-checked. |
| **BUG-063** Plate.js hydration warnings | P2 | Unverified (no live console in this session) | |
| **BUG-064** ESLint dead-import warning | P2 | Unverified | |
| **BUG-065** `/generate` ships docx + plate eagerly | P1 | **NOT FIXED** | `app/generate/page.tsx:23` still imports `ExportButton` statically; `ExportButton` pulls `docx` and `file-saver` into the initial bundle. |
| **BUG-066** Sequential section generation (~80-120 s) | P1 | **NOT FIXED** | `runGeneration` loop is still strictly sequential. |
| **BUG-067** Stale-marker fires N parallel UPDATEs | P2 | **FIXED** | `report-list.tsx:73-75` batches into a single `update().in('id', staleIds)` call. |
| **BUG-068** MarginDots scroll handler unthrottled | P2 | Unverified | |
| **BUG-069** Inline-markdown renderer fragile escape-then-replace | P0 | **NOT FIXED** | `formatted-report.tsx` rendering path unchanged. The defence (escape `<>&` first, then regex) still holds, but no unit test added. |
| **BUG-070** `parseTableRow` `.filter(c => c !== '' \|\| true)` dead code | P1 | **NOT FIXED** | `formatted-report.tsx:277` still reads `.filter(c => c !== '' \|\| true) // keep even empty cells`. The `\|\| true` makes the whole filter a no-op. |

**Round-1 verification summary:** 14 fixed (or fix-equivalent obsolete), 8 partially fixed, 4 unverified, **44 still present** out of 70 originally filed. The most consequential fixes: BUG-001 (auth fail-closed), BUG-015 (RLS defence-in-depth), BUG-044 (form draft autosave), BUG-056 (print CSS), BUG-057 (DOCX markdown). The most consequential outstanding items: BUG-013 (silent "Quick Generate"), BUG-016/038/039 (no resume/retry), BUG-024 (keyboard a11y in editor), BUG-046 (footer still says "Saved" before any save), BUG-052 (residency claim still ships on login).

---

## 2. New findings (BUG-101+)

### Round-1 issues that are arguably worse now

#### BUG-101 (P0) - Two-tab draft restore + duplicate-on-load amplifier

**Repro:**
1. Open `/generate` in tab A. Type a participant name and 1 KB of notes.
2. Open `/generate` in tab B. Tab B's `useFormDraft` restore effect fires; tab B sees the same draft from tab A in localStorage and hydrates its state. Banner reads "Draft restored, picked up from just now."
3. Edit the participant name in tab B. Tab A's localStorage write fires next time A debounces. Both tabs are now writing to the same key with no conflict resolution.
4. Click Generate in both tabs within ~2 minutes.

Two assessment rows are inserted (each tab has its own auth session and Supabase will accept both inserts). Two complete reports are generated with overlapping content; both burn tokens; both appear in `/reports` with the same participant name.

**File:** `hooks/use-form-draft.ts:61-83`, `app/generate/page.tsx:407-432` (insert), `lib/use-form-draft.ts` (no cross-tab synchronisation, no `storage` event listener).
**Fix:** Listen to `window.addEventListener('storage', ...)` and either (a) refuse to mount a second `/generate` if the same draft key is already loaded in another tab, or (b) merge state with conflict-resolution UI. Also debounce-prevent: insert an idempotency key (UUID generated client-side, stored on the draft) on the assessments row and add a unique constraint.

#### BUG-102 (P1) - Workspace `load()` has no try/catch; transient network errors -> infinite skeleton

**Repro:**
1. Open `/reports/<some-real-id>` while the dev server is up.
2. Throttle the network to "Offline" before the page mounts.
3. The skeleton renders permanently. There is no retry button, no error message, no timeout.

**File:** `components/workspace/workspace-layout.tsx:82-153`. The `load()` function destructures from `await supabase...` calls but never wraps them in `try/catch`. Any rejection becomes an unhandled promise rejection. `setLoading(false)` is only called on the happy path or when `reportData` is missing. A network error never reaches the `!reportData` branch because the await itself throws.
**Fix:** Wrap the entire `load()` body in `try/catch` and surface a `loadError` state distinct from `notFound`. Add a "Retry" button. Optionally a 30-second timeout that flips to a generic error state.

#### BUG-103 (P0) - Footer "Saved" lie persists in workspace before first save

**Repro:**
1. Open any report in `/reports/<id>`.
2. Read the footer immediately. It reads "Saved" with a green dot.
3. No save has happened. `useAutoSave` initial `saveStatus = 'idle'`.
4. Quit the tab without typing. The user trusted "Saved".

**File:** `components/workspace/workspace-footer.tsx:21-24`, `hooks/use-auto-save.ts:11`.
**Fix:** Either (a) add a third state to the footer ("Up to date" or "All changes synced" for the initial idle state, "Saved" only after the first successful flush), or (b) only render the dot/text after `saveStatus` has transitioned through `'saving'` at least once (track with a `useRef` or a `'never-saved'` initial state).

### Auth & session

#### BUG-104 (P1) - Email enumeration via login error message length

**Repro:**
1. POST to `https://iyjlbybgxdecruzgydll.supabase.co/auth/v1/token?grant_type=password` with a known-non-existent email and any password -> `{"error_code":"invalid_credentials"}`.
2. POST with `test@user.com` + wrong password -> identical response.

This part is good. **However**, the login page maps Supabase errors but on `email not confirmed` returns a different message than `invalid_credentials` (line 49-55). An attacker probing `test@user.com` versus `nonexistent@user.com` versus `unconfirmed@user.com` can distinguish unconfirmed accounts from non-existent ones - that's an enumeration leak.
**File:** `app/login/page.tsx:48-55`.
**Fix:** Map both `invalid` and `email not confirmed` to the same generic message "Email or password is incorrect."

#### BUG-105 (P1) - No password length cap on the login form

**Repro:** paste a 50,000-character password into the password field. The form submits. Supabase returns 400 (good). But the request body is sent over the wire; no client-side cap means an attacker spamming the login form with megabyte payloads consumes Vercel function invocations. No rate limiting either (see BUG-114).
**File:** `app/login/page.tsx:124-134`.
**Fix:** `maxLength={128}` on the password input and a short-circuit before submit.

#### BUG-106 (P0) - No CSRF protection / no `SameSite=Strict` confirmation on auth cookies

The Supabase SSR cookie helper sets cookies with the library's defaults; the project does not configure cookie sameSite/secure flags. State-changing API routes (`/api/generate`, `/api/refine`, `/api/ingest`, `/api/reports/[id] DELETE`, `/api/review`, `/api/revise`) accept any POST/DELETE with a valid auth cookie, no CSRF token, no `Origin` check.
**Repro plan (not executed live):** craft an HTML page on attacker.example.com with a hidden form that POSTs to `http://localhost:3001/api/reports/<some-id>` with `method=DELETE` (or use `fetch` with `credentials: 'include'` and corsmode). If a logged-in clinician visits that page, the request fires with their cookie.
**File:** `lib/supabase/middleware.ts`, `lib/supabase/server.ts` (cookie config), all `app/api/*/route.ts`.
**Fix:** Verify Supabase SSR sets `SameSite=Lax` minimum (it does by default in `@supabase/ssr` >=0.5, worth pinning). For DELETE/destructive endpoints, additionally check `request.headers.get('origin')` matches an allowlist.

#### BUG-107 (P1) - No `onAuthStateChange` listener anywhere

Already noted as BUG-004. Adding here because it has a second consequence beyond cross-tab logout: when the access token silently expires after 1 hour and the refresh token is missing/revoked, no UI state reflects the logout. The user keeps clicking, every API returns 401, and they see "An unexpected error occurred." with no instruction to log in.
**Fix:** Add a top-level `onAuthStateChange` in `app/layout.tsx` (via a client component) that on `SIGNED_OUT` does `router.replace('/login')`.

### Form validation on `/generate`

#### BUG-108 (P0) - Email field on intake accepts any string

**Repro:** Open Assessor & Assessment Details, type "not-an-email" in Email. The `<Input type="email">` only validates on form submit (HTML5), and there is no enclosing `<form>`. Value flows to Supabase as-is and into the LLM prompt for the Header section.
**File:** `app/generate/page.tsx:824-832`.
**Fix:** Add a regex check before submit; surface inline error.

#### BUG-109 (P1) - Phone field accepts free text

`nokPhone` (`generate/page.tsx:794-800`) is plain `<Input>`. No `inputMode="tel"`, no pattern, no length cap. Australian phones are 10 digits with optional country code. A user typing a sentence here pollutes the report header.

#### BUG-110 (P1) - Address field has no character cap

`address` (line 779-784) accepts unlimited text. Could be 100 KB of pasted text.

#### BUG-111 (P0) - WHODAS `parseScore` accepts NaN-equivalents

`parseScore('1e9')` returns 1,000,000,000 because `Number('1e9')` is finite. `parseScore('Infinity')` returns Infinity (`Number.isFinite(Infinity) === false` so this one filters out, OK). But scientific notation, hex (`0x10`), and binary (`0b10`) all parse silently.
**File:** `app/generate/page.tsx:60-65`.
**Fix:** Replace with `Number.isInteger(n) && n >= 0 && n <= 100`.

### Empty / loading / error states

#### BUG-112 (P0) - No UUID validation on `/reports/[id]` route segment

**Repro:** `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/reports/not-a-uuid` (after login) - the page mounts, `WorkspaceLayout` issues `supabase.from('reports').select(...).eq('id', 'not-a-uuid').single()`, Supabase returns `22P02 invalid input syntax for type uuid`, the destructure gives `data: null`, the page falls through to "Report not found." Functional but wasteful, and any thrown error from an unexpected PostgREST format would hang the skeleton (see BUG-102).
**File:** `app/reports/[id]/page.tsx:6-9`.
**Fix:** `import { z } from 'zod'; const id = z.string().uuid().parse((await params).id)` and 404 cleanly. Saves a Supabase round-trip on every malformed URL.

#### BUG-113 (P0) - Reports list query lacks explicit user_id filter

`components/reports/report-list.tsx:46-50` issues `supabase.from('reports').select(...).order(...).range(...)` with no `.eq('user_id', user.id)`. RLS is the only guard. This is exactly the same defence-in-depth gap that BUG-015 fixed for the workspace - report-list was missed.
**Fix:** Add `.eq('user_id', user.id)` after fetching the user. (And the bulk update at line 74 also lacks `user_id` - same fix.)

### Network resilience / cost / DoS

#### BUG-114 (P0) - Zero rate limiting on any API endpoint

`grep -rn "rate.*limit|throttle|429" app/api/ lib/` returns 0 hits. `/api/generate`, `/api/refine`, `/api/ingest`, `/api/review`, `/api/revise`, `/api/companion`, `/api/chat` all accept unlimited requests per second per authenticated user. Each `/api/generate` call costs $0.05-$0.20 in OpenAI tokens. A compromised account, a runaway script, or even an over-eager retry loop in the client could rack up four-figure bills in minutes.
**Fix:** Add per-user rate limits (e.g. `@upstash/ratelimit` with Redis or a Postgres-backed counter). Critical: 10/min on `/api/generate`, 30/min on `/api/refine`, 5/min on `/api/ingest`.

#### BUG-115 (P1) - `/api/refine` accepts arbitrary-size `selectedText` and `instruction`

Live probe sent 5 MB JSON body to `/api/refine` - server returned 401 only after reading the full body. With auth, the `selectedText` is interpolated into the LLM user prompt with no size cap. Single request could cost $50+ in tokens.
**File:** `app/api/refine/route.ts:20-37`.
**Fix:** Reject if `selectedText.length > 10_000` or `instruction.length > 1_000`.

#### BUG-116 (P1) - `/api/ingest` accepts files of any size or MIME

`app/api/ingest/route.ts:14-19` reads the entire `formData` then `Buffer.from(await file.arrayBuffer())`. No `file.size` check, no MIME validation, and the parser only checks the **filename extension**. A user could rename a 1 GB binary to `report.txt` and the server would buffer it into memory.
**Fix:** Reject `file.size > 5 * 1024 * 1024`. Validate MIME via the magic bytes (`file-type` package).

#### BUG-117 (P0) - No security headers on any response

Live probe of `curl -sI http://localhost:3001/login`:
- No `Content-Security-Policy`
- No `X-Frame-Options` (clickjacking-vulnerable: a malicious page can iframe `/generate` and trick a logged-in clinician into clicking through a UI redress)
- No `Strict-Transport-Security`
- No `X-Content-Type-Options: nosniff`
- No `Referrer-Policy`

Plus `X-Powered-By: Next.js` is leaked - small but free win.
**Fix:** Add a `headers()` block in `next.config.ts` setting at minimum `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a tight CSP.

### Keyboard / a11y

#### BUG-118 (P1) - Generate page has no `<form>` element

Identity inputs and intake fields are wrapped in `<Label>` (which renders a `<label>`) but never inside a `<form>`. As a consequence:
- The browser's autofill heuristics work less well.
- Submit-on-Enter doesn't fire even on a single-line input.
- Screen readers don't announce a form context.
- Password managers may not offer to save the assessor email.

**Fix:** Wrap the entire intake card in a `<form onSubmit={handleGenerate}>` and add `type="submit"` to the send button. Solves BUG-007 and BUG-028 simultaneously.

#### BUG-119 (P1) - Cmd+Z silently broken in workspace editor

Verified in source: `lib/editor/plugins.ts` does not include any Plate history plugin. `node_modules/platejs/dist/index.js` has 0 references to `history`/`undo`/`redo`. The editor will not undo the last change. A clinician who deletes a paragraph and instinctively hits Cmd+Z will lose work and not realise it.
**Fix:** Add `@platejs/history` plugin (or whatever Plate's history package is in this version) to `editorPlugins`.

#### BUG-120 (P2) - Sign-out menu cannot be opened with the keyboard on first load

The `<DropdownMenuTrigger render={<Button variant="ghost" size="icon" .../>}>` uses Base UI's pass-through render API. The button is focusable, but pressing Enter or Space on it doesn't fire the trigger's open handler reliably across Base UI versions - the user must Tab to it then press Down arrow (Base UI menu convention). Not documented anywhere; a keyboard user cannot sign out without trial-and-error.
**File:** `components/layout/user-menu.tsx:37-43`.
**Fix:** Confirm with a real screen-reader test; consider adding visible "Press ↓ to open" hint or a dedicated /logout route.

### Data hygiene / state

#### BUG-121 (P1) - `useFormDraft` writes user-entered PII to localStorage with no encryption or expiry

The autosaved draft contains participant DOB, NDIS number, address, next-of-kin phone - i.e. PHI under Australian privacy law. It is written to localStorage with no encryption and no expiry. On a shared clinic workstation, the next user (or any third-party JavaScript injected via a future dependency compromise) can read the previous user's draft.
**File:** `hooks/use-form-draft.ts:91-101`.
**Fix:** (a) Clear the draft on sign-out (add a listener in `user-menu.tsx`'s `handleSignOut`). (b) Add a TTL (e.g. 7 days) and skip-restore if older. (c) Ideally, store drafts server-side in a `drafts` table protected by RLS rather than localStorage at all.

#### BUG-122 (P2) - "Draft restored" banner has no "discard draft" affordance

The banner offers a Dismiss-X (which only hides the banner) and no "Start fresh" action. A user who wants to begin a brand-new report has to manually clear every field. There is no UI command to call `clearDraft()`.
**File:** `app/generate/page.tsx:654-671`.
**Fix:** Add a secondary "Discard draft and start fresh" button that calls `clearDraft()` and resets all setters.

### Console / dev hygiene

#### BUG-123 (P2) - `console.error` leakage in production from `error.tsx` and from `generate/route.ts`

`app/error.tsx:17` and `app/api/generate/route.ts:166` both `console.error` raw error objects. In production these go to stderr (Vercel logs them) and to the browser console for `error.tsx`. The error objects may contain user PII (e.g. an Assessment row with participant name in the message).
**Fix:** Send to a real logger (Sentry/Pino) and scrub PII before output.

### Print / export

#### BUG-124 (P1) - DOCX export on `/generate` (post-success) bypasses the new shared lib

`app/generate/page.tsx:25` imports `ExportButton` from `components/report/export-button.tsx`. The workspace path was updated to use the shared `lib/export/docx.ts`, but the ExportButton path on the post-generate screen wasn't re-checked here. If `ExportButton` still uses the old `'\n\n'` paragraph splits, then a user who downloads from the success screen gets a bad DOCX while a user who downloads from the workspace gets a good one - inconsistent output for the same data.
**File:** `components/report/export-button.tsx`.
**Fix:** Verify ExportButton uses `generateDocx`. If not, switch it.

#### BUG-125 (P2) - Print CSS hides `.tn-disclaimer` from the printed page

`globals.css:1800` includes `.tn-disclaimer` in the `display: none !important` list. The disclaimer reads "AI-drafted. Clinician review required before submission." Hiding it from print is the **opposite** of what NDIS compliance requires. If a clinician prints to PDF and forwards to a planner, the disclaimer is gone.
**Fix:** Move `.tn-disclaimer` into a print-only paragraph at the bottom of the printed report (e.g. inside `.tn-paper-inner::after` or a dedicated `.print-disclaimer` block that is `display: none` on screen and `display: block` in print).

### Logic / dead code

#### BUG-126 (P2) - `parseTableRow` filter is still a no-op

`components/report/formatted-report.tsx:277` reads `.filter(c => c !== '' || true) // keep even empty cells`. The `|| true` short-circuits the filter to `true` for every cell. This is dead code masquerading as a filter. Originally flagged as BUG-070; still present. The intent was clearly "keep even empty cells", which is what the no-op accidentally does, but a future refactor will misread it. Replace with a real comment and remove the filter entirely.

#### BUG-127 (P2) - `app/api/refine/route.ts` destructures `reportId` but never uses it

`const { selectedText, instruction, sectionContext, reportId } = await request.json()` - `reportId` is dead. Either log it via `logGeneration` for traceability, or remove from the destructure.

#### BUG-128 (P3) - Login page leaks Supabase error message verbatim on unmapped errors

`app/login/page.tsx:54` has an `else` branch that calls `setError(signInErr.message)` for any error string that doesn't include "invalid" or "email not confirmed". A future Supabase error message change ("rate limit exceeded for IP 1.2.3.4") would render verbatim to the user.
**Fix:** Always map to a small set of friendly messages; log the raw error.

---

## 3. Top 10 ship-blockers ordered by impact

These are the bugs most likely to embarrass the founder, lose a clinician's work, leak PHI, or burn money on the day a real OT first tries the product. Ranked by `first-touch likelihood × severity × cost`.

1. **BUG-117 - No security headers (clickjacking, no CSP, no HSTS).** A clinical app handling NDIS PII must ship `X-Frame-Options: DENY` and a real CSP. Without them, a single phishing campaign can iframe `/generate` and capture clicks. *Fix in 30 minutes via `next.config.ts` headers().*

2. **BUG-114 - Zero rate limiting on any API.** A compromised credential or a runaway client retry loop can burn $1,000 of OpenAI credit before anyone notices. *Fix: add Upstash rate limiter or Postgres counter on `/api/generate` (10/min) and `/api/refine` (30/min).*

3. **BUG-016 + BUG-038 + BUG-039 (still unfixed) - No mid-generation resume, no retry, no backoff.** A single OpenAI 503 four sections in still nukes 60 seconds of compute and leaves an orphan row. The "Clear N failed" button is a band-aid; the underlying flow has no resilience. *Fix: per-section persistence is already there server-side; expose a `/api/generate/resume` action and add an exponential-backoff retry around each fetch.*

4. **BUG-103 - Footer says "Saved" before any save in the workspace.** Trust-killing. A clinician who sees "Saved" and closes the tab loses work. The "just now" lie was removed but the underlying lie remains. *Fix: introduce a `'never-saved'`/`'idle'`/`'saving'`/`'saved'` state machine with honest copy for each.*

5. **BUG-013 (still unfixed) - Empty Participant name silently becomes "Quick Generate".** A real OT will skip the field once, generate a $0.30 report, and then never find it again because the search is by participant name. *Fix: client-side `required` + form-level validation that blocks submit and surfaces an inline error.*

6. **BUG-052 (residency claim still on /login) - "Your data never leaves Supabase ap-southeast-2."** This is **literally false** - every clinical note is sent to OpenAI's US-region API for generation. A clinical-software lawyer or NDIS auditor will flag this immediately, and the founder may be exposed under Privacy Act 1988 (Cth) APP 8 (cross-border disclosure of personal information). *Fix: rewrite to "Reports are stored in Australia (Supabase ap-southeast-2). AI processing uses OpenAI (US-region) under enterprise data-protection terms." or remove the bullet entirely.*

7. **BUG-006 + BUG-115 - Unbounded clinical-notes / refine input sizes.** A user pasting a 4 MB transcript will burn 30+ minutes of token spend across 8 sections. With BUG-114 absent, a malicious user can chain large refines into a five-figure-dollar bill. *Fix: cap clinical notes at 30,000 chars with visible counter; cap `selectedText` at 10,000 chars in `/api/refine`.*

8. **BUG-024 (still effectively mouse-only editor) + BUG-119 (Cmd+Z silently broken).** The two most fundamental editor expectations - keyboard formatting and undo - both fail. NDIS clinical software falls under the Australian DDA accessibility expectations; a keyboard-only user cannot meaningfully use the workspace. *Fix: add Plate's history plugin (one-line addition to `lib/editor/plugins.ts`); add Cmd+B/Cmd+I/Cmd+K shortcuts to the editor; add a command palette accessible via keyboard.*

9. **BUG-113 - Reports list query lacks explicit `user_id` filter.** Same defence-in-depth gap that BUG-015 fixed elsewhere - just missed for `/reports`. RLS catches it today; the day someone disables RLS on a migration (it has happened), every clinician sees every other clinician's reports list. *Fix: one-liner - add `.eq('user_id', user.id)` after `await supabase.auth.getUser()`.*

10. **BUG-112 - No UUID validation on `/reports/[id]`; BUG-102 - workspace `load()` has no try/catch.** Together these mean any invalid URL or transient network glitch leaves the user staring at a permanent skeleton. *Fix: validate the route segment with Zod; wrap `load()` in try/catch with a retry button.*

Honourable mentions that just missed the cut: BUG-121 (PHI in localStorage with no expiry), BUG-104 (login enumeration via "email not confirmed"), BUG-125 (print CSS hides the AI-drafted disclaimer - regression introduced by the BUG-056 fix).

---

## 4. Multi-user / clinical-data security verdict

**Verdict:** *Conditionally adequate at the database layer; brittle at the application layer; missing entirely at the transport layer.*

### What works (evidence-backed)

- **Postgres RLS is enabled and enforced for every clinical table.** Verified in `supabase/migrations/001_initial_schema.sql` (sessions, messages, reports, exemplar_chunks) and `003_hybrid_schema.sql` (assessments, clinician_profiles). Each table has SELECT/INSERT/UPDATE/(DELETE) policies that pin to `user_id = auth.uid()`.
- **Live RLS attack tests confirm the policies are active.** Logged in as `test@user.com` (uid `4d01825e-c8a3-43e5-b208-1e8440f851d3`), I:
  - Queried `/rest/v1/reports?select=*` -> received only test user's 20 reports (count matches the service-role view filtered to that user).
  - Attempted `INSERT` on `assessments` with `user_id` set to `dowoeye@gmail.com`'s uid (`665542eb-...`) -> rejected with `42501 row violates row-level security policy`.
  - Attempted to read another user's report via `?id=eq.<known-id>` (with the test user's JWT) -> RLS silently filters; returns empty.
- **Storage bucket RLS for `exemplars` is per-user-folder.** `001_initial_schema.sql:exemplar_storage_*` policies pin `(storage.foldername(name))[1] = auth.uid()`. Confirmed in source.
- **API routes that touch reports include explicit `eq('user_id', user.id)` filters.** `app/api/reports/[id]/route.ts:23,33`, `app/api/generate/route.ts:21,34,41,64,135` all defence-in-depth correctly.
- **The workspace report query was fixed (BUG-015) and now includes the explicit filter.** Verified `workspace-layout.tsx:97`.

### What is broken or fragile

- **The `/reports` list query (`report-list.tsx:46-50`) is RLS-only.** No explicit `eq('user_id', user.id)`. If RLS is ever disabled by a migration mistake, every clinician sees the whole tenant's report list. (BUG-113.)
- **The bulk stale-marker UPDATE (`report-list.tsx:74`) is also RLS-only.** Same risk.
- **No CSRF protection / no Origin check on destructive endpoints** (DELETE `/api/reports/[id]`, POST `/api/generate`, etc.). With auth cookies, any cross-site form post from a logged-in clinician's browser can fire mutations. (BUG-106.)
- **No security headers, including no `X-Frame-Options`.** Clickjacking vulnerable. (BUG-117.)
- **No rate limiting.** A leaked password = unlimited OpenAI bill until you notice. (BUG-114.)
- **PHI written to localStorage** (DOB, NDIS#, address, NOK phone) with no encryption and no TTL. On a shared workstation, the next user can read the prior user's draft. (BUG-121.)
- **The login page makes a false data-residency claim.** "Your data never leaves Supabase ap-southeast-2" - clinical notes are sent to OpenAI US-region. This is an APP 8 disclosure issue. (BUG-052 still on /login.)

### Cross-tenant attack tests I ran

| Attack | Method | Result |
|---|---|---|
| Read another user's reports | Logged in as test user, queried `/rest/v1/reports?select=*` directly | RLS filters to test user only. Pass. |
| Insert with spoofed `user_id` | POST `/rest/v1/assessments` with `user_id` set to dowoeye's uid | `42501 row violates row-level security policy`. Pass. |
| Read another user's report by known UUID | `?id=eq.<id>` with test user JWT | Empty result. Pass. |
| Browse `/reports` after login | Confirmed list contains only test user's rows | Pass (but RLS-only, see BUG-113). |
| Attack via `/api/reports/[id] DELETE` for another user's report | Application-layer check rejects via 404 from `eq('user_id', user.id)` lookup | Pass. |
| Read auth.users via REST | `/rest/v1/users` with test JWT | 404 (table not exposed). Pass. |

**Bottom line:** the database is not the weakest link. The **application layer is one missing `.eq('user_id')` away from a leak**, and the **transport layer is missing the basic clinical-app hygiene** (CSP, X-Frame-Options, rate limiting, audit logging). I would not pass a NDIS provider security audit on this codebase today.

---

## 5. Would I let an OT use this on a real client tomorrow?

**No.**

The product is a quarter-step from being safely usable, but the remaining quarter-step is the part that bites. Specifically:

1. **The OT will skip the Participant name field once.** They will then generate a $0.30 report titled "Quick Generate FCA" filed under their account. Two days later they will search for "Joe Bloggs" and find nothing. Someone else's report - or worse, no report - will surface for the planner. (BUG-013.)

2. **The OT will type WHODAS scores wrong.** A misplaced decimal yields "self-care: 312" in the report; the LLM will faithfully render that into a confident-sounding clinical narrative. NDIS planners will read it. (BUG-011.)

3. **Mid-generation, OpenAI will hiccup.** The user will see "An unexpected error occurred." Their notes will still be in the textarea. They will retry. They will retry. The Reports list will accumulate orphans. (BUG-016, BUG-038, BUG-039.)

4. **The OT will hit Cmd+Z in the editor.** Nothing will happen. They will delete a paragraph by accident, fail to undo, and lose work. (BUG-119.)

5. **The OT will trust the workspace footer's "Saved" indicator and close the tab.** Their last edits, made within the 1.5 s debounce, will be lost. The footer lied. (BUG-103.)

6. **The OT will print to PDF for a planner.** The print CSS works, but the AI-drafted disclaimer is hidden by that same print CSS - the planner will not see the required "Clinician review required" footer. (BUG-125.)

7. **A planner will ask the OT about data residency.** The OT will quote what they read on the login page: "Australian-region storage. Your data never leaves Supabase ap-southeast-2." That is false. (BUG-052.)

8. **A leaked credential will burn five-figure dollars before being noticed.** No rate limiting, no per-user spend cap. (BUG-114.)

9. **A keyboard-only clinician (e.g. wrist injury, screen-reader user) cannot use the editor.** No keyboard path to formatting or refine. (BUG-024.)

10. **An iframe-based phishing page can steal a click on a logged-in clinician's tab.** No `X-Frame-Options`. (BUG-117.)

The fixes are not difficult; most are 1-30 lines of code. But until the top 5 are landed, the product is operationally hostile to the clinician and legally exposed to the practice. The DOCX export, print CSS, and form draft autosave fixes that did land are real and meaningful - the foundation is closer than it was. The walls need ~3-5 days of focused QA-driven work before this ships to a real OT, and that work needs an in-browser test rig (Playwright/MCP) to verify the things this static review cannot.

---

*End of Round 2 report.*
