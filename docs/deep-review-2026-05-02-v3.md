# Deep Review Report

**Generated:** 2026-05-02 18:29
**Model:** deepseek-v4-flash
**Passes:** security, bugs, architecture, types
**Files scanned:** 108
**Duration:** 271.2s
**Findings:** 11 (11 new, 0 recurring, 0 reopened)

---

## Summary

| # | Status | Severity | Category | File | Line | Finding | Score |
|---|---|---|---|---|---|---|---|
| 1 | NEW | critical | type-safety | `lib/ingest/parser.ts` | 14 | Uses `new PDFParse(...)` which is not the correct API for typical `pdf-parse` library; the library exports a function, not a class. This will throw a runtime error when processing PDF files. | 9/10 |
| 2 | NEW | high | type-safety | `app/api/revise/route.ts` | 23 | `report.sections` is cast to `Record<string, { title: string; content: string }>` without a null check. If `report.sections` is null (e.g., from a broken report), accessing `sections[sectionId]` will throw a runtime error. | 7/10 |
| 3 | NEW | high | type-safety | `app/error.tsx` | 1 | Uses `unstable_retry` prop which was renamed to `reset` in Next.js 15. In current versions of Next.js 15, this prop may not be passed to the error component, causing a runtime error when the user clicks 'Try again'. | 8/10 |
| 4 | NEW | high | xss | `components/report/formatted-report.tsx` | 89 | Uses `dangerouslySetInnerHTML` to render section content and table cells. Content originates from LLM output which can be influenced by malicious clinical notes or prompt injection, allowing execution of arbitrary HTML/JavaScript. | 7/10 |
| 5 | NEW | high | logic-error | `components/workspace/workspace-layout.tsx` | 200 | The `jumpTo` function uses `h.textContent?.includes(id)` to locate the section heading. However, `id` is a section key (e.g., `'report_header'`) while the heading text is the full title (e.g., `'Report Header / Participant Details'`). The `includes` check will never match, so clicking a sidebar item does not scroll to the intended section. | 8/10 |
| 6 | NEW | medium | access-control | `agents/revision_agent/agent.py` | 63 | `record_correction` inserts a correction row with a `user_id` taken from the agent input, without verifying that the caller controls that user. This lets an attacker record corrections for any user if they can invoke this agent. | 6/10 |
| 7 | NEW | medium | csrf | `agents/server.py` | 21 | All POST endpoints (`/review`, `/companion`, `/revise`) rely solely on the `Authorization` header with a static API key for the agent service, but the Vercel API routes that call them authenticate via cookie. No CSRF protection is present for the Next.js API routes themselves, making them potentially vulnerable to cross-site request forgery if the session cookie is sent. | 6/10 |
| 8 | NEW | medium | logic-error | `app/api/generate/route.ts` | 100 | The `corrections` query filters by `section` equal to `sectionId` from the request body. If the frontend sends a section identifier that does not exactly match the template section name (e.g., a short key vs. the full name), past corrections for that section will not be retrieved, defeating the purpose of the learning system. | 5/10 |
| 9 | NEW | medium | xss | `components/ui/code-block.tsx` | 60 | Uses `dangerouslySetInnerHTML` to render syntax-highlighted code fetched from LLM output. If the code string contains malicious markup, it will be executed in the user's browser. | 5/10 |
| 10 | NEW | medium | type-safety | `lib/ai/rag.ts` | 56 | `row.id as string` is an unsafe type assertion that masks potential null values from the database. If the database returns null for `id`, the cast will result in `null` being treated as a string, leading to runtime errors when accessing string methods. | 5/10 |
| 11 | NEW | medium | type-safety | `lib/ingest/embedder.ts` | 16 | `response.data[0]` assumes at least one embedding exists. If the OpenAI API returns an empty array (e.g., due to an empty input), accessing `embedding` on undefined will throw. | 7/10 |

## Details

### 1. [NEW] [CRITICAL] Uses `new PDFParse(...)` which is not the correct API for typical `pdf-parse` library; the library exports a function, not a class. This will throw a runtime error when processing PDF files.

- **File:** `lib/ingest/parser.ts`
- **Line:** 14
- **Category:** type-safety
- **Pass:** types
- **Score:** 9/10
- **Rationale:** PDF parsing uses incorrect API (new PDFParse) which will throw at runtime; PDF processing is completely broken.
- **Suggestion:** Use the standard pdf-parse API: `const data = await pdf(buffer); return data.text;` or use a library like `pdfjs-dist` instead.
- **ID:** `e217e3aa103aec32`

### 2. [NEW] [HIGH] `report.sections` is cast to `Record<string, { title: string; content: string }>` without a null check. If `report.sections` is null (e.g., from a broken report), accessing `sections[sectionId]` will throw a runtime error.

- **File:** `app/api/revise/route.ts`
- **Line:** 23
- **Category:** type-safety
- **Pass:** types
- **Score:** 7/10
- **Rationale:** report.sections is cast without null check, causing crash if the column is null despite report object existing.
- **Suggestion:** Add a nullish coalescing fallback: `const sections = (report.sections ?? {}) as Record<string, ...>`.
- **ID:** `fba1a1457399418e`

### 3. [NEW] [HIGH] Uses `unstable_retry` prop which was renamed to `reset` in Next.js 15. In current versions of Next.js 15, this prop may not be passed to the error component, causing a runtime error when the user clicks 'Try again'.

- **File:** `app/error.tsx`
- **Line:** 1
- **Category:** type-safety
- **Pass:** types
- **Score:** 8/10
- **Rationale:** Deprecated unstable_retry prop will cause runtime error in Next.js 15; 'Try again' button non-functional.
- **Suggestion:** Update to use `reset` instead of `unstable_retry` and accept only `error` and `reset` in the props.
- **ID:** `5e217a9195393f0d`

