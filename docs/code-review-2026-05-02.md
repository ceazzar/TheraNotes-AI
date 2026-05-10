# Code Review — TheraNotes AI

**Date:** 2026-05-02
**Scope:** Full codebase review of `/Users/ceazar/code-base/TheraNotes-AI`
**Review method:** Primary review + 2-agent cross-verification (`superpowers:code-reviewer` for standards alignment, `codex:codex-rescue` for fresh-perspective bug hunt)

---

## Finding Summary

| # | Severity | Category | Finding | Cross-Verified |
|---|---|---|---|---|
| CR1 | Critical | Security | Secrets committed in `.env.local` (OpenAI key, Supabase keys, Vercel OIDC) | Not checked by agents |
| CR2 | Critical | Config | All AI calls default to `gpt-4o`, not `gpt-5.4`/`gpt-5.4-pro` per architecture spec | CONFIRMED (Agent 2) |
| CR3 | Critical | Config | `SUPABASE_SERVICE_ROLE_KEY` empty — RAG layer silently broken | Not checked by agents |
| CR4 | Critical | Architecture | Generate/revise use Chat Completions API, not Responses API — `reasoning.effort` never passed | CONFIRMED (Agent 2) |
| H1 | High | Security | XSS via raw HTML rendering of AI-generated content in formatted report | Not checked by agents |
| H2 | High | Security | No CSRF protection on state-changing API routes (Route Handlers, not Server Actions) | Not checked by agents |
| H3 | High | Security | Prompt injection vector — raw clinical notes interpolated directly into LLM prompts with no fenced boundary | NEW (Agent 3) |
| M1 | Medium | Architecture | Race condition — parallel section requests on same `reportId` cause last-write-wins on JSONB sections column | NEW (Agent 3) |
| M2 | Medium | Architecture | Duplicate DOCX export logic in 2 places + 1 unused shared module | Not checked by agents |
| M3 | Medium | Architecture | `chat-tools.ts` tools defined but never wired into chat route | CONFIRMED (Agent 2) |
| M4 | Medium | Architecture | Client-side sequential generation — no retry, no resume, one failure breaks the chain | CONFIRMED (Agent 2) |
| M5 | Medium | Bug | No in-flight guard on Generate button — rapid double-clicks create duplicate assessments | NEW (Agent 3) |
| M6 | Medium | Bug | Stale async after unmount — navigating away mid-generation leaves setters running | NEW (Agent 3) |
| M7 | Medium | Bug | Generation logging gaps — `runCoherenceCheck()` and `routeFeedbackToSections()` errors not logged | NEW (Agent 2) |
| M8 | Medium | Bug | PDF parser resource leak — `parser.destroy()` unreachable if `parser.getText()` throws | NEW (Agent 3) |
| M9 | Medium | Design | Design token mismatch — background is `#FFFFFF`, spec calls for `#F6F5F2`; line color is `#E5E7EB`, spec calls for `#E7E4DD` | NEW (Agent 2) |
| M10 | Medium | Bug | Markdown table formatting loss — `**bold**` stripped during Plate.js import, inline formatting in tables irreversibly lost | NEW (Agent 3) |
| L1 | Low | Config | Hardcoded test credentials in `CLAUDE.md` (`test@user.com` / `test123`) | Not checked by agents |
| L2 | Low | Code Quality | Rule numbering error in `lib/ai/prompts.ts` — rule 9 between rules 5 and 6 | CONFIRMED (Agent 2) |
| L3 | Low | Code Quality | Plate editor `any` type with eslint-disable in `plate-to-sections.ts` | Not checked by agents |
| L4 | Low | Code Quality | `filter(c => c !== '' || true)` no-op in `formatted-report.tsx:235` | Not checked by agents |
| L5 | Low | Code Quality | Missing loading/empty/error states in `ExemplarList`, `ExemplarUpload`, `FormattedReport` | Not checked by agents |
| L6 | Low | Code Quality | Auto-save retries indefinitely with no backoff, max retries, or user notification | Not checked by agents |
| L7 | Low | Code Quality | Inconsistent OpenAI client pattern — `@ai-sdk/openai` in chat/refine routes vs raw `openai` SDK in generate/revise | Not checked by agents |
| L8 | Low | Testing | Zero automated tests — no unit, integration, or E2E tests exist | Not checked by agents |
| L9 | Low | Config | `pnpm-workspace.yaml` exists but project is a single package | Not checked by agents |
| L10 | Low | Security | Cross-tenant RLS concern — client-side report reads scope only by `id`; RLS gap would permit cross-tenant access | NEW (Agent 3) |

