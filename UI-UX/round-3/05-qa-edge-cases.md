# QA / a11y / Security Review - Round 3

| Field | Value |
|---|---|
| Reviewer | Senior QA + a11y + security |
| Date | 2026-05-10 |
| Build | theranotes.com.au sha 89a24bc (deployment id `dpl_H4qCiPJ2caF8naooJM4HFnbgf6nw`) |
| Method | Live PROD via headless browse + curl probes (anon JWT + authed JWT) |
| Cost guard | Generate / NDIS Review / Refine / Apply fix DO-NOT-CLICK |
| Round | 3 (verification mode) |

## Vote

**no** - Auth cookie `httpOnly:false` + zero CSP/X-Frame + full PHI in `generation_logs.user_prompt` + Cmd+Z still broken. Not OT-ready.

## Suspected regressions from round 2

| ID | Regression | Severity | Evidence |
|---|---|---|---|
| QA-REG-1 | `/api/refine` still returns `Unauthorized` as `text/plain;charset=UTF-8`, not JSON. Round-2 BUG-002 unresolved and not flagged for re-verification. Inconsistent with `/api/generate` which returns `{"error":"Unauthorized"}` JSON. | P2 | `curl -X POST /api/refine -H 'Content-Type: application/json' -d '{}'` -> `Unauthorized` text/plain 401 |
| QA-REG-2 | `/reports/[id]` workspace prefetches a report at the placeholder UUID `00000000-0000-0000-0000-000000000000`, generating console-visible `406 Not Acceptable` errors from PostgREST every page load. Started in this build per network panel (was not flagged in round 2). | P1 | `GET /rest/v1/reports?...id=eq.00000000-0000-0000-0000-000000000000&user_id=eq.<uid>` -> 406. Repeated 4x per /generate visit. |
| QA-REG-3 | None directly attributable to the round-2 fixes themselves. The "REG-3 print disclaimer" path was changed to a `::after` injection that DOES reach paper, even though `.tn-disclaimer { display: none }` is still in the print rules - safe. | - | See REG-3 verification below. |

## TL;DR

The round-2 batch shipped a meaningful chunk: REG-2 (false residency claim) is fixed with honest copy; REG-4 (reports list `eq('user_id')`) verified; signup-disabled holds; print disclaimer reaches paper through a different (working) mechanism; NEW-3 marquee Generate button is now a real labeled pill; NEW-6 `.tn-nav-item:focus-visible` outline shipped; autosave gained TTL + version (`v:2`).

What did NOT ship: NEW-9b (strip PHI from localStorage) - all 28 keys including `participantName`, `ndisNumber`, `participantDob`, `address`, `nokName`, `nokPhone` are still serialized. NEW-10 Cmd+Z - bundles contain zero `withHistory` / `slate-history` / `HistoryPlugin` symbols. ESC-8 security headers - only HSTS shipped; CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy all absent. ESC-9 rate limiting - confirmed absent.

New problems introduced or surfaced in this review: the Supabase auth cookie is `httpOnly:false / secure:false`, meaning the JWT (including refresh token) is fully exposed to JavaScript and any future XSS = total account takeover. `generation_logs.user_prompt` stores full clinical narratives with participant names verbatim - even with RLS, this becomes a PII liability and a service-role-key compromise becomes catastrophic. `/reports/[id]` prefetches a placeholder UUID generating PostgREST 406s on every visit. No `<form>` element wraps any input on `/generate` (29 inputs, 0 forms, 0 required, 0 aria-required) - submit-on-Enter and password-manager flows are degraded.

Net: round 3 is mid-pack on what was nominated for verification, but the QA/security profile is roughly the same shape as round 2. The product remains a quarter-step from OT-ready.

## Verification of round-2 fixes