### 4. [NEW] [HIGH] Uses `dangerouslySetInnerHTML` to render section content and table cells. Content originates from LLM output which can be influenced by malicious clinical notes or prompt injection, allowing execution of arbitrary HTML/JavaScript.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 89
- **Category:** xss
- **Pass:** security
- **Score:** 7/10
- **Rationale:** Valid XSS concern as dangerouslySetInnerHTML is used with LLM output, but the code does perform basic HTML escaping, reducing risk.
- **Suggestion:** Replace `dangerouslySetInnerHTML` with a safe rendering approach (e.g., React children or a sanitizer like DOMPurify) or ensure all content is escaped before insertion.
- **ID:** `9f5ba12708de561f`

### 5. [NEW] [HIGH] The `jumpTo` function uses `h.textContent?.includes(id)` to locate the section heading. However, `id` is a section key (e.g., `'report_header'`) while the heading text is the full title (e.g., `'Report Header / Participant Details'`). The `includes` check will never match, so clicking a sidebar item does not scroll to the intended section.

- **File:** `components/workspace/workspace-layout.tsx`
- **Line:** 200
- **Category:** logic-error
- **Pass:** bugs
- **Score:** 8/10
- **Rationale:** jumpTo uses includes(id) on heading text which will never match the section key, breaking sidebar scrolling.
- **Suggestion:** Add a `data-section-id` attribute to each h2 element or use a more robust mapping from section key to heading content.
- **ID:** `a893d2cfdc4e9a67`

### 6. [NEW] [MEDIUM] `record_correction` inserts a correction row with a `user_id` taken from the agent input, without verifying that the caller controls that user. This lets an attacker record corrections for any user if they can invoke this agent.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 63
- **Category:** access-control
- **Pass:** security
- **Score:** 6/10
- **Rationale:** record_correction accepts user_id without verification; attacker with API key could impersonate any user.
- **Suggestion:** Enforce that the `user_id` passed to `record_correction` matches the authenticated user of the request (e.g., pass the user context from `agents/server.py` and reject mismatches).
- **ID:** `bc233358eec96e6b`

### 7. [NEW] [MEDIUM] All POST endpoints (`/review`, `/companion`, `/revise`) rely solely on the `Authorization` header with a static API key for the agent service, but the Vercel API routes that call them authenticate via cookie. No CSRF protection is present for the Next.js API routes themselves, making them potentially vulnerable to cross-site request forgery if the session cookie is sent.

- **File:** `agents/server.py`
- **Line:** 21
- **Category:** csrf
- **Pass:** security
- **Score:** 6/10
- **Rationale:** CSRF risk in Vercel API routes is valid but mitigated by SameSite cookies; not exploitable in typical usage.
- **Suggestion:** Add CSRF tokens or enforce `SameSite=Strict` on the session cookie. Alternatively, require the `Authorization` header on every request to the API routes.
- **ID:** `36da6a312c95917e`

### 8. [NEW] [MEDIUM] The `corrections` query filters by `section` equal to `sectionId` from the request body. If the frontend sends a section identifier that does not exactly match the template section name (e.g., a short key vs. the full name), past corrections for that section will not be retrieved, defeating the purpose of the learning system.

- **File:** `app/api/generate/route.ts`
- **Line:** 100
- **Category:** logic-error
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Potential mismatch between frontend section identifier and template name, but typically consistent; low risk.
- **Suggestion:** Normalize the `sectionId` to the canonical template section name before querying, or maintain a mapping between request keys and template names.
- **ID:** `493e7c9a699db2b3`

### 9. [NEW] [MEDIUM] Uses `dangerouslySetInnerHTML` to render syntax-highlighted code fetched from LLM output. If the code string contains malicious markup, it will be executed in the user's browser.

- **File:** `components/ui/code-block.tsx`
- **Line:** 60
- **Category:** xss
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Shiki output is safe, so XSS risk is low; using dangerouslySetInnerHTML is suboptimal but not high severity.
- **Suggestion:** Use a safe client-side syntax highlighter (e.g., `react-syntax-highlighter` with HTML escaping) instead of injecting raw HTML.
- **ID:** `643597772bb9c54a`

### 10. [NEW] [MEDIUM] `row.id as string` is an unsafe type assertion that masks potential null values from the database. If the database returns null for `id`, the cast will result in `null` being treated as a string, leading to runtime errors when accessing string methods.

- **File:** `lib/ai/rag.ts`
- **Line:** 56
- **Category:** type-safety
- **Pass:** types
- **Score:** 5/10
- **Rationale:** Unsafe type assertion on row.id could mask null values, leading to runtime errors in rare cases.
- **Suggestion:** Use a runtime check: `const id = row.id as string;` or better, rely on type inference from `match_exemplar_chunks` RPC type definitions.
- **ID:** `60690facc0e24993`

### 11. [NEW] [MEDIUM] `response.data[0]` assumes at least one embedding exists. If the OpenAI API returns an empty array (e.g., due to an empty input), accessing `embedding` on undefined will throw.

- **File:** `lib/ingest/embedder.ts`
- **Line:** 16
- **Category:** type-safety
- **Pass:** types
- **Score:** 7/10
- **Rationale:** Missing check for empty embeddings array; will throw on empty input, but requires specific trigger.
- **Suggestion:** Add a runtime check: `if (!response.data.length) throw new Error('No embeddings returned');`.
- **ID:** `580da5de146550be`