**Totals:** 4 Critical, 3 High, 10 Medium, 10 Low = **27 findings** (9 discovered by cross-verification agents)

---

## Critical Findings

### CR1 — Secrets committed in `.env.local`

**File:** `.env.local` (project root)
**Status:** Verified by file read

The file contains:
- OpenAI API key (`sk-proj-...`)
- Supabase anon key and project URL
- Vercel OIDC token

`.gitignore` line 34 has `.env*` and line 44 has `.env*.local`, but the file was committed before the gitignore rules were in place (or was force-added).

**Action:** Rotate all exposed credentials immediately. Run `git rm --cached .env.local` to stop tracking. The OpenAI key has full account access and is the most urgent.

### CR2 — All AI calls default to `gpt-4o`, not architecture-spec models

**Status:** CONFIRMED by Agent 2

| File | Line | Current | Architecture spec says |
|---|---|---|---|
| `app/api/chat/route.ts` | 67 | `openai('gpt-4o')` | `gpt-5.4` (reasoning: none) |
| `lib/ai/generate.ts` | 117 | `GENERATION_MODEL \|\| 'gpt-4o'` | `gpt-5.4-pro` (reasoning: high) |
| `lib/ai/revise.ts` | 26 | `GENERATION_MODEL \|\| 'gpt-4o'` | `gpt-5.4-pro` (reasoning: high) |
| `app/api/refine/route.ts` | 36 | `openai('gpt-4o')` | should use generation model |

The `CHAT_MODEL` and `GENERATION_MODEL` env vars are checked but fall back to the wrong model.

**Action:** Change all fallback values from `'gpt-4o'` to the correct model strings. Set `CHAT_MODEL` and `GENERATION_MODEL` env vars in deployment.

### CR3 — `SUPABASE_SERVICE_ROLE_KEY` is empty

**File:** `.env.local:6`
**Impact:** `lib/supabase/server.ts:25-33` creates a service client with this key. `lib/ai/rag.ts:29` calls `createServiceClient()` for pgvector similarity search. Since the key is empty, all RPC calls fail. `queryRag()` silently catches errors and returns `{ foundational: [], userStyle: [] }`, meaning every report is generated with zero RAG context.

**Action:** Populate `SUPABASE_SERVICE_ROLE_KEY` with the actual Supabase service role key.

### CR4 — Responses API not used; `reasoning.effort` never passed

**Status:** CONFIRMED by Agent 2

`lib/ai/generate.ts:123` and `lib/ai/revise.ts:104` use `openai.chat.completions.create()` (Chat Completions API). The architecture specifies the Responses API to enable `reasoning.effort: "high"` for `gpt-5.4-pro`. The Chat Completions endpoint does not support the `reasoning` parameter, so deep chain-of-thought reasoning is never engaged.

**Action:** Migrate `generate.ts` and `revise.ts` to the OpenAI Responses API (`openai.responses.create()`), passing `reasoning: { effort: "high" }` for generation calls.

---

## High-Severity Findings

### H1 — XSS via raw HTML rendering of AI-generated content

**File:** `components/report/formatted-report.tsx:74,208,218`

The `renderInlineMarkdown` function escapes `&`, `<`, `>` first, then converts `**text**` to `<strong>` tags. However, any HTML present in the raw LLM output before entity escaping gets double-encoded rather than stripped. Since the source is AI-generated content from user-supplied clinical notes, prompt injection is a plausible vector — an attacker could craft clinical notes that cause the LLM to output malicious HTML. The current code uses React's `d*ngerouslySetInnerHTML` prop (asterisk intentional, see file) without a proper sanitizer like DOMPurify.

**Action:** Replace the custom inline markdown renderer with a proper markdown-to-React library (e.g., `react-markdown`) or add DOMPurify sanitization before rendering.

### H2 — No CSRF protection on API routes