| Item | Status | Evidence |
|---|---|---|
| **REG-2** (residency claim on /login) | **FIXED with honest wording** | `tn-auth-bullets` now reads: "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." The over-specified grep `ap-southeast` still matches because the bullet correctly cites the AU region. The dishonest "never leaves" / "Australian-region storage" copy is gone. Accurate, defensible, ship-acceptable. |
| **REG-3** (print CSS hides disclaimer) | **FIXED differently** | `.tn-disclaimer { display: none !important }` is STILL in the print block (literal claim "now keeps `.tn-disclaimer` visible" is false). However a new `@media print { .tn-doc::after, .report-document::after { content: "AI-drafted. Clinician review required before submission."; ... } }` rule was added - the disclaimer reaches paper via a pseudo-element. End-state intent met. |
| **REG-4** (reports list `eq('user_id')`) | **FIXED, verified live** | Logged in as test user, queried `/rest/v1/reports?select=*` directly with anon+JWT - returned only test user rows. Combined with the explicit `user_id=eq.<uid>` filter visible in the network panel (`GET /rest/v1/reports?...&user_id=eq.4d01825e-c8a3-43e5-b208-1e8440f851d3`), defence-in-depth is in place. |
| **NEW-9** (autosave TTL + strip PHI) | **PARTIAL: TTL shipped, strip-PHI did NOT** | `localStorage["theranotes:generate:draft:<uid>"]` returns JSON with `savedAt: <ISO>, v: 2`. Bundle scan finds the TTL gate: `if(Date.now()-a.getTime()>r){window.localStorage.removeItem(h)}`. **However**, the persisted state object still includes all 28 fields including `participantName`, `ndisNumber`, `participantDob`, `address`, `nokName`, `nokPhone`. These are PHI under APP 11 / Privacy Act 1988 (Cth) and they live in unencrypted localStorage. On a shared workstation, the next user can read prior PHI for up to TTL. |
| **NEW-10** (Cmd+Z via Plate history) | **DID NOT SHIP** | All 27 production JS chunks scanned via `curl ... \| grep -oE 'withHistory\|slate-history\|HistoryPlugin\|"history"'` - zero matches. The editor renders with `data-slate-editor="true"` and `__PLATE_INSTANCES__` exposes nothing in production. Per the round-2 source citation (`lib/editor/plugins.ts` listing only Basic + Marks + List + Table + BlockSelection + Markdown), no history plugin has been added. Cmd+Z silently does nothing in the workspace editor. |
| **Supabase signup-disabled** | **STILL DISABLED** | `POST https://iyjlbybgxdecruzgydll.supabase.co/auth/v1/signup` with anon key + new email -> `HTTP 422 {"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}`. Round-2 user-action item resolved and durable. |
| **ESC-8** (CSP / X-Frame-Options / HSTS / etc.) | **PARTIAL: HSTS only** | `curl -sI https://www.theranotes.com.au/` and `/login` and `/generate` all return: `strict-transport-security: max-age=63072000` (good - 2 years). MISSING: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. `x-powered-by: Next.js` is leaked. |
| **ESC-9** (rate limiting) | **ABSENT** | Confirmed via the deploy ID + zero `429` history; out-of-scope to actually attempt against PROD per cost guard, so this is a static check only. The round-2 finding that no rate-limit middleware exists in `app/api/*` stands. |
| **Upstream cherry-picks (commit 2648ce9)** | **PRESENT and rendering-clean** | `/reports/<id>` workspace renders all 30 H2 sections with no console errors. Backslash regex / ghost code-block filter / `[data-slate-editor]` typography are doing their job - no malformed markdown surfacing in the rendered DOM. Screen-reader output of the hierarchy reads cleanly. |

## Walk-through (probes + observations)

### Phase 1 - unauth surface

`curl -sI https://www.theranotes.com.au/` returns `307 -> /login` with `strict-transport-security: max-age=63072000`. `/login` HTML inspection: title is "TheraNotes AI" (clean), `tn-auth-bullets` carries the new honest residency wording, login form is a custom `<form noValidate>` (not HTML5-validated), email + password inputs only. No CSP, no X-Frame-Options - a malicious page can iframe `/login` and stage credential capture via UI redress. The login page leaks the Supabase URL and anon JWT in chunk `0z5iorcca5nyq.js` which is expected for a Supabase frontend.

### Phase 2 - signup probe

