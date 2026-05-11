# UA-2: Auth Cookie httpOnly Refactor — Scope & Options

**Date:** 2026-05-11
**Author:** Claude Opus 4.7 overnight session
**Status:** Decision needed before any work begins

---

## Problem statement

The Supabase auth cookie (`sb-iyjlbybgxdecruzgydll-auth-token`) is currently `httpOnly: false`. Any successful XSS that runs JavaScript in a logged-in clinician's browser can read `document.cookie`, exfiltrate the access + refresh token, and impersonate that clinician for the cookie's lifetime (currently 1 year).

QA-1 from round 3 verified this live by extracting the full base64 JWT from `document.cookie` on prod.

---

## Why a one-line cookie flip doesn't work

The naive fix is to set `httpOnly: true` in the cookie config inside `lib/supabase/server.ts` (line 16 — the `setAll` callback). This would make `document.cookie` return empty string for the auth cookie.

**But this breaks the entire client-side Supabase usage**, not just `supabase.auth.getUser()` calls.

The `@supabase/ssr` browser client (`lib/supabase/client.ts` → `createBrowserClient`) does the following on every Supabase REST call:

1. Reads `document.cookie` to find the access token
2. Injects the access token into the `Authorization: Bearer <jwt>` header
3. Sends the request to Supabase

If `document.cookie` returns empty, step 1 returns null, step 2 omits the header, and step 3 hits Supabase as an anonymous request. RLS then evaluates as `anon` role and returns empty results / 401s.

So flipping `httpOnly` breaks every `supabase.from(...).select(...)` in client code, not just auth checks.

---

## Audit: how much client-side Supabase usage exists

```
$ grep -rn "supabase\." components/ hooks/ | grep -E "\.from\(|\.auth\.|\.storage\."
# Returns 27 hits across 6 component files + 2 page files
```

| File | Calls | What they do |
|---|---|---|
| `components/workspace/workspace-layout.tsx` | 6 | getUser, fetch reports/assessments, update reports, save sections, profile fetch |
| `components/reports/report-list.tsx` | 3 | getUser, fetch reports list, paginated load-more |
| `components/layout/user-menu.tsx` | 2 | getUser, sign out |
| `components/settings/profile-form.tsx` | 4 | getUser, fetchProfile, saveProfile |
| `components/settings/exemplar-list.tsx` | 2 | getUser, fetch exemplars |
| `components/report/export-button.tsx` | 2 | getUser, fetchProfile (for letterhead) |
| `app/login/page.tsx` | 3 | signInWithPassword, getSession, etc. |
| `app/generate/page.tsx` | 5 | getUser, insert assessment, multiple state queries |

**Total: 27 individual client-side Supabase calls that need migration.**

---

## Three options

### Option 1 — Full Server Action refactor (the "right" fix)

Move every Supabase call to a Server Action or API route. Client components fetch data via `fetch('/api/...')`, never directly. Then flip `httpOnly: true`.

**Effort:** 2-3 days focused engineering.

**What gets created:**
- ~12 new Server Actions (one per logical operation: createReport, listReports, deleteReport, updateReport, fetchProfile, saveProfile, listExemplars, deleteExemplar, etc.)
- A small number of new API routes for paginated reads
- A wrapper around `supabase.auth.signIn` for the login flow (or migrate to Server Action `signIn`)

**What gets removed:**
- All `createClient()` calls in client components
- All `supabase.from(...)` calls in client components
- The browser client lib becomes only `createBrowserClient` for the initial sign-in flow

**Risk:**
- High. Breaks every authenticated surface during migration; needs careful staged rollout.
- Each Server Action needs its own auth check (`getUser()` server-side) and RLS-equivalent filtering.
- Loading states / optimistic UI patterns need rebuilding.

**Benefit:**
- Architecturally clean, `httpOnly: true` ships, XSS-to-takeover path closed structurally.
- Foundation for ever shipping the app multi-tenant.

### Option 2 — CSP tightening only (the practical fix)

Keep the SSR cookie posture but eliminate the XSS injection surface via strict CSP. Tighten the current `script-src 'self' 'unsafe-inline'` to `script-src 'self' 'nonce-{random}' 'strict-dynamic'` using middleware-injected nonces.

If no inline scripts can execute except nonce'd ones, an XSS that injects a script tag can't run, and `document.cookie` can't be read.

**Effort:** 4-8 hours. Mostly:
- Modify `proxy.ts` to generate a per-request nonce and inject it into the response headers + a request header that React/Next can read.
- Modify `next.config.ts` headers to consume the nonce.
- Test that Plate.js, Radix popovers, shadcn modals, and Google Fonts all work under the strict CSP.
- 2-3 days of Sentry observation before declaring the CSP stable.

**Risk:**
- Medium. CSP strict-dynamic forces dynamic rendering (kills static optimization) — acceptable for an authenticated app.
- Plate.js + Radix may have unanticipated inline-script needs (slate-react's contenteditable shim, Radix's portal management).
- Mitigation: ship as `Content-Security-Policy-Report-Only` first, watch reports for a week, then promote.

**Benefit:**
- Closes the XSS-to-takeover path indirectly by preventing the XSS itself.
- No architectural refactor required.
- Same outcome as Option 1 for the documented attack scenario.

### Option 3 — Status quo + monitoring

Accept the `httpOnly: false` posture, rely on the current CSP (with `'unsafe-inline'` for scripts) + careful sanitization of clinical content. Add Sentry alerts on unusual auth patterns.

**Effort:** ~1 hour. Mostly Sentry alert configuration.

**Risk:**
- Highest of the three. Any XSS = full account takeover.
- React 19's default escaping + no unsafe HTML insertion on untrusted input is the only structural defence.
- Defensible for a single-tenant internal-Flourish tool. Not defensible for a multi-clinic alpha.

**Benefit:**
- No engineering work.
- Most Supabase-on-Next apps ship this posture (survivorship bias, not best practice).

---

## My recommendation

**Option 2 (CSP tightening)** for the round-4 / round-5 timeline, deferring Option 1 until the app is genuinely multi-tenant.

Reasoning:
1. Option 2 closes the **same attack class** (XSS-to-takeover) at ~10% of the engineering cost
2. Option 1's benefits (clean architecture, multi-tenancy foundation) are real but not the OT-pilot blocker
3. Option 3 is defensible for the internal-Flourish posture but degrades the moment a second clinic onboards

The path: tighten CSP → ship as Report-Only → observe 1 week → promote to enforcing → assess whether Option 1 is still needed (likely yes for multi-tenant alpha, but not for the OT pilot).

---

## Decision needed

| Question | Default |
|---|---|
| Pick Option 1, 2, or 3? | **2** |
| If Option 2: when to start? | After round-4 ux-review confirms current CSP is stable |
| If Option 2: who staffs it? | Pair-program session (4-8h) |
| If Option 1: schedule for when? | After OT pilot validates the product fit |

---

## References

- Round-3 QA-1 finding (`UI-UX/round-3/05-qa-edge-cases.md`)
- Supabase Discussion #12303 — Make auth JWTs httpOnly by default
- Supabase Server-Side Auth Creating a Client (current docs)
- OWASP Session Management Cheat Sheet (HttpOnly mandatory)
- Next.js Content Security Policy guide (May 2026)
- OAIC APP 11 — Security of Personal Information