All POST/DELETE endpoints (`/api/generate`, `/api/revise`, `/api/refine`, `/api/reports/[id]`, `/api/review`, `/api/companion`, `/api/ingest`) are Next.js Route Handlers (`route.ts`), not Server Actions. Route Handlers do not have built-in CSRF protection. They rely solely on Supabase auth cookies.

**Action:** Add CSRF token validation middleware, or migrate state-changing operations to Server Actions which have built-in CSRF protection.

### H3 — Prompt injection vector (NEW — Agent 3)

**File:** `lib/ai/prompts.ts:84,159-168`

Raw `clinicalNotes` and `reportSoFar` are interpolated directly into the LLM user prompt with no fenced data boundary. A clinical note containing "Ignore previous instructions..." could compete with the system prompt's anti-hallucination rules. The prompts do not wrap user data in delimiters like `<clinical_notes>...</clinical_notes>` or include explicit instructions to distinguish data from commands.

**Action:** Wrap all user-supplied data in XML-style fenced boundaries (e.g., `<clinical_notes>...</clinical_notes>`) and add explicit instructions to treat fenced content as data, not commands.

---

## Medium-Severity Findings

### M1 — Race condition on sections JSONB (NEW — Agent 3)

**File:** `app/api/generate/route.ts:131,183-191`

The handler reads the current `sections` JSONB object at line 131, generates a new section, then overwrites the entire object at lines 183-191. If two section generation requests for the same `reportId` complete near-simultaneously, the second write silently drops the first's update.

**Action:** Use a database-level atomic update (e.g., `jsonb_set` or Supabase RPC function) to append a single section key rather than read-modify-write the entire object.

### M2 — Duplicate DOCX export logic

**Files:** `components/report/export-button.tsx`, `components/workspace/workspace-layout.tsx`

Identical DOCX generation code in two components. `lib/export/docx.ts` exists but is never imported. Any formatting fix requires changes in two places.

**Action:** Delete the duplicated logic and have both components import from `lib/export/docx.ts`.

### M3 — `chat-tools.ts` never wired

**Files:** `lib/ai/chat-tools.ts`, `app/api/chat/route.ts`

`chat-tools.ts` defines `generate_report`, `revise_section`, `get_report_status`, `record_correction`, and `get_past_corrections`. The chat route defines its own inline versions of `record_correction` and `get_past_corrections` but never imports the shared definitions. `generate_report` and `revise_section` are completely unused.

**Action:** Either wire `chat-tools.ts` into the chat route and delete the inline duplicates, or delete `chat-tools.ts` if the client-side trigger approach is permanent.

### M4 — Client-side sequential generation (brittle)

**File:** `app/generate/page.tsx:128-166`

Sections are generated via a sequential `for` loop with `fetch()`. Each call can take up to 300s. No retry logic, no resume capability. If section 5 of 8 fails, the user has a half-generated report with no way to resume.

**Action:** Add per-section retry logic and a "resume generation" capability that detects already-completed sections.

### M5 — No in-flight guard on Generate (NEW — Agent 3)

**File:** `app/generate/page.tsx:84`

`runGeneration` has no guard against rapid double-clicks. Before `isGenerating` state propagates, a second click creates duplicate assessments and report chains for the same notes.

**Action:** Add a ref-based guard (`useRef(false)`) that is checked synchronously at the top of `runGeneration`.

### M6 — Stale async after unmount (NEW — Agent 3)

**File:** `app/generate/page.tsx:151`

The async generation loop continues calling state setters after awaited network work with no mounted/cancel check. Navigating away mid-generation leaves stale async work running against an unmounted component tree.

**Action:** Use an `AbortController` or a `useRef(true)` mounted flag checked before each `setState` call.

### M7 — Generation logging gaps (NEW — Agent 2)

| Function | Success logged | Error logged |
|---|---|---|
| `generateSection()` | Yes | Yes |
| `runCoherenceCheck()` | Yes | **No** |
| `routeFeedbackToSections()` | **No** | **No** |
| `reviseSection()` | Yes | **No** |
| `/api/refine` | Yes | **No** |

**Action:** Wrap all LLM calls in try/catch that calls `logGeneration()` before re-throwing. Add logging to `routeFeedbackToSections()`.

### M8 — PDF parser resource leak (NEW — Agent 3)

**File:** `lib/ingest/parser.ts:13-14`