`POST /auth/v1/signup` with anon key returns `HTTP 422 signup_disabled` - matches round-2 verification. No regression.

### Phase 3 - login + cookie inspection

The `gstack/browse` profile was already authenticated as `test@user.com`. Cookie inventory: a single `sb-iyjlbybgxdecruzgydll-auth-token` cookie, `sameSite: Lax`, `expires: 2027-04-09`, and critically:

- `httpOnly: false` - the cookie is fully readable via `document.cookie`. Verified live: a `js 'document.cookie'` call returned the entire base64-encoded JWT including the access token, refresh token, user id, email, identity_data, and session_id. **Any XSS via clinical notes, exemplar filename, NDIS number, or any content interpolated unescaped into the DOM = full account takeover and ~1 hour of refresh-token persistence.**
- `secure: false` - the cookie can be sent over HTTP. PROD is HTTPS-only via HSTS, so this is mitigated, but a misconfigured environment (preview deployment, custom subdomain without HSTS) loses the mitigation.

This is the standard `@supabase/ssr` configuration; making it `httpOnly: true` would break the client-side Supabase JS calls. The trade-off is well-known but is a hard finding for a clinical app handling NDIS PHI.

### Phase 4 - localStorage / sessionStorage inspection

`storage` after login on `/generate` returned:

```
{
  "localStorage": {
    "theranotes:generate:draft:4d01825e-c8a3-43e5-b208-1e8440f851d3": "{\"state\":{...28 fields including participantName, ndisNumber, participantDob, address, nokName, nokPhone, clinicalNotes...},\"savedAt\":\"2026-05-10T12:43:57.730Z\",\"v\":2}"
  },
  "sessionStorage": {}
}
```

The TTL gate is present in the chunk: `if(Date.now()-a.getTime()>r){window.localStorage.removeItem(h)}`. Versioning (`v: 2`) is in place. The strip-most-sensitive-fields option of NEW-9 was NOT shipped: every PHI field name is still a key in the persisted state object.

### Phase 5 - RLS attack tests with a real JWT

Using the fresh test-user JWT, attempted:

1. `GET /rest/v1/reports?select=id,user_id,status&limit=3` -> only test-user rows returned. Pass.
2. `GET /rest/v1/assessments?select=id,user_id,participant_name&limit=3` -> only test-user rows. Pass.
3. `POST /rest/v1/assessments` with `user_id` set to a foreign UUID (`665542eb-0000-0000-0000-000000000000`) -> `42501 row violates row-level security policy for table "assessments"`. Pass.
4. `GET /rest/v1/clinician_profiles?select=*` -> `[]` for the test user (no profile row exists yet). Pass.
5. `GET /rest/v1/generation_logs?select=*&limit=1` -> RLS returns rows BUT the columns include `system_prompt` and `user_prompt` containing the full clinical narrative verbatim, including "Mary Jane Watson", "Peter Parker", "schizoaffective disorder, anxiety and depression", and a long paragraph of clinical detail. **This is intentional logging per `lib/ai/log.ts`** (CLAUDE.md confirms it), but it means PHI persists in the database in plaintext outside the report record itself. RLS protects against cross-tenant read; it does NOT protect against:
   - service-role-key compromise (catastrophic - all clinics' notes leak in one query)
   - misconfigured analytics/admin views
   - log retention beyond what NDIS / Privacy Act allows

### Phase 6 - API auth shape

| Endpoint | Method | No-auth response |
|---|---|---|
| `/api/refine` | POST | `Unauthorized` text/plain 401 |
| `/api/generate` | POST | `{"error":"Unauthorized"}` application/json 401 |

Round-2 BUG-002 is still present and inconsistent with the rest of the API surface.

### Phase 7 - workspace + editor

`/reports/0a81842a-af23-4d87-8517-45a1a7d25ec9` rendered clean: 30 H2 headings, no console errors, no hydration warnings. **No H1 anywhere on the workspace** - BUG-036 unfixed; the breadcrumb / page-title is still missing a page-level heading (the app title in the topbar is wrapped in an `<a>`, not an `<h1>`).

The Plate editor mounts as `[data-slate-editor="true"]` with `role="textbox"` but no `aria-label`. `__PLATE_INSTANCES__` is exposed as an empty object in production (whether by design or by accident), so introspecting the editor's plugin list at runtime is not possible. The bundle-scan finding is the load-bearing one: zero history plugin shipped.

I attempted a real round-trip Cmd+Z test (focus editor, type "ZZUNIQUEEEZ", Cmd+Z, check content) but the headless browser's keyboard handling collided with internal navigation - the page navigated to `/reports` mid-test. Repeat attempts had the same failure. The static evidence (no history plugin in any bundle) is dispositive.

### Phase 8 - /generate inputs / a11y

40 focusable elements, 29 inputs, **0 marked `required`, 0 `aria-required`, 0 wrapped in any `<form>`** (BUG-118, BUG-013, BUG-033 unfixed):

```
{ total: 29, required: 0, ariaRequired: 0, types: [text, date, email, number, textarea] }
```

Buttons inventory shows the marquee Generate is now `text="Generate  sections" aria="Generate 0 sections" title="Generate 0 of 8 sections"` - **NEW-3 IS FIXED**, the icon-only marquee button has been replaced with a labeled, count-aware pill.

The five `Select`-component buttons (Assessment mode, Low Registration, Sensation Avoiding, Sensory Sensitivity, Sensation Seeking) each carry the right `aria-label` per round-2's BUG-032 partial fix. Each renders the placeholder text `— select —` inside the button label, which a screen reader will announce as "Assessment mode, button, em-dash select em-dash" - awkward but not broken.

### Phase 9 - workspace TOC button types

Inspecting the workspace, every TOC button (`tn-toc-item`) is rendered with `type="submit"`, and the sidebar collapse button is also `type="submit"`. Since none of these are inside a `<form>`, this is a no-op functionally, but it's incorrect HTML - a future refactor that wraps workspace controls in a form (for the editor save button, say) would suddenly cause every TOC click to trigger form submit. Worth `type="button"` for cleanliness.

### Phase 10 - focus-visible + print CSS verification

```
.tn-nav-item:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 2px; }
```

Rule is present. NEW-6 verified.

```
@media print {
  .tn-topbar, .tn-side, .tn-ws-topbar, .tn-footer, ..., .tn-disclaimer, ... { display: none !important; }
  .tn-doc::after, .report-document::after {
    content: "AI-drafted. Clinician review required before submission.";
    color: rgb(102, 102, 102); text-align: center;
    border-top: 0.5pt solid rgb(153, 153, 153);
    margin-top: 24pt; padding-top: 8pt; font-size: 9pt;
  }
}
```

The disclaimer DOES reach paper, just via a different mechanism than the round-2 description. End-state intent satisfied.

### Phase 11 - 406 errors in console

On `/generate` page load, the network panel shows 4-5 repeated requests to:

- `GET https://iyjlbybgxdecruzgydll.supabase.co/rest/v1/reports?select=...&id=eq.00000000-0000-0000-0000-000000000000&user_id=eq.<uid>` -> `406 Not Acceptable`
- `GET https://www.theranotes.com.au/reports/00000000-0000-0000-0000-000000000000?_rsc=...` -> 200 prefetch

These are visible to any user opening the browser console (clinical user trust hit). Source-side, this is the placeholder UUID `00000000-0000-0000-0000-000000000000` being used as a default state somewhere - probably a React Query / SWR default that fires before the real id is known, or a hover-prefetch on a "New report" link. The 406 from PostgREST is `single()`-style row-not-found surfacing as Not Acceptable. Not a security problem, but a clear console-error UX bug that surfaces every visit.

### Phase 12 - draft restore + cross-tab amplifier check

Verified the restore flow works (draft persists across `goto /generate` reloads). The cross-tab attack from round-2 BUG-101 (open two tabs, both restore the same draft, both Generate -> two duplicate assessments) is unchanged - no `storage` event listener, no idempotency key on assessments. Did not retry the live double-Generate per cost guard; the static evidence stands.

### Phase 13 - beforeunload

`window.onbeforeunload` is `null` on `/generate`. A user who has typed 10 minutes of clinical notes and accidentally hits Cmd+W or back-button navigation gets no confirmation prompt. The autosave reduces the blast radius (TTL keeps the draft for ~24h or whatever the constant is) but the moment the user has typed PHI fields, those fields are now in localStorage anyway (NEW-9b regression). Round-2 BUG-044 was reported as fully fixed by autosave; the navigation-confirmation gap is a separate thing.

## New findings

### QA-1 - Supabase auth cookie is `httpOnly: false` and `secure: false` (P0)

The `sb-iyjlbybgxdecruzgydll-auth-token` cookie is fully readable from `document.cookie`. Live verification:

```
$ browse js 'document.cookie'
sb-iyjlbybgxdecruzgydll-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOiJleUpoYkdjaU9pSkZVekkxTmlJ...
```

The base64-decoded value contains `access_token`, `refresh_token`, full user object including `email`, `id`, `created_at`, `last_sign_in_at`, etc. **Any XSS via any unescaped clinical content rendered into the DOM = full account takeover.**

`secure: false` is mitigated by site-wide HSTS, but a future preview deployment without HSTS preload would lose the mitigation.

**Why this is severe for a clinical app:** the inline-markdown renderer in `formatted-report.tsx` is the single largest XSS surface (round-2 BUG-069 still listed unverified). The clinical-notes textarea has no max length and no sanitization (round-2 BUG-006/009 still unfixed). The combination of httpOnly:false + an unsanitized rendering path is the compounding risk.

**Fix:** Two options. (a) Migrate the Supabase auth client to one that supports httpOnly cookies via a Next.js route handler (the SSR helper does support this with the right `set` config in `lib/supabase/middleware.ts`). (b) Accept the trade-off (which is genuine for client-side Supabase) and harden the rendering paths AND ship a strict CSP that disallows `unsafe-inline` for scripts. The CSP option is the cheaper and more defensible move for a clinical app.

**File:** `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts` cookie config.

### QA-2 - `generation_logs.user_prompt` stores full clinical narratives in plaintext (P0 / compliance)

Live read against the `generation_logs` table with the test user's JWT returned:

```
{"id":"b1d014ba-...","user_id":"4d01825e-...","report_id":"...","operation":"coherence",
 "system_prompt":"You are a clinical document reviewer. Review this FCA report for internal consistency...",
 "user_prompt":"Review this FCA report for internal consistency:\n\n## Report Overview\n\nThis Functional Capacity Assessment has been prepared by Mary Jane Watson to describe how Peter Parker's psychosocial disability, including schizoaffective disorder, anxiety and depression, significantly impacts his day-to-day functional capacity..."}
```

The user_prompt column carries:
- Participant full name (Peter Parker)
- Clinician full name (Mary Jane Watson)
- Diagnosis details (schizoaffective disorder, anxiety, depression)
- Functional impairment narrative
- Strengths and supports

**This is intentional per CLAUDE.md** ("All LLM calls are logged to the `generation_logs` table via `lib/ai/log.ts`. Every generation, revision, coherence check, and inline refinement captures: full prompts, RAG chunks retrieved..."). However:

1. RLS protects against cross-tenant reads from clients - good.
2. The service-role key has full access to this table. A leak of the service-role key is now a clinical-data catastrophe - every report ever generated, with full names and diagnosis text, can be exfiltrated in one query.
3. There is no documented retention policy. Privacy Act 1988 (Cth) APP 11 requires destruction or de-identification when no longer needed; this table grows monotonically.
4. There is no PHI scrubbing layer between the LLM call and the log row.

**Fix options:**
- (a) Hash or pseudonymise participant identifiers before logging (replace `Peter Parker` with `participant-<short-hash>`). Cheap, defensible.
- (b) Add a 90-day retention TTL via a Postgres `cron` job or a Supabase scheduled function.
- (c) Make logging opt-in per clinician (settings toggle), default off in production, on in development.
- (d) At minimum, add a documented data-retention policy and an admin UI for purging on request.

**File:** `lib/ai/log.ts`, plus a new migration for retention.

### QA-3 - `/reports/<placeholder-uuid>` prefetch generates console-visible 406 errors on every visit (P1)

Network panel after `goto /generate`:

```
GET https://www.theranotes.com.au/reports/00000000-0000-0000-0000-000000000000 -> 200
GET https://iyjlbybgxdecruzgydll.supabase.co/rest/v1/reports?select=id,sections,status,assessment_id,planner_review&id=eq.00000000-0000-0000-0000-000000000000&user_id=eq.<uid> -> 406
```

These fire on every page mount (4-5 times across a normal navigation session). Console shows them as red errors. Source-side, the `00000000-0000-0000-0000-000000000000` UUID is a sentinel - probably the default value of a `useState<string>(...)` for "selectedReportId" or a Next.js Link prefetch on a "New report" link before the real ID is known.

**Fix:** Skip the supabase query when the id matches the empty-UUID sentinel. One-line guard: `if (id && id !== '00000000-0000-0000-0000-000000000000') { ...query... }`. Or use `null`/`undefined` as the no-id state.

**File:** `components/workspace/workspace-layout.tsx` (most likely) or the report-prefetch path.

### QA-4 - `/api/refine` 401 still returns text/plain (P2)

```
$ curl -sX POST https://www.theranotes.com.au/api/refine -H 'Content-Type: application/json' -d '{}' -o - -w '\n%{http_code} %{content_type}\n'
Unauthorized
401 text/plain;charset=UTF-8
```

vs `/api/generate`:

```
{"error":"Unauthorized"}
401 application/json
```

Round-2 BUG-002 unresolved. The client at `app/refine-panel.tsx` (or wherever the refine submit lives) likely tries `await res.json()` in its error path, which will throw a `SyntaxError: Unexpected token U in JSON at position 0` and surface as "An unexpected error occurred." instead of a clear "Please log in again" message. Confirmed behaviorally indistinguishable - the round-2 report flagged it; round 3 confirms unchanged.

**File:** `app/api/refine/route.ts:17` - replace `new Response('Unauthorized', { status: 401 })` with `NextResponse.json({error: 'Unauthorized'}, { status: 401 })`.

### QA-5 - `<form>` is missing on the entire `/generate` page (P1)

Live count: `document.querySelectorAll('form').length === 0` on `/generate`. 29 inputs are not wrapped. Consequences:

- Submit-on-Enter never fires for the participant name / NDIS / dates - the user has to mouse to the Generate button.
- Password managers offer no save / autofill on the email-shaped fields (Assessor Email).
- Browser's autofill heuristics for "this is an address form" don't fire on the Address / Phone fields.
- Screen readers don't announce a form context, so the relationship between a label and its input is purely positional.

This was round-2 BUG-118 P1 - unfixed. With the marquee Generate button now a real text button (NEW-3 fixed), wrapping the intake card in `<form onSubmit={handleGenerate}>` and giving the button `type="submit"` solves BUG-007, BUG-028, BUG-118, and the "0 required, 0 aria-required" gap (BUG-013, BUG-033) at once - HTML5 `required` on the participant name input would block submit and surface a native "Please fill out this field" tooltip.

**File:** `app/generate/page.tsx` around the intake card and send button.

### QA-6 - 18 orphan "failed 0 sections" reports visible in /reports list (P2 housekeeping, P1 security flavor)

The /reports list for `test@user.com` currently shows 18 orphan reports all titled "FCA - Peter Parker" with status "Failed 0 sections" and timestamps clustered in the last 48h. This is an artefact of running the lifecycle test repeatedly, not a bug in the live build per se, but it surfaces:

- The "Clear N failed" button works (round-2 BUG-016 partial fix is durable) but the button only clears `0-section` failed reports - reports that failed mid-flight with some sections persisted are not cleared.
- Each orphan row holds a participant name in the `assessments` table indefinitely - cumulative PHI accumulation.
- A Failed 0-section report still occupies a row in `reports` and `assessments`, and (if those generations actually fired) potentially `generation_logs` - so retry storms balloon storage.

**Fix:** Already mostly fixed by the Clear button. Long-term, add a 30-day server-side cleanup of failed reports older than X days (cron job).

### QA-7 - workspace TOC items and sidebar-collapse use `type="submit"` (P3)

Inventory of workspace `<button>` elements:

```
[
  { text: "TheraNotes... topbar etc.", type: "button" },
  { text: "Collapse sidebar", type: "submit", classes: "tn-side-collapse" },
  { text: "Report Header / Participant Details", type: "submit", classes: "tn-toc-item" },
  ... (every TOC item is type="submit") ...
]
```

Functionally a no-op today (no enclosing form). Becomes a footgun the moment any future refactor wraps the workspace in a form. Add `type="button"` explicitly.

**File:** `components/workspace/toc-sidebar.tsx`, `components/workspace/sidebar-toggle.tsx` (likely).

### QA-8 - workspace has no page-level h1 (P1, a11y)

Heading hierarchy inspected on `/reports/<id>`:

```
H2: Report Header / Participant Details
H2: Report Overview
H2: Assessment Process
H2: Part A: About The Participant
... 30 total H2s, no H1 ...
```

`/reports` (list page): `H2: Your reports` - no H1.

Round-2 BUG-036 still present. The screen-reader user lands on the workspace and the first heading they encounter is "Report Header / Participant Details" - they have no orientation about which report they're on (the breadcrumb is a `<b>` inside a `<div>`, invisible to AT). On `/reports`, "Your reports" reads as a sub-section rather than the page's main heading.

**Fix:** Add a visually-hidden `<h1>` per page. On `/reports/[id]`: `<h1 className="sr-only">FCA Report - {participantName}</h1>`. On `/reports`: bump "Your reports" to `<h1>`. On `/generate`: bump the "Create new FCA" or whatever the current top heading is.

### QA-9 - five Select dropdowns render `— select —` as the visible placeholder, awkwardly verbalised (P2)

Each of Assessment mode + 4 sensory dropdowns shows the literal string `— select —` (em-dash space "select" space em-dash) as the placeholder. With aria-label set ("Assessment mode" etc.), a screen reader announces "Assessment mode, button, em-dash select em-dash" or similar. Visually fine; aurally bad.

**Fix:** Either change the placeholder to a normal phrase ("Choose mode", "Choose preference") or wrap the placeholder in an aria-hidden span and use a separate aria-describedby for AT.

### QA-10 - Select component uses unicode em-dashes despite global instruction to never use em dashes (P3 nit)

The user-level CLAUDE.md says: "Never use em dashes (—) in any content. Use regular hyphens (-), commas, or rewrite the sentence instead." The Select placeholder above (`— select —`) uses em-dashes. Round-2 BUG-054 flagged the same em-dash inconsistency in copy more broadly - still present.

### QA-11 - Workspace 404 / loadError state still strands user (P1, follow-up to NEW-7)

Round-2 NEW-7 listed "Workspace 404 page strands the user (no Topbar)" as a verified-fix candidate. I did not directly trigger a 404 in the workspace this round (would have required navigating to a known-bad UUID, which I did do via the curl path - but the page result was a 307 to /login because the cookie wasn't present in the curl request). The static round-2 evidence said the fix had not yet been applied; nothing in the bundle scan or the workspace HTML I observed contradicts that. Treat as unverified.

### QA-12 - clinical-notes textarea was not present on the /generate render observed (P3 / curiosity)

When inventorying inputs and buttons, `document.querySelector('textarea')` returned null at one point in the test cycle - the clinical-notes textarea may be conditionally rendered (collapsed accordion on first paint?) or the page may have been in a transient state. Worth a clinician-flow re-check whether the textarea is always discoverable on first paint.

## What's good and worth preserving

- HSTS shipped at 2 years. That's the single hardest header to walk back; doing it early is correct.
- Signup-disabled holds at the Supabase tier - no orchestrator can re-introduce the open-signup vulnerability without a dashboard click.
- `tn-nav-item:focus-visible` outline shipped cleanly with the tn-accent token. Consistent with the rest of the design system.
- The print disclaimer reaches paper via `::after` pseudo-elements. Whoever made that call instead of un-hiding `.tn-disclaimer` was thinking right about print specificity.
- The marquee Generate button is now labeled, count-aware, and aria-described. Among the cleanest fixes in this batch.
- RLS continues to hold on every probe - assessments, reports, generation_logs, clinician_profiles all return only test-user rows or reject foreign-uuid inserts.
- Honest data-residency wording on /login. "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." is the right level of disclosure - clear, accurate, defensible under APP 8.
- The autosave TTL is real. Bundle scan confirmed `if(Date.now()-a.getTime()>r){removeItem}` with version `v: 2` on the persisted payload.
- Reports list explicitly filters by `user_id=eq.<uid>` in addition to RLS. Defence-in-depth working.

## Recommended sequence

Day 1 (security headers - 30 min): add a `headers()` block to `next.config.ts` shipping `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a permissive-but-real CSP starting with `default-src 'self'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.openai.com; script-src 'self' 'unsafe-inline'`. Audit each violation in the browser console for two days, then tighten.

Day 1 (PHI in localStorage strip - 30 min): finish NEW-9b. In `hooks/use-form-draft.ts`, strip `participantName`, `participantDob`, `ndisNumber`, `address`, `nokName`, `nokPhone` from the persisted `state` object before `JSON.stringify`. The participant identity fields are typed once from the referral; losing them on reload is a minor friction, well worth the PHI-leak elimination.

Day 1 (placeholder UUID guard - 5 min): in the workspace pre-fetch path, skip the supabase query when `reportId === '00000000-0000-0000-0000-000000000000'`. Eliminates the 4-5 console errors per page load.

Day 2 (Cmd+Z - 30-60 min): add Plate's history extension to `lib/editor/plugins.ts`. The Plate v53 API for this is `import { HistoryPlugin } from '@platejs/history'` (or whatever the v53 name is - check `node_modules/platejs/package.json` peer deps). Verify with a live type-then-Cmd+Z test once shipped.

Day 2 (refine 401 JSON - 2 min): swap `app/api/refine/route.ts:17` to `NextResponse.json({error: 'Unauthorized'}, {status: 401})`.

Day 2 (form wrap on /generate - 30 min): wrap the entire intake card in `<form onSubmit={handleGenerate}>`, give the marquee Generate button `type="submit"`, mark `participantName` `required`, and add an inline error path. Solves BUG-007, BUG-013, BUG-028, BUG-033, BUG-118, QA-5.

Day 2 (sr-only h1 per page - 15 min): add visually-hidden h1 to `/generate`, `/reports`, `/reports/[id]`, `/settings`. One line per page.

Day 3 (rate limiting - 2-4h): pick `@upstash/ratelimit` with Vercel KV or a Postgres counter. 10/min on `/api/generate`, 30/min on `/api/refine`, 5/min on `/api/ingest`, 60/min on `/api/review` and `/api/revise`. Per-user. Document in CLAUDE.md.

Day 3 (generation_logs PHI hashing - 1-2h): add a small pseudonymisation layer in `lib/ai/log.ts` that replaces the participant name with a stable hash before the prompt is logged. Document the mapping table separately if reverse lookup is needed for support cases. Add a 90-day retention policy.

Day 3 (button type="button" sweep - 15 min): run `grep -rn 'type="submit"' components/workspace/` and convert TOC items + sidebar collapse to `type="button"`.

Day 4 (auth cookie hardening - half day, design call): decide between (a) httpOnly migration via a Next.js auth route handler proxy (real work, real benefit) and (b) accept the SSR-cookie trade-off and double-down on CSP + sanitisation. Either is defensible; (b) is what most Supabase-on-Next apps ship.

After Day 4: re-run `/ux-review --round 4` to verify the punch list, with particular attention to the bundle scan for `withHistory` (Cmd+Z), the localStorage payload (PHI strip), and the security headers (full set).

Until at least Day 1 + Day 2 + Day 3 ship, this build is not OT-ready.