`PDFParse` is constructed manually, then `parser.getText()` is called. If `getText()` throws, `parser.destroy()` is never reached, leaking PDF parser resources.

**Action:** Use a try/finally block to ensure `parser.destroy()` is always called.

### M9 — Design token mismatch (NEW — Agent 2)

**File:** `app/globals.css:126`

| Token | Actual | Spec (`.design-context.md`) |
|---|---|---|
| Background (`--tn-bg`) | `#FFFFFF` | `#F6F5F2` (warm off-white) |
| Line (`--tn-line`) | `#E5E7EB` | `#E7E4DD` (warm hairline) |
| Ink, accent, severity colors | Match spec | Match spec |

**Action:** Align CSS variables with the design context values, or update the design context to match the implemented look.

### M10 — Markdown table formatting loss (NEW — Agent 3)

**File:** `lib/editor/report-to-plate.ts:50`

Table cell text has `**bold**` markers stripped via `.replace(/\*\*/g, '')` during Plate.js import. All inline formatting (bold, italic) in report tables is irreversibly lost when opening a generated report in the workspace editor.

**Action:** Parse and preserve inline formatting within table cells during the markdown-to-Plate conversion.

---

## Low-Severity Findings

### L1 — Hardcoded test credentials

**File:** `CLAUDE.md:16-17`
`test@user.com` / `test123` in plaintext in a documentation file.

### L2 — Rule numbering error

**File:** `lib/ai/prompts.ts:131-138`
Rules ordered 1, 2, 3, 4, 5, 9, 6, 7, 8. Rule 9 inserted between 5 and 6 without renumbering.

### L3 — `any` type escape hatch

**File:** `lib/editor/plate-to-sections.ts:17`
`editor: any` with `eslint-disable-next-line @typescript-eslint/no-explicit-any`.

### L4 — No-op filter

**File:** `components/report/formatted-report.tsx:235`
`filter(c => c !== '' || true)` always returns `true`, making the filter a no-op. Debugging leftover.

### L5 — Missing component states

`ExemplarList`, `ExemplarUpload`, and `FormattedReport` lack loading skeletons, empty states, and error boundaries.

### L6 — Auto-save no backoff

**File:** `hooks/use-auto-save.ts:26-32`
Retries failed saves indefinitely every 1.5s with no exponential backoff, max retries, or user-facing error.

### L7 — Inconsistent OpenAI client

Chat/refine routes use `@ai-sdk/openai` (Vercel AI SDK). Generate/revise use raw `openai` npm SDK. Two patterns for the same task.

### L8 — Zero automated tests

`tests/` directory exists but contains no test files. `package.json` has no test scripts. No unit, integration, or E2E tests.

### L9 — Unused monorepo config

`pnpm-workspace.yaml` exists but the project is a single package.

### L10 — Cross-tenant RLS concern (NEW — Agent 3)

**File:** `components/workspace/workspace-layout.tsx:82,151-154`
Client-side Supabase queries scope by report `id` only. Database RLS policies (in migrations) provide the actual tenant isolation, but any RLS gap would enable cross-tenant access since the client code does not double-check `user_id`.

---

## Remediation Priority

| Priority | Findings | Effort |
|---|---|---|
| **P0 — Immediate** | CR1 (rotate secrets), CR3 (set service role key) | Minutes |
| **P1 — This sprint** | CR2 (fix model defaults), CR4 (Responses API), H1 (sanitize HTML rendering), H3 (prompt injection fences) | 1-2 days |
| **P2 — Next sprint** | M1 (JSONB race), M2 (deduplicate DOCX), M4 (retry/resume gen), M5 (double-submit guard), M6 (unmount check), M7 (logging gaps), M8 (PDF leak) | 2-4 days |
| **P3 — Backlog** | H2 (CSRF), M3 (wire chat-tools), M9 (design tokens), M10 (table formatting), L1-L10 | Ongoing |

---

## Targeted Retest Validation - 2026-05-02

**Retest scope:** Static code validation of all findings in this review document, plus targeted regression validation of the prior 10 findings from the previous review cycle.

**Commands run:**

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Targeted `rg`, `sed`, `nl`, `git ls-files`, `git check-ignore`, and sanitized `.env.local` checks.

**Important limitation:** The untracked E2E script at `tests/e2e/peter-parker-e2e.mjs` was inspected but not executed. It signs in to Supabase, creates database rows, reads local Peter Parker clinical fixture files, and calls generation APIs that can invoke OpenAI. It is also untracked code. Running it should be treated as a separate explicit E2E action after the TypeScript/build blockers below are fixed.

### Build and Typecheck Status

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | Pass | ESLint completes with exit 0. |
| `npx tsc --noEmit` | Fail | 3 TypeScript errors found. |
| `npm run build` | Fail | Next compiles, then fails during TypeScript checking. |

TypeScript/build blockers found during retest:

1. `app/api/refine/route.ts:50-52` uses `usage.promptTokens` and `usage.completionTokens`, but AI SDK v6 `LanguageModelUsage` exposes `inputTokens`, `outputTokens`, and `totalTokens`.
2. `components/reports/report-list.tsx:66` calls `.catch()` on the Supabase query chain result, which TypeScript sees as `PromiseLike<void>` without a `.catch()` method.

These blockers are not listed in the original finding table and should be added as new high-priority build findings.

### Finding Validation Matrix

| ID | Retest Status | Evidence |
|---|---|---|
| CR1 | Partially confirmed, wording inaccurate | `.env.local` exists and contains local secrets, including non-empty OpenAI and Vercel OIDC values. However, `git ls-files --error-unmatch .env.local` returned nonzero and `git check-ignore -v .env.local` showed it is ignored by `.gitignore:44`, so the "committed" claim was not confirmed. |
| CR2 | Confirmed | `app/api/chat/route.ts`, `app/api/refine/route.ts`, `lib/ai/generate.ts`, and `lib/ai/revise.ts` still use `gpt-4o` fallbacks or hardcoded `gpt-4o`. |
| CR3 | Confirmed for local env | Sanitized `.env.local` check shows `SUPABASE_SERVICE_ROLE_KEY=<empty>`. `createServiceClient()` depends on this key, and `queryRag()` catches all failures and returns empty RAG context. |
| CR4 | Confirmed | `lib/ai/generate.ts` and `lib/ai/revise.ts` use `getOpenAI().chat.completions.create(...)`; no `responses.create` usage was found for generation/revision. |
| H1 | Not confirmed as written | `FormattedReport` does use `dangerouslySetInnerHTML`, but `renderInlineMarkdown()` escapes `&`, `<`, and `>` before adding limited `<strong>` and `<em>` tags. A smoke check of malicious `<img onerror>` input rendered it as escaped text. The pattern deserves cleanup, but the stated raw-HTML XSS path was not reproduced. |
| H2 | Confirmed | State-changing Route Handlers and client fetches were found for generate, revise, refine, review, companion, ingest, and report deletion. No CSRF token/origin validation was found. |
| H3 | Confirmed | `lib/ai/prompts.ts` interpolates `clinicalNotes`, `reportSoFar`, `currentContent`, and `userFeedback` directly into prompt text without fenced data boundaries or explicit data-not-instructions framing. |
| M1 | Confirmed | `app/api/generate/route.ts` reads `reports.sections`, merges in memory, then updates the whole JSONB object. No atomic `jsonb_set`/RPC update was found. |
| M2 | Confirmed | DOCX export logic remains duplicated in `components/report/export-button.tsx` and `components/workspace/workspace-layout.tsx`; `lib/export/docx.ts` exists but is not used by either component. |
| M3 | Confirmed | `lib/ai/chat-tools.ts` is not imported by `app/api/chat/route.ts`; the route defines inline tools instead. |
| M4 | Confirmed | `app/generate/page.tsx` still performs client-side sequential section generation in a `for` loop without retry/resume support. |
| M5 | Confirmed | `runGeneration()` has no synchronous ref-based in-flight guard. `isGenerating` is set asynchronously through React state. |
| M6 | Confirmed | The generation loop has no `AbortController` or mounted/cancel guard before post-await state updates. |
| M7 | Confirmed | `generateSection()` logs success and error; `runCoherenceCheck()` logs success only; `routeFeedbackToSections()`, `reviseSection()` error paths, and `/api/refine` error paths do not log failures. |
| M8 | Confirmed | `lib/ingest/parser.ts` creates `PDFParse`, awaits `parser.getText()`, then destroys the parser after success only. No `finally` block exists. |
| M9 | Confirmed | `app/globals.css` still sets `--tn-bg: #FFFFFF` and `--tn-line: #E5E7EB`; the review document says the spec expects `#F6F5F2` and `#E7E4DD`. |
| M10 | Confirmed | `lib/editor/report-to-plate.ts` strips `**` in table cells with `text.replace(/\*\*/g, '')`, losing inline bold markers. |
| L1 | Not retested | `CLAUDE.md` was not read during this retest because it may contain the plaintext test credentials called out in the finding. |
| L2 | Confirmed | `lib/ai/prompts.ts` rule ordering remains `1,2,3,4,5,9,6,7,8`. |
| L3 | Confirmed | `lib/editor/plate-to-sections.ts` still uses `editor: any` with an eslint-disable comment. |
| L4 | Confirmed | `components/report/formatted-report.tsx` still contains `.filter(c => c !== '' || true)`, which is a no-op. |
| L5 | Partially confirmed | `ExemplarList` and `ExemplarUpload` have basic loading/empty/result states. `FormattedReport` returns `null` when empty and has no visible empty/error state. The broad "missing states" claim is overstated for the settings components. |
| L6 | Confirmed | `useAutoSave()` retries by marking dirty again on every failed save and has no max retry count, backoff, or user-visible error state. |
| L7 | Confirmed | Chat/refine use Vercel AI SDK; generate/revise use raw OpenAI SDK. |
| L8 | Partially confirmed, wording outdated | `package.json` still has no test script and no tracked tests were found, but an untracked `tests/e2e/peter-parker-e2e.mjs` script and output artifacts now exist. The "zero automated tests exist" statement is no longer strictly accurate in the working tree. |
| L9 | Confirmed | `pnpm-workspace.yaml` exists while the project has a single `package.json` package. |
| L10 | Confirmed as defense-in-depth concern | Client-side workspace/report queries often scope by report `id` only and rely on Supabase RLS for tenant isolation. Migrations do define RLS policies for reports, so this is a hardening concern rather than a confirmed exploit. |

### Prior 10-Finding Regression Retest

The earlier 10 findings supplied in the retest prompt were also checked against current code:

| Prior Finding | Retest Result |
|---|---|
| Generate invalid assessment row | Fixed. `app/generate/page.tsx` inserts allowed columns and uses `status: 'generating'`. |
| First report insert missing `session_id` | Fixed. `app/api/generate/route.ts` creates a session for assessment-based generation and inserts `session_id`. |
| Revision chat wrong identifier | Fixed. `app/api/chat/route.ts` accepts `reportId` or `sessionId` and scopes report lookup by `user_id`. |
| Workspace editor not rendering Plate content | Fixed. `components/workspace/plate-editor.tsx` renders `PlateContent`. |
| NDIS review button unconnected | Fixed. `WorkspaceLayout` passes `handleRunReview` to both topbar and footer buttons. |
| RAG section filter OR precedence bug | Fixed. `supabase/migrations/002_match_function.sql` and `004_fix_match_exemplar_filter.sql` wrap the user/foundational predicate and apply the section filter outside it. |
| Foundational seed embedding vector size mismatch | Fixed. `scripts/seed-foundational.ts` passes `dimensions: 1536`. |
| Agent service empty shared secret | Fixed. `agents/server.py` fails closed when `AGENT_API_KEY` is unset; Vercel proxy routes also require both agent env vars. |
| Next 16 `middleware.ts` deprecation | Fixed for app root. `proxy.ts` exists. A library helper file remains at `lib/supabase/middleware.ts`, but that is not the Next root convention file. |
| Auto-save React ref rule | Fixed. `saveRef.current = save` now runs inside a `useEffect`. |

### Retest Conclusion

Most findings in the 2026-05-02 review are still valid, but the document should be corrected in three places:

1. CR1 should say local ignored `.env.local` contains secrets, not that `.env.local` is currently committed.
2. H1 should be downgraded or reworded because the direct raw-HTML XSS path was not reproduced; the code still uses a risky rendering pattern, but it escapes user/LLM HTML before injecting markdown tags.
3. L5 and L8 should be reworded because the working tree now contains basic exemplar states and an untracked E2E script.

The most urgent newly discovered blocker is that the app currently fails TypeScript and production build.
