# Deep Review Report

**Generated:** 2026-05-02 16:41
**Model:** deepseek-chat
**Passes:** security, bugs, architecture, types
**Files scanned:** 108
**Duration:** 270.1s
**Findings:** 87

---

## Summary

| # | Severity | Category | File | Line | Finding | Score |
|---|---|---|---|---|---|---|
| 1 | high | duplication | `agents/assessment_companion/agent.py` | 1 | The `_parse_json_output` function in `agents/assessment_companion/agent.py` (lines 130-148) is duplicated verbatim in `agents/ndis_planner_simulator/agent.py` (lines 130-148) and `agents/revision_agent/agent.py` (lines 175-193). All three agents parse LLM JSON output identically. | 5/10 |
| 2 | high | duplication | `agents/assessment_companion/agent.py` | 1 | The `create_companion_agent` / `run_companion_check` pattern in `agents/assessment_companion/agent.py` is structurally identical to `create_ndis_planner_agent` / `run_planner_review` in `agents/ndis_planner_simulator/agent.py` and `create_revision_agent` / `run_revision` in `agents/revision_agent/agent.py`. Each creates an Agent, runs it with Runner.run, and parses the output. | 5/10 |
| 3 | high | access-control | `agents/assessment_companion/tools.py` | 18 | The `get_assessment_data` tool fetches assessment data by ID without verifying that the requesting user owns or has permission to access that assessment. An attacker could enumerate assessment IDs to retrieve data belonging to other users. | 5/10 |
| 4 | high | access-control | `agents/assessment_companion/tools.py` | 36 | The `get_clinician_profile` tool fetches a clinician profile by user_id without verifying that the requesting user is authorized to view that profile. An attacker could enumerate user IDs to retrieve profiles of other clinicians. | 5/10 |
| 5 | high | duplication | `agents/assessment_companion/tools.py` | 1 | The `get_assessment_data` tool in `agents/assessment_companion/tools.py` (lines 14-28) and `agents/ndis_planner_simulator/tools.py` (lines 14-28) are nearly identical — both query the `assessments` table by ID and return JSON. The only difference is the table name in the second tool. | 5/10 |
| 6 | high | access-control | `agents/ndis_planner_simulator/tools.py` | 18 | The `get_report_sections` tool fetches report data by report_id without verifying that the requesting user owns or has permission to access that report. An attacker could enumerate report IDs to retrieve other users' reports. | 5/10 |
| 7 | high | access-control | `agents/ndis_planner_simulator/tools.py` | 37 | The `get_assessment_data` tool fetches assessment data by report_id without verifying that the requesting user owns or has permission to access that assessment. An attacker could enumerate report IDs to retrieve other users' assessment data. | 5/10 |
| 8 | high | access-control | `agents/ndis_planner_simulator/tools.py` | 97 | The `get_past_corrections` tool fetches correction history by user_id without verifying that the requesting user is authorized to view that user's corrections. An attacker could enumerate user IDs to view other clinicians' correction history. | 5/10 |
| 9 | high | duplication | `agents/ndis_planner_simulator/tools.py` | 1 | The `get_report_sections` tool in `agents/ndis_planner_simulator/tools.py` (lines 14-28) and `agents/revision_agent/agent.py` (lines 24-38) are nearly identical — both query the `reports` table by ID and return JSON. The revision agent's version is defined inline in agent.py instead of a separate tools file. | 5/10 |
| 10 | high | duplication | `agents/ndis_planner_simulator/tools.py` | 1 | The `get_past_corrections` tool in `agents/ndis_planner_simulator/tools.py` (lines 70-84) and `agents/revision_agent/agent.py` (lines 40-54) are nearly identical — both query the `corrections` table by user_id and optional section filter. The revision agent's version is defined inline. | 5/10 |
| 11 | high | access-control | `agents/revision_agent/agent.py` | 30 | The `get_report_sections` tool fetches report data by report_id without verifying that the requesting user owns or has permission to access that report. An attacker could enumerate report IDs to retrieve other users' reports. | 5/10 |
| 12 | high | access-control | `agents/revision_agent/agent.py` | 47 | The `get_past_corrections` tool fetches correction history by user_id without verifying that the requesting user is authorized to view that user's corrections. An attacker could enumerate user IDs to view other clinicians' correction history. | 5/10 |
| 13 | high | access-control | `agents/revision_agent/agent.py` | 63 | The `record_correction` tool inserts a correction record with a user_id that is provided as a parameter, without verifying that the requesting user matches that user_id. An attacker could record corrections on behalf of other users. | 5/10 |
| 14 | high | access-control | `agents/revision_agent/agent.py` | 93 | The `check_cross_section_impact` tool fetches report sections by report_id without verifying that the requesting user owns or has permission to access that report. An attacker could enumerate report IDs to retrieve other users' report sections. | 5/10 |
| 15 | high | separation-of-concerns | `agents/server.py` | 1 | The `agents/server.py` file directly imports and calls `run_planner_review`, `run_companion_check`, and `run_revision` from the agent modules, but the web routes in `app/api/review/route.ts`, `app/api/companion/route.ts`, and `app/api/revise/route.ts` also call the agent service via HTTP. This creates two parallel invocation paths (direct Python call vs. HTTP proxy) for the same agents, leading to potential inconsistency and confusion about which path is authoritative. | 5/10 |
| 16 | high | data-exposure | `agents/shared/db.py` | 5 | The Supabase service role key is loaded from environment variables and used to create a client. If this key is exposed (e.g., in logs, error messages, or client-side code), it grants full admin access to the database, bypassing Row-Level Security. | 5/10 |
| 17 | high | access-control | `app/api/chat/route.ts` | 18 | The chat endpoint fetches a report by `reportId` or `sessionId` from the request body, but only filters by `user_id` when querying the reports table. If `sessionId` is provided without a `reportId`, the query filters by `session_id` and `user_id`, which is correct. However, if `reportId` is provided, the query filters by `id` and `user_id`, which is also correct. No issue here upon re-review. | 5/10 |
| 18 | high | duplication | `app/api/chat/route.ts` | 1 | The `record_correction` tool in `app/api/chat/route.ts` (lines 72-82) and the `record_correction` tool in `agents/revision_agent/agent.py` (lines 56-72) perform the same operation — inserting a correction into the `corrections` table. The chat route defines it inline as an AI SDK tool, while the revision agent defines it as a function_tool. | 5/10 |
| 19 | high | duplication | `app/api/chat/route.ts` | 1 | The `get_past_corrections` tool in `app/api/chat/route.ts` (lines 84-96) and the `get_past_corrections` tool in `agents/revision_agent/agent.py` (lines 40-54) perform the same query against the `corrections` table. Both are defined independently with the same logic. | 5/10 |
| 20 | high | access-control | `app/api/companion/route.ts` | 30 | The companion endpoint verifies that the assessment belongs to the user by checking `user_id` in the database query. However, the subsequent fetch to the agent service includes the `user_id` in the request body, but the agent service does not verify that the user owns the assessment. An attacker could modify the `user_id` in the request to the agent service to access other users' data. | 5/10 |
| 21 | high | access-control | `app/api/generate/route.ts` | 30 | The generate endpoint verifies that the report belongs to the user when fetching the report for coherence check. However, when creating a new report (lines 80-100), the `sessionId` is taken from the request body and used to create a report without verifying that the session belongs to the user. An attacker could provide a `sessionId` belonging to another user and create a report linked to that session. | 5/10 |
| 22 | high | access-control | `app/api/generate/route.ts` | 80 | When creating a new report, the code uses `sessionId` from the request body without verifying that the session belongs to the authenticated user. An attacker could provide a `sessionId` belonging to another user, and the new report would be linked to that session, potentially allowing the attacker to access the report through the session. | 5/10 |
| 23 | high | access-control | `app/api/review/route.ts` | 30 | The review endpoint verifies that the report belongs to the user by checking `user_id` in the database query. However, the subsequent fetch to the agent service includes the `user_id` in the request body, but the agent service does not verify that the user owns the report. An attacker could modify the `user_id` in the request to the agent service to access other users' data. | 5/10 |
| 24 | high | access-control | `app/api/revise/route.ts` | 18 | The revise endpoint verifies that the report belongs to the user by checking `user_id` in the database query. However, the subsequent `reviseSection` call passes `userId` and `reportId` to the revision agent, which does not verify ownership. An attacker could potentially trigger a revision on another user's report if they can guess the report ID. | 5/10 |
| 25 | high | inconsistency | `app/api/revise/route.ts` | 1 | The `app/api/revise/route.ts` calls `reviseSection` from `@/lib/ai/revise` directly (a local LLM call), while `app/api/review/route.ts` and `app/api/companion/route.ts` proxy to the external agent service. The revision path bypasses the agent service entirely, creating an inconsistent architecture where some AI operations go through the agent service and others do not. | 5/10 |
| 26 | high | xss | `components/report/formatted-report.tsx` | 62 | User-controlled report content is rendered via `dangerouslySetInnerHTML` in `ReportContent` after only basic HTML entity escaping. An attacker who can influence the report content (e.g., via the generation pipeline or stored data) can inject arbitrary HTML/JavaScript. | 5/10 |
| 27 | high | xss | `components/report/formatted-report.tsx` | 218 | Table header cells are rendered via `dangerouslySetInnerHTML` with `renderInlineMarkdown` output. If the markdown content contains malicious HTML, it will be executed. | 5/10 |
| 28 | high | xss | `components/report/formatted-report.tsx` | 224 | Table body cells are rendered via `dangerouslySetInnerHTML` with `renderInlineMarkdown` output. Same XSS risk as header cells. | 5/10 |
| 29 | high | bug | `components/reports/report-list.tsx` | 33 | The Supabase query selects `assessments(participant_name)` which returns an array of objects, but the code handles both array and single object. The actual response shape depends on the relationship cardinality. If it's a many-to-one relationship, Supabase returns a single object, not an array. The fallback logic may mask incorrect data access. | 5/10 |
| 30 | high | xss | `components/ui/code-block.tsx` | 62 | Syntax-highlighted code HTML from Shiki is rendered via `dangerouslySetInnerHTML`. While Shiki output is generally safe, if the `code` prop contains user-controlled content that bypasses Shiki's escaping, XSS is possible. | 5/10 |
| 31 | high | injection | `components/workspace/editor-toolbar.tsx` | 97 | The `refinedResult` from the AI refinement API is inserted directly into the editor via `editor.insertText(refinedResult)`. If the API response contains malicious content (e.g., from a compromised or prompt-injected model), it could be inserted into the document without sanitization. | 5/10 |
| 32 | high | bug | `components/workspace/editor-toolbar.tsx` | 107 | The `acceptRefinement` callback calls `editor.insertText(refinedResult)` which inserts the refined text at the current cursor position, but the original selected text is not removed. This results in the refined text being appended to the original text instead of replacing it. | 5/10 |
| 33 | high | bug | `components/workspace/workspace-layout.tsx` | 107 | The `saveToSupabase` callback is memoized with `[report, sectionKeys, supabase]`, but `report` is the full report object. If `report` changes reference (e.g., after a state update), the callback reference changes, which may cause unnecessary re-renders or re-subscriptions in `useAutoSave`. More critically, `saveToSupabase` reads `editorRef.current?.editor` at call time, but the editor might not be ready yet when auto-save triggers. | 5/10 |
| 34 | high | bug | `lib/editor/plate-to-sections.ts` | 30 | The `flushSection` function uses `editor.api.markdown.serialize({ value: currentNodes })`. If `editor.api.markdown` is undefined (e.g., if the MarkdownPlugin is not properly configured), this will throw an error. Additionally, the `editor` parameter is typed as `any`, so there is no type safety. | 5/10 |
| 35 | high | bug | `lib/ingest/parser.ts` | 12 | The `PDFParse` class is imported dynamically from 'pdf-parse', but the import syntax is incorrect. `import('pdf-parse')` returns a module, not a class constructor. The code attempts to use `new PDFParse(...)` which will fail because `PDFParse` is not a constructor. | 5/10 |
| 36 | medium | inconsistency | `agents/assessment_companion/agent.py` | 1 | The `run_companion_check` function in `agents/assessment_companion/agent.py` accepts a `lightweight` parameter and passes it to `create_companion_agent`, but `run_planner_review` in `agents/ndis_planner_simulator/agent.py` and `run_revision` in `agents/revision_agent/agent.py` do not support a lightweight mode. This inconsistency means the companion agent has a different execution path that is not mirrored elsewhere. | 5/10 |
| 37 | medium | inconsistency | `agents/assessment_companion/agent.py` | 1 | The `run_companion_check` function in `agents/assessment_companion/agent.py` returns `list[dict]`, `run_planner_review` in `agents/ndis_planner_simulator/agent.py` returns `list[dict]`, but `run_revision` in `agents/revision_agent/agent.py` returns `dict`. The return types are inconsistent across agents, making it harder to build a generic dispatcher. | 5/10 |
| 38 | medium | missing-abstraction | `agents/assessment_companion/agent.py` | 1 | The `__main__` block in `agents/assessment_companion/agent.py` (lines 152-161) is duplicated in `agents/ndis_planner_simulator/agent.py` (lines 152-161) and `agents/revision_agent/agent.py` (lines 197-207). Each parses CLI args, runs the agent, and prints JSON output. | 5/10 |
| 39 | medium | data-exposure | `agents/server.py` | 27 | The `AGENT_API_KEY` is read from environment and compared against the `Authorization` header. If the environment variable is empty or unset, the server returns a 503 error, but if it is accidentally set to a weak or default value, the API is trivially bypassed. | 5/10 |
| 40 | medium | dead-code | `agents/shared/types.py` | 1 | The `PlannerFlag` dataclass in `agents/shared/types.py` is defined but never imported or used by any other file in the provided codebase. The planner agent returns raw dicts instead. | 5/10 |
| 41 | medium | access-control | `app/api/chat/route.ts` | 82 | The `record_correction` tool uses `userId` from the authenticated user, which is correct. However, the `get_past_corrections` tool also uses `userId` from the authenticated user, which is correct. No issue here upon re-review. | 5/10 |
| 42 | medium | injection | `app/api/ingest/route.ts` | 27 | The file name from the user-uploaded file is used directly in the storage path (`${user.id}/${file.name}`). A malicious file name containing path traversal characters (e.g., `../../etc/passwd`) could overwrite files outside the intended directory. | 5/10 |
| 43 | medium | injection | `app/api/refine/route.ts` | 30 | The `selectedText` and `instruction` from the request body are directly interpolated into the user prompt for the AI model without sanitization. While this is a prompt injection vector rather than a traditional injection, a malicious user could craft input that manipulates the AI's behavior, potentially causing it to ignore instructions or output sensitive information. | 5/10 |
| 44 | medium | access-control | `app/generate/page.tsx` | 130 | The `runGeneration` function creates an assessment with `user.id` from the authenticated user, which is correct. However, the subsequent fetch to `/api/generate` includes `assessmentId` and `reportId` in the request body. The server-side endpoint verifies ownership of the assessment and report, so this is not a direct vulnerability. However, if the server-side check is bypassed or missing in the future, this could be exploited. | 5/10 |
| 45 | medium | bug | `components/layout/user-menu.tsx` | 33 | The `DropdownMenuTrigger` component from `@base-ui/react/menu` does not accept a `render` prop. The `render` prop is passed to the underlying `Button` component, but the `DropdownMenuTrigger` expects a child function or element. This will cause a runtime error or unexpected behavior. | 5/10 |
| 46 | medium | access-control | `components/reports/report-list.tsx` | 62 | The `handleDelete` function calls `/api/reports/${id}` with a DELETE method but does not verify that the authenticated user owns the report. An attacker who knows another user's report ID can delete it. | 5/10 |
| 47 | medium | access-control | `components/reports/report-list.tsx` | 73 | The `handleClearFailed` function deletes multiple reports by ID without ownership verification. An attacker could delete other users' failed reports if they can enumerate IDs. | 5/10 |
| 48 | medium | access-control | `components/reports/report-list.tsx` | 33 | The report list query fetches all reports without filtering by the current user. This exposes all users' report metadata (status, section count, participant name, timestamps) to any authenticated user. | 5/10 |
| 49 | medium | async-issue | `components/reports/report-list.tsx` | 68 | The `supabase.from('reports').update(...)` call inside the `useEffect` is not awaited and runs after the component may have unmounted (due to the `isActive` check). However, the `await` is missing, so the update is fire-and-forget. If the component unmounts before the update completes, the `isActive` check on line 72 will prevent the state update, but the database update still happens, which is likely intentional. The real issue is that the `await` is missing, making the code harder to reason about. | 5/10 |
| 50 | medium | error-handling | `components/reports/report-list.tsx` | 78 | The error callback in the `.then()` chain only sets loading to false but does not handle the error. If the Supabase query fails, the error is silently ignored and `reports` remains an empty array, which may mislead the user into thinking there are no reports. | 5/10 |
| 51 | medium | access-control | `components/settings/exemplar-list.tsx` | 68 | The `handleDelete` function deletes exemplar chunks from the database and storage without verifying that the current user owns the exemplar. An attacker who knows another user's source file name can delete their exemplars. | 5/10 |
| 52 | medium | access-control | `components/settings/exemplar-list.tsx` | 30 | The `fetchExemplars` function queries all rows from `exemplar_chunks` without filtering by the current user. This exposes all users' exemplar metadata (source file names and chunk counts) to any authenticated user. | 5/10 |
| 53 | medium | async-issue | `components/settings/exemplar-list.tsx` | 56 | The `reloadExemplars` function is called after a deletion but does not check if the component is still mounted. If the component unmounts before the fetch completes, it will call `setExemplars` and `setIsLoading` on an unmounted component, causing a React warning. | 5/10 |
| 54 | medium | error-handling | `components/settings/exemplar-list.tsx` | 64 | The `handleDelete` function silently ignores errors from both the database deletion and the storage removal. If the deletion fails, the exemplar remains in the list but the user gets no feedback. | 5/10 |
| 55 | medium | input-validation | `components/settings/exemplar-upload.tsx` | 30 | The uploaded file is sent to `/api/ingest` without client-side validation of file type beyond the accept attribute. A user could bypass the accept restriction and upload arbitrary file types. | 5/10 |
| 56 | medium | injection | `components/workspace/editor-toolbar.tsx` | 72 | The refine API endpoint is called with user-controlled `selectedText` and `instruction` in the request body. If the endpoint does not validate or sanitize these inputs, it could be exploited for prompt injection or server-side request forgery. | 5/10 |
| 57 | medium | error-handling | `components/workspace/editor-toolbar.tsx` | 83 | In the `handleRefine` function, if the fetch fails or the response body is null, the error is caught and `setRefinedResult(null)` is called, but the user sees no error feedback. The refine input remains open with no indication of failure. | 5/10 |
| 58 | medium | bug | `components/workspace/flag-popover.tsx` | 30 | The `handleClickOutside` callback checks if the click target is inside certain elements to prevent closing, but it does not check if the click is on the popover itself. This means clicking inside the popover will close it because the popover has the class `tn-popover` which is explicitly excluded. | 5/10 |
| 59 | medium | bug | `components/workspace/margin-dots.tsx` | 37 | The `reposition` function is called immediately and then again after a 200ms timeout, but the timeout is not cleared if the component unmounts before the timeout fires. If the component unmounts before 200ms, the timeout will still fire and call `setDots` on an unmounted component. | 5/10 |
| 60 | medium | bug | `components/workspace/plate-editor.tsx` | 30 | The `editor` instance is created inside the component body using `usePlateEditor` with `value: initialValue`. If `initialValue` changes after the first render, the editor will not update because `usePlateEditor` likely only uses the initial value. This means the editor will always show the initial value and ignore subsequent changes to `initialValue`. | 5/10 |
| 61 | medium | bug | `components/workspace/workspace-layout.tsx` | 131 | The `jumpTo` function uses `h.textContent?.includes(id)` to find the heading. If `id` is a section key like 'part_a', it might match multiple headings that contain 'part_a' as a substring (e.g., 'Part A: About The Participant' and 'Part A: Something Else'). This can cause scrolling to the wrong section. | 5/10 |
| 62 | medium | bug | `components/workspace/workspace-layout.tsx` | 155 | In `handleRunReview`, the `setReport` updater function spreads `prev` but does not include `planner_review` in the spread. The new `planner_review` object is added, but if `prev` had other top-level keys (like `sections`, `status`, etc.), they are preserved. However, the `planner_review` field is overwritten, which is correct. The issue is that the `flags` from the API response are mapped to `nextFlags`, but the `setReport` update uses `data.flags` directly (the raw API response), not `nextFlags`. This is inconsistent but not a bug per se. The real bug is that `data.flags` might not exist or might be in a different format than expected. | 5/10 |
| 63 | medium | bug | `components/workspace/workspace-layout.tsx` | 176 | The `handleExportDocx` function calls `plateToSections` to get the current sections, but then iterates over `Object.entries(sections)` which may not preserve the order of sections as defined in the template. The DOCX output order depends on the order of keys in the `sections` object, which is not guaranteed. | 5/10 |
| 64 | medium | bug | `hooks/use-auto-save.ts` | 28 | The `flush` function is called inside `markDirty` after a debounce delay. If `flush` is called multiple times (e.g., due to rapid changes), the `dirtyRef.current` check at the start of `flush` will prevent multiple saves. However, if `flush` is called from the visibility change handler while a debounced `flush` is already pending, the pending timeout is not cleared, leading to a double save attempt. | 5/10 |
| 65 | medium | bug | `hooks/use-auto-save.ts` | 35 | The `markDirty` callback is memoized with `[debounceMs, flush]`. If `flush` changes reference (which it does because it's not memoized with `useCallback`), `markDirty` will also change reference, potentially causing unnecessary re-renders in components that use it. | 5/10 |
| 66 | medium | dead-code | `lib/ai/chat-tools.ts` | 1 | The `chatTools` object in `lib/ai/chat-tools.ts` defines tools (`generate_report`, `revise_section`, `get_report_status`, `record_correction`, `get_past_corrections`) but is never imported or used by any other file in the provided codebase. The chat route in `app/api/chat/route.ts` defines its own tools inline. | 5/10 |
| 67 | medium | bug | `lib/ai/domain-mapper.ts` | 107 | The `mapPartC` function iterates over a hardcoded list of sub-domains (`['mobility', 'personal_care', 'domestic_adls', 'community_access', 'communication']`). If the assessment data contains additional functional domains not in this list, they will be included later in the loop. However, if a sub-domain is missing from the assessment data, it will be reported as `NO_DATA`, which is correct. The bug is that the function assumes all sub-domains are at the top level of `functional_domains`, but the actual structure might be nested differently. | 5/10 |
| 68 | medium | bug | `lib/ai/domain-mapper.ts` | 155 | The `canonicalKey` function converts the section ID to lowercase and replaces non-alphanumeric characters with underscores. This can cause collisions between different section names that normalize to the same key (e.g., 'Part A' and 'Part_A' both become 'part_a'). | 5/10 |
| 69 | medium | bug | `lib/ai/generate.ts` | 82 | The `correctionContext` is appended to `clinicalNotes` without any separator or formatting. If `correctionContext` is provided, it will be concatenated directly to the end of `clinicalNotes`, which may cause the LLM to misinterpret the context or produce malformed output. | 5/10 |
| 70 | medium | bug | `lib/ai/generate.ts` | 103 | The `buildSummaryGenerationPrompt` is called with `reportSoFar` which is built from `previousSections`. However, `previousSections` is a `Record<string, string>` where keys are section names and values are content. The iteration `Object.entries(previousSections)` does not guarantee order, so the `reportSoFar` may have sections in an arbitrary order, which could confuse the LLM. | 5/10 |
| 71 | medium | bug | `lib/ai/generate.ts` | 130 | The `stripDuplicateHeading` function removes the first line if it matches the section name. However, if the section name contains special characters (e.g., colons, slashes), the comparison might fail due to inconsistent normalization. For example, 'Part A: About The Participant' vs 'Part A: About The Participant' (with different spacing) would not match. | 5/10 |
| 72 | medium | bug | `lib/ai/rag.ts` | 33 | The `embeddingStr` is constructed by joining the embedding array with commas and wrapping in brackets. If the embedding array contains very large or small numbers, the string representation might be truncated or lose precision, leading to incorrect similarity calculations. | 5/10 |
| 73 | medium | bug | `lib/ai/revise.ts` | 30 | The `routeFeedbackToSections` function parses the LLM response as JSON. If the LLM returns malformed JSON (e.g., due to a syntax error), `JSON.parse` will throw an unhandled exception, crashing the request. | 5/10 |
| 74 | medium | bug | `lib/editor/report-to-plate.ts` | 18 | The `createDeserializer` function creates a new Plate editor instance every time it's called. This is inefficient and may cause memory leaks if called frequently. Additionally, the editor is created with plugins but never destroyed. | 5/10 |
| 75 | medium | bug | `lib/editor/report-to-plate.ts` | 100 | The `reportToPlate` function uses `tempEditor.api.markdown.deserialize` to convert markdown to Plate nodes. If the markdown content contains invalid syntax or unsupported elements, `deserialize` may return unexpected results or throw an error. | 5/10 |
| 76 | medium | dead-code | `lib/export/docx.ts` | 1 | The `generateDocx` function in `lib/export/docx.ts` is never imported or used by any other file in the provided codebase. The DOCX export is handled by `components/report/export-button.tsx` and `components/workspace/workspace-layout.tsx` which use `docx` directly. | 5/10 |
| 77 | medium | bug | `lib/supabase/server.ts` | 6 | The `createClient` function uses `await cookies()` which is a Next.js server-side function. If this function is called from a non-server context (e.g., a client component), it will throw an error. The function is exported and could be imported anywhere. | 5/10 |
| 78 | medium | bug | `lib/supabase/server.ts` | 22 | The `createServiceClient` function uses `createServerClient` with empty cookie handlers. This is correct for a service client, but the function name is misleading because it creates a server client, not a service client. The service role key is used, which is correct for admin operations. | 5/10 |
| 79 | medium | bug | `scripts/seed-foundational.ts` | 37 | The `embedding` field is stored as a string `[${embeddings.data[i].embedding.join(',')}]` instead of using the proper pgvector format. The Supabase client may not correctly parse this string into a vector type, causing insertion errors or incorrect query results. | 5/10 |
| 80 | medium | bug | `tests/e2e/peter-parker-e2e.mjs` | 83 | The `buildAuthCookies` function splits the session JSON into chunks of 3180 bytes. If the session JSON is exactly a multiple of 3180 bytes, the last chunk will be empty, resulting in a malformed cookie. | 5/10 |
| 81 | medium | bug | `tests/e2e/peter-parker-e2e.mjs` | 83 | The `buildAuthCookies` function uses `encodeURIComponent` to encode the session JSON. However, Supabase auth cookies are typically base64-encoded, not URI-encoded. Using `encodeURIComponent` may produce cookies that are not recognized by the server. | 5/10 |
| 82 | low | input-validation | `agents/server.py` | 30 | The `verify_key` function uses `removeprefix('Bearer ')` which is case-sensitive. A header with a lowercase 'bearer' prefix would not be stripped, causing the token comparison to fail even with a valid key. | 5/10 |
| 83 | low | input-validation | `app/api/ingest/route.ts` | 27 | The file name from the user-uploaded file is used directly in the storage path. While Supabase storage may handle path traversal, it is safer to sanitize the file name to prevent unexpected behavior. | 5/10 |
| 84 | low | edge-case | `components/reports/report-list.tsx` | 100 | The `handleClearFailed` function uses `Promise.all` to delete multiple reports concurrently. If one deletion fails, the others still proceed, but the local state update on line 107 filters out all failed reports regardless of which deletions succeeded. This could lead to a mismatch between the UI and the database. | 5/10 |
| 85 | low | input-validation | `components/ui/file-upload.tsx` | 82 | The file input's `accept` attribute is set but the `handleFiles` function does not validate file types on the client side. A user could drag and drop files of any type. | 5/10 |
| 86 | low | edge-case | `components/workspace/editor-toolbar.tsx` | 30 | The toolbar position calculation uses `window.scrollY` which does not account for the toolbar's own height. If the selection is near the top of the viewport, the toolbar may appear above the visible area. | 5/10 |
| 87 | low | edge-case | `components/workspace/flag-popover.tsx` | 30 | The `handleClickOutside` callback is recreated on every render due to the `useCallback` dependency on `onClose`. If `onClose` is not memoized, this can cause unnecessary re-registrations of the event listener. | 5/10 |

## Details

### 1. [HIGH] The `_parse_json_output` function in `agents/assessment_companion/agent.py` (lines 130-148) is duplicated verbatim in `agents/ndis_planner_simulator/agent.py` (lines 130-148) and `agents/revision_agent/agent.py` (lines 175-193). All three agents parse LLM JSON output identically.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Extract `_parse_json_output` into a shared utility module, e.g., `agents/shared/llm_utils.py`, and import it in all three agent files.

### 2. [HIGH] The `create_companion_agent` / `run_companion_check` pattern in `agents/assessment_companion/agent.py` is structurally identical to `create_ndis_planner_agent` / `run_planner_review` in `agents/ndis_planner_simulator/agent.py` and `create_revision_agent` / `run_revision` in `agents/revision_agent/agent.py`. Each creates an Agent, runs it with Runner.run, and parses the output.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Create a shared base class or factory function (e.g., `create_agent(name, instructions, tools)`) and a generic `run_agent(agent, input)` wrapper to eliminate the boilerplate.

### 3. [HIGH] The `get_assessment_data` tool fetches assessment data by ID without verifying that the requesting user owns or has permission to access that assessment. An attacker could enumerate assessment IDs to retrieve data belonging to other users.

- **File:** `agents/assessment_companion/tools.py`
- **Line:** 18
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a user_id parameter to the tool and filter the query with `.eq('user_id', user_id)` to enforce ownership.

### 4. [HIGH] The `get_clinician_profile` tool fetches a clinician profile by user_id without verifying that the requesting user is authorized to view that profile. An attacker could enumerate user IDs to retrieve profiles of other clinicians.

- **File:** `agents/assessment_companion/tools.py`
- **Line:** 36
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either restrict this tool to only return the profile of the authenticated user, or add authorization checks to ensure the requester has permission to view the target profile.

### 5. [HIGH] The `get_assessment_data` tool in `agents/assessment_companion/tools.py` (lines 14-28) and `agents/ndis_planner_simulator/tools.py` (lines 14-28) are nearly identical — both query the `assessments` table by ID and return JSON. The only difference is the table name in the second tool.

- **File:** `agents/assessment_companion/tools.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Consolidate into a single shared tool `get_assessment_data` in `agents/shared/tools.py` and import it where needed.

### 6. [HIGH] The `get_report_sections` tool fetches report data by report_id without verifying that the requesting user owns or has permission to access that report. An attacker could enumerate report IDs to retrieve other users' reports.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 18
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a user_id parameter to the tool and filter the query with `.eq('user_id', user_id)` to enforce ownership.

### 7. [HIGH] The `get_assessment_data` tool fetches assessment data by report_id without verifying that the requesting user owns or has permission to access that assessment. An attacker could enumerate report IDs to retrieve other users' assessment data.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 37
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a user_id parameter to the tool and filter the query with `.eq('user_id', user_id)` to enforce ownership.

### 8. [HIGH] The `get_past_corrections` tool fetches correction history by user_id without verifying that the requesting user is authorized to view that user's corrections. An attacker could enumerate user IDs to view other clinicians' correction history.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 97
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either restrict this tool to only return corrections for the authenticated user, or add authorization checks to ensure the requester has permission to view the target user's corrections.

### 9. [HIGH] The `get_report_sections` tool in `agents/ndis_planner_simulator/tools.py` (lines 14-28) and `agents/revision_agent/agent.py` (lines 24-38) are nearly identical — both query the `reports` table by ID and return JSON. The revision agent's version is defined inline in agent.py instead of a separate tools file.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Move `get_report_sections` to a shared tools module (e.g., `agents/shared/tools.py`) and import it in both agents.

### 10. [HIGH] The `get_past_corrections` tool in `agents/ndis_planner_simulator/tools.py` (lines 70-84) and `agents/revision_agent/agent.py` (lines 40-54) are nearly identical — both query the `corrections` table by user_id and optional section filter. The revision agent's version is defined inline.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Consolidate into a single shared tool `get_past_corrections` in `agents/shared/tools.py`.

### 11. [HIGH] The `get_report_sections` tool fetches report data by report_id without verifying that the requesting user owns or has permission to access that report. An attacker could enumerate report IDs to retrieve other users' reports.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 30
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a user_id parameter to the tool and filter the query with `.eq('user_id', user_id)` to enforce ownership.

### 12. [HIGH] The `get_past_corrections` tool fetches correction history by user_id without verifying that the requesting user is authorized to view that user's corrections. An attacker could enumerate user IDs to view other clinicians' correction history.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 47
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either restrict this tool to only return corrections for the authenticated user, or add authorization checks to ensure the requester has permission to view the target user's corrections.

### 13. [HIGH] The `record_correction` tool inserts a correction record with a user_id that is provided as a parameter, without verifying that the requesting user matches that user_id. An attacker could record corrections on behalf of other users.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 63
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Remove the user_id parameter and use the authenticated user's ID from the session/context instead, or add a server-side check that the provided user_id matches the authenticated user.

### 14. [HIGH] The `check_cross_section_impact` tool fetches report sections by report_id without verifying that the requesting user owns or has permission to access that report. An attacker could enumerate report IDs to retrieve other users' report sections.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 93
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a user_id parameter to the tool and filter the query with `.eq('user_id', user_id)` to enforce ownership.

### 15. [HIGH] The `agents/server.py` file directly imports and calls `run_planner_review`, `run_companion_check`, and `run_revision` from the agent modules, but the web routes in `app/api/review/route.ts`, `app/api/companion/route.ts`, and `app/api/revise/route.ts` also call the agent service via HTTP. This creates two parallel invocation paths (direct Python call vs. HTTP proxy) for the same agents, leading to potential inconsistency and confusion about which path is authoritative.

- **File:** `agents/server.py`
- **Line:** 1
- **Category:** separation-of-concerns
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Decide on a single invocation pattern: either always call agents via the FastAPI server (HTTP) or always call them directly from Next.js API routes. Remove the unused path.

### 16. [HIGH] The Supabase service role key is loaded from environment variables and used to create a client. If this key is exposed (e.g., in logs, error messages, or client-side code), it grants full admin access to the database, bypassing Row-Level Security.

- **File:** `agents/shared/db.py`
- **Line:** 5
- **Category:** data-exposure
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Ensure the service role key is never logged, never exposed to the client, and only used in secure server-side contexts. Consider using a dedicated, least-privilege service key if possible.

### 17. [HIGH] The chat endpoint fetches a report by `reportId` or `sessionId` from the request body, but only filters by `user_id` when querying the reports table. If `sessionId` is provided without a `reportId`, the query filters by `session_id` and `user_id`, which is correct. However, if `reportId` is provided, the query filters by `id` and `user_id`, which is also correct. No issue here upon re-review.

- **File:** `app/api/chat/route.ts`
- **Line:** 18
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored

### 18. [HIGH] The `record_correction` tool in `app/api/chat/route.ts` (lines 72-82) and the `record_correction` tool in `agents/revision_agent/agent.py` (lines 56-72) perform the same operation — inserting a correction into the `corrections` table. The chat route defines it inline as an AI SDK tool, while the revision agent defines it as a function_tool.

- **File:** `app/api/chat/route.ts`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Consolidate into a single shared implementation, either in the agent service or as a shared library function.

### 19. [HIGH] The `get_past_corrections` tool in `app/api/chat/route.ts` (lines 84-96) and the `get_past_corrections` tool in `agents/revision_agent/agent.py` (lines 40-54) perform the same query against the `corrections` table. Both are defined independently with the same logic.

- **File:** `app/api/chat/route.ts`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Consolidate into a single shared implementation, either in the agent service or as a shared library function.

### 20. [HIGH] The companion endpoint verifies that the assessment belongs to the user by checking `user_id` in the database query. However, the subsequent fetch to the agent service includes the `user_id` in the request body, but the agent service does not verify that the user owns the assessment. An attacker could modify the `user_id` in the request to the agent service to access other users' data.

- **File:** `app/api/companion/route.ts`
- **Line:** 30
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Ensure the agent service validates that the requesting user owns the assessment, or pass the authenticated user's ID from the server-side session rather than from the client request.

### 21. [HIGH] The generate endpoint verifies that the report belongs to the user when fetching the report for coherence check. However, when creating a new report (lines 80-100), the `sessionId` is taken from the request body and used to create a report without verifying that the session belongs to the user. An attacker could provide a `sessionId` belonging to another user and create a report linked to that session.

- **File:** `app/api/generate/route.ts`
- **Line:** 30
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Before using the `sessionId` from the request, verify that the session belongs to the authenticated user by querying the sessions table with `.eq('id', sessionId).eq('user_id', user.id)`.

### 22. [HIGH] When creating a new report, the code uses `sessionId` from the request body without verifying that the session belongs to the authenticated user. An attacker could provide a `sessionId` belonging to another user, and the new report would be linked to that session, potentially allowing the attacker to access the report through the session.

- **File:** `app/api/generate/route.ts`
- **Line:** 80
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a check to verify that the session belongs to the authenticated user before creating the report: `const { data: session } = await supabase.from('sessions').select('id').eq('id', sessionId).eq('user_id', user.id).single()`.

### 23. [HIGH] The review endpoint verifies that the report belongs to the user by checking `user_id` in the database query. However, the subsequent fetch to the agent service includes the `user_id` in the request body, but the agent service does not verify that the user owns the report. An attacker could modify the `user_id` in the request to the agent service to access other users' data.

- **File:** `app/api/review/route.ts`
- **Line:** 30
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Ensure the agent service validates that the requesting user owns the report, or pass the authenticated user's ID from the server-side session rather than from the client request.

### 24. [HIGH] The revise endpoint verifies that the report belongs to the user by checking `user_id` in the database query. However, the subsequent `reviseSection` call passes `userId` and `reportId` to the revision agent, which does not verify ownership. An attacker could potentially trigger a revision on another user's report if they can guess the report ID.

- **File:** `app/api/revise/route.ts`
- **Line:** 18
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Ensure the revision agent validates that the requesting user owns the report before performing the revision.

### 25. [HIGH] The `app/api/revise/route.ts` calls `reviseSection` from `@/lib/ai/revise` directly (a local LLM call), while `app/api/review/route.ts` and `app/api/companion/route.ts` proxy to the external agent service. The revision path bypasses the agent service entirely, creating an inconsistent architecture where some AI operations go through the agent service and others do not.

- **File:** `app/api/revise/route.ts`
- **Line:** 1
- **Category:** inconsistency
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either route all AI operations through the agent service for consistency, or document why revision is handled differently.

### 26. [HIGH] User-controlled report content is rendered via `dangerouslySetInnerHTML` in `ReportContent` after only basic HTML entity escaping. An attacker who can influence the report content (e.g., via the generation pipeline or stored data) can inject arbitrary HTML/JavaScript.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 62
- **Category:** xss
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Avoid `dangerouslySetInnerHTML`. Use a safe HTML sanitization library (e.g., DOMPurify) on the content before setting innerHTML, or render the content using React components that escape by default.

### 27. [HIGH] Table header cells are rendered via `dangerouslySetInnerHTML` with `renderInlineMarkdown` output. If the markdown content contains malicious HTML, it will be executed.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 218
- **Category:** xss
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Sanitize the output of `renderInlineMarkdown` with DOMPurify before passing to `dangerouslySetInnerHTML`, or avoid `dangerouslySetInnerHTML` entirely.

### 28. [HIGH] Table body cells are rendered via `dangerouslySetInnerHTML` with `renderInlineMarkdown` output. Same XSS risk as header cells.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 224
- **Category:** xss
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Sanitize the output of `renderInlineMarkdown` with DOMPurify before passing to `dangerouslySetInnerHTML`, or avoid `dangerouslySetInnerHTML` entirely.

### 29. [HIGH] The Supabase query selects `assessments(participant_name)` which returns an array of objects, but the code handles both array and single object. The actual response shape depends on the relationship cardinality. If it's a many-to-one relationship, Supabase returns a single object, not an array. The fallback logic may mask incorrect data access.

- **File:** `components/reports/report-list.tsx`
- **Line:** 33
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Check the actual relationship cardinality in the database schema and adjust the type and access pattern accordingly. If it's a foreign key to a single assessment, remove the array handling.

### 30. [HIGH] Syntax-highlighted code HTML from Shiki is rendered via `dangerouslySetInnerHTML`. While Shiki output is generally safe, if the `code` prop contains user-controlled content that bypasses Shiki's escaping, XSS is possible.

- **File:** `components/ui/code-block.tsx`
- **Line:** 62
- **Category:** xss
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Sanitize the highlighted HTML with DOMPurify before setting innerHTML, or ensure the `code` prop is always escaped before highlighting.

### 31. [HIGH] The `refinedResult` from the AI refinement API is inserted directly into the editor via `editor.insertText(refinedResult)`. If the API response contains malicious content (e.g., from a compromised or prompt-injected model), it could be inserted into the document without sanitization.

- **File:** `components/workspace/editor-toolbar.tsx`
- **Line:** 97
- **Category:** injection
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Sanitize the refined text before insertion, or treat the AI output as untrusted and apply content security policies.

### 32. [HIGH] The `acceptRefinement` callback calls `editor.insertText(refinedResult)` which inserts the refined text at the current cursor position, but the original selected text is not removed. This results in the refined text being appended to the original text instead of replacing it.

- **File:** `components/workspace/editor-toolbar.tsx`
- **Line:** 107
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Before inserting the refined text, delete the original selected text using the editor's API (e.g., `editor.deleteFragment()` or `editor.insertFragment` with a delete operation).

### 33. [HIGH] The `saveToSupabase` callback is memoized with `[report, sectionKeys, supabase]`, but `report` is the full report object. If `report` changes reference (e.g., after a state update), the callback reference changes, which may cause unnecessary re-renders or re-subscriptions in `useAutoSave`. More critically, `saveToSupabase` reads `editorRef.current?.editor` at call time, but the editor might not be ready yet when auto-save triggers.

- **File:** `components/workspace/workspace-layout.tsx`
- **Line:** 107
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use a ref for `report` and `sectionKeys` to avoid dependency changes, or ensure the editor is available before calling save.

### 34. [HIGH] The `flushSection` function uses `editor.api.markdown.serialize({ value: currentNodes })`. If `editor.api.markdown` is undefined (e.g., if the MarkdownPlugin is not properly configured), this will throw an error. Additionally, the `editor` parameter is typed as `any`, so there is no type safety.

- **File:** `lib/editor/plate-to-sections.ts`
- **Line:** 30
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a null check for `editor.api.markdown` before calling `serialize`, and consider using a more specific type for the editor parameter.

### 35. [HIGH] The `PDFParse` class is imported dynamically from 'pdf-parse', but the import syntax is incorrect. `import('pdf-parse')` returns a module, not a class constructor. The code attempts to use `new PDFParse(...)` which will fail because `PDFParse` is not a constructor.

- **File:** `lib/ingest/parser.ts`
- **Line:** 12
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Check the actual API of the 'pdf-parse' library and use the correct import and instantiation pattern (e.g., `import pdfParse from 'pdf-parse'` and then `const data = await pdfParse(buffer)`).

### 36. [MEDIUM] The `run_companion_check` function in `agents/assessment_companion/agent.py` accepts a `lightweight` parameter and passes it to `create_companion_agent`, but `run_planner_review` in `agents/ndis_planner_simulator/agent.py` and `run_revision` in `agents/revision_agent/agent.py` do not support a lightweight mode. This inconsistency means the companion agent has a different execution path that is not mirrored elsewhere.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** inconsistency
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either add a `lightweight` parameter to all agent runners for consistency, or document that only the companion agent supports it.

### 37. [MEDIUM] The `run_companion_check` function in `agents/assessment_companion/agent.py` returns `list[dict]`, `run_planner_review` in `agents/ndis_planner_simulator/agent.py` returns `list[dict]`, but `run_revision` in `agents/revision_agent/agent.py` returns `dict`. The return types are inconsistent across agents, making it harder to build a generic dispatcher.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** inconsistency
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Standardize return types across all agent runners, e.g., always return a dict with a `results` key containing the list.

### 38. [MEDIUM] The `__main__` block in `agents/assessment_companion/agent.py` (lines 152-161) is duplicated in `agents/ndis_planner_simulator/agent.py` (lines 152-161) and `agents/revision_agent/agent.py` (lines 197-207). Each parses CLI args, runs the agent, and prints JSON output.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** missing-abstraction
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Extract a shared CLI runner function (e.g., `run_agent_cli(agent_runner, args)`) into a utility module.

### 39. [MEDIUM] The `AGENT_API_KEY` is read from environment and compared against the `Authorization` header. If the environment variable is empty or unset, the server returns a 503 error, but if it is accidentally set to a weak or default value, the API is trivially bypassed.

- **File:** `agents/server.py`
- **Line:** 27
- **Category:** data-exposure
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Ensure `AGENT_API_KEY` is a strong, randomly generated secret and is always configured in production. Consider failing closed (401) instead of 503 when the key is missing.

### 40. [MEDIUM] The `PlannerFlag` dataclass in `agents/shared/types.py` is defined but never imported or used by any other file in the provided codebase. The planner agent returns raw dicts instead.

- **File:** `agents/shared/types.py`
- **Line:** 1
- **Category:** dead-code
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either remove the unused dataclass or refactor the planner agent to use it for type safety.

### 41. [MEDIUM] The `record_correction` tool uses `userId` from the authenticated user, which is correct. However, the `get_past_corrections` tool also uses `userId` from the authenticated user, which is correct. No issue here upon re-review.

- **File:** `app/api/chat/route.ts`
- **Line:** 82
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored

### 42. [MEDIUM] The file name from the user-uploaded file is used directly in the storage path (`${user.id}/${file.name}`). A malicious file name containing path traversal characters (e.g., `../../etc/passwd`) could overwrite files outside the intended directory.

- **File:** `app/api/ingest/route.ts`
- **Line:** 27
- **Category:** injection
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Sanitize the file name by removing or encoding path traversal characters (e.g., using `path.basename()` or a library like `sanitize-filename`).

### 43. [MEDIUM] The `selectedText` and `instruction` from the request body are directly interpolated into the user prompt for the AI model without sanitization. While this is a prompt injection vector rather than a traditional injection, a malicious user could craft input that manipulates the AI's behavior, potentially causing it to ignore instructions or output sensitive information.

- **File:** `app/api/refine/route.ts`
- **Line:** 30
- **Category:** injection
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Consider adding input validation to limit the length and content of `selectedText` and `instruction`. Use a system prompt that clearly separates instructions from user input, and consider using a delimiter to mark the boundary.

### 44. [MEDIUM] The `runGeneration` function creates an assessment with `user.id` from the authenticated user, which is correct. However, the subsequent fetch to `/api/generate` includes `assessmentId` and `reportId` in the request body. The server-side endpoint verifies ownership of the assessment and report, so this is not a direct vulnerability. However, if the server-side check is bypassed or missing in the future, this could be exploited.

- **File:** `app/generate/page.tsx`
- **Line:** 130
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** No immediate action needed, but ensure all server-side endpoints that accept `assessmentId` or `reportId` from the client verify ownership against the authenticated user.

### 45. [MEDIUM] The `DropdownMenuTrigger` component from `@base-ui/react/menu` does not accept a `render` prop. The `render` prop is passed to the underlying `Button` component, but the `DropdownMenuTrigger` expects a child function or element. This will cause a runtime error or unexpected behavior.

- **File:** `components/layout/user-menu.tsx`
- **Line:** 33
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Replace the `render` prop with a child function: `<DropdownMenuTrigger>{...}</DropdownMenuTrigger>` or use the `asChild` pattern if supported.

### 46. [MEDIUM] The `handleDelete` function calls `/api/reports/${id}` with a DELETE method but does not verify that the authenticated user owns the report. An attacker who knows another user's report ID can delete it.

- **File:** `components/reports/report-list.tsx`
- **Line:** 62
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add server-side authorization to the DELETE endpoint to ensure the report belongs to the requesting user.

### 47. [MEDIUM] The `handleClearFailed` function deletes multiple reports by ID without ownership verification. An attacker could delete other users' failed reports if they can enumerate IDs.

- **File:** `components/reports/report-list.tsx`
- **Line:** 73
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add server-side authorization to the DELETE endpoint to ensure each report belongs to the requesting user.

### 48. [MEDIUM] The report list query fetches all reports without filtering by the current user. This exposes all users' report metadata (status, section count, participant name, timestamps) to any authenticated user.

- **File:** `components/reports/report-list.tsx`
- **Line:** 33
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a filter to the query, e.g., `.eq('user_id', userId)`, to restrict reports to the current user.

### 49. [MEDIUM] The `supabase.from('reports').update(...)` call inside the `useEffect` is not awaited and runs after the component may have unmounted (due to the `isActive` check). However, the `await` is missing, so the update is fire-and-forget. If the component unmounts before the update completes, the `isActive` check on line 72 will prevent the state update, but the database update still happens, which is likely intentional. The real issue is that the `await` is missing, making the code harder to reason about.

- **File:** `components/reports/report-list.tsx`
- **Line:** 68
- **Category:** async-issue
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add `await` before `supabase.from('reports').update(...)` to make the intent explicit and ensure proper error handling.

### 50. [MEDIUM] The error callback in the `.then()` chain only sets loading to false but does not handle the error. If the Supabase query fails, the error is silently ignored and `reports` remains an empty array, which may mislead the user into thinking there are no reports.

- **File:** `components/reports/report-list.tsx`
- **Line:** 78
- **Category:** error-handling
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add proper error handling, e.g., display an error message to the user or log the error for debugging.

### 51. [MEDIUM] The `handleDelete` function deletes exemplar chunks from the database and storage without verifying that the current user owns the exemplar. An attacker who knows another user's source file name can delete their exemplars.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 68
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a server-side check that the exemplar belongs to the authenticated user before deleting.

### 52. [MEDIUM] The `fetchExemplars` function queries all rows from `exemplar_chunks` without filtering by the current user. This exposes all users' exemplar metadata (source file names and chunk counts) to any authenticated user.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 30
- **Category:** access-control
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a filter to the query, e.g., `.eq('user_id', userId)`, to restrict exemplars to the current user.

### 53. [MEDIUM] The `reloadExemplars` function is called after a deletion but does not check if the component is still mounted. If the component unmounts before the fetch completes, it will call `setExemplars` and `setIsLoading` on an unmounted component, causing a React warning.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 56
- **Category:** async-issue
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use an `isActive` flag similar to the `useEffect` to prevent state updates after unmount.

### 54. [MEDIUM] The `handleDelete` function silently ignores errors from both the database deletion and the storage removal. If the deletion fails, the exemplar remains in the list but the user gets no feedback.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 64
- **Category:** error-handling
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add error handling to display a user-facing error message or log the error.

### 55. [MEDIUM] The uploaded file is sent to `/api/ingest` without client-side validation of file type beyond the accept attribute. A user could bypass the accept restriction and upload arbitrary file types.

- **File:** `components/settings/exemplar-upload.tsx`
- **Line:** 30
- **Category:** input-validation
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add server-side file type validation (MIME type and magic bytes) in the `/api/ingest` endpoint.

### 56. [MEDIUM] The refine API endpoint is called with user-controlled `selectedText` and `instruction` in the request body. If the endpoint does not validate or sanitize these inputs, it could be exploited for prompt injection or server-side request forgery.

- **File:** `components/workspace/editor-toolbar.tsx`
- **Line:** 72
- **Category:** injection
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Validate and sanitize inputs on the server side. Consider rate-limiting and input length restrictions.

### 57. [MEDIUM] In the `handleRefine` function, if the fetch fails or the response body is null, the error is caught and `setRefinedResult(null)` is called, but the user sees no error feedback. The refine input remains open with no indication of failure.

- **File:** `components/workspace/editor-toolbar.tsx`
- **Line:** 83
- **Category:** error-handling
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Set an error state and display an error message to the user, or re-enable the refine button with a retry option.

### 58. [MEDIUM] The `handleClickOutside` callback checks if the click target is inside certain elements to prevent closing, but it does not check if the click is on the popover itself. This means clicking inside the popover will close it because the popover has the class `tn-popover` which is explicitly excluded.

- **File:** `components/workspace/flag-popover.tsx`
- **Line:** 30
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Remove the `tn-popover` exclusion from the condition, or restructure the logic to only close when clicking outside the popover and its related elements.

### 59. [MEDIUM] The `reposition` function is called immediately and then again after a 200ms timeout, but the timeout is not cleared if the component unmounts before the timeout fires. If the component unmounts before 200ms, the timeout will still fire and call `setDots` on an unmounted component.

- **File:** `components/workspace/margin-dots.tsx`
- **Line:** 37
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Store the timeout ID in a ref and clear it in the cleanup function, or use a single `setTimeout` without the immediate call and rely on the resize/scroll listeners.

### 60. [MEDIUM] The `editor` instance is created inside the component body using `usePlateEditor` with `value: initialValue`. If `initialValue` changes after the first render, the editor will not update because `usePlateEditor` likely only uses the initial value. This means the editor will always show the initial value and ignore subsequent changes to `initialValue`.

- **File:** `components/workspace/plate-editor.tsx`
- **Line:** 30
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use a key prop on the parent `<Plate>` component that changes when `initialValue` changes, or use the editor's `reset` method if available.

### 61. [MEDIUM] The `jumpTo` function uses `h.textContent?.includes(id)` to find the heading. If `id` is a section key like 'part_a', it might match multiple headings that contain 'part_a' as a substring (e.g., 'Part A: About The Participant' and 'Part A: Something Else'). This can cause scrolling to the wrong section.

- **File:** `components/workspace/workspace-layout.tsx`
- **Line:** 131
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use a more precise matching strategy, such as comparing the heading's `data-section-id` attribute or using a strict equality check against the section title.

### 62. [MEDIUM] In `handleRunReview`, the `setReport` updater function spreads `prev` but does not include `planner_review` in the spread. The new `planner_review` object is added, but if `prev` had other top-level keys (like `sections`, `status`, etc.), they are preserved. However, the `planner_review` field is overwritten, which is correct. The issue is that the `flags` from the API response are mapped to `nextFlags`, but the `setReport` update uses `data.flags` directly (the raw API response), not `nextFlags`. This is inconsistent but not a bug per se. The real bug is that `data.flags` might not exist or might be in a different format than expected.

- **File:** `components/workspace/workspace-layout.tsx`
- **Line:** 155
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use `nextFlags` in the `setReport` update to ensure consistency, or validate the API response shape before using it.

### 63. [MEDIUM] The `handleExportDocx` function calls `plateToSections` to get the current sections, but then iterates over `Object.entries(sections)` which may not preserve the order of sections as defined in the template. The DOCX output order depends on the order of keys in the `sections` object, which is not guaranteed.

- **File:** `components/workspace/workspace-layout.tsx`
- **Line:** 176
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Iterate over `sectionKeys` (which is ordered) instead of `Object.entries(sections)` to ensure the DOCX output follows the template order.

### 64. [MEDIUM] The `flush` function is called inside `markDirty` after a debounce delay. If `flush` is called multiple times (e.g., due to rapid changes), the `dirtyRef.current` check at the start of `flush` will prevent multiple saves. However, if `flush` is called from the visibility change handler while a debounced `flush` is already pending, the pending timeout is not cleared, leading to a double save attempt.

- **File:** `hooks/use-auto-save.ts`
- **Line:** 28
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Clear the timeout at the beginning of `flush` to prevent duplicate saves.

### 65. [MEDIUM] The `markDirty` callback is memoized with `[debounceMs, flush]`. If `flush` changes reference (which it does because it's not memoized with `useCallback`), `markDirty` will also change reference, potentially causing unnecessary re-renders in components that use it.

- **File:** `hooks/use-auto-save.ts`
- **Line:** 35
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Memoize `flush` with `useCallback` and include `saveRef` as a dependency, or use a ref for `flush` to avoid dependency changes.

### 66. [MEDIUM] The `chatTools` object in `lib/ai/chat-tools.ts` defines tools (`generate_report`, `revise_section`, `get_report_status`, `record_correction`, `get_past_corrections`) but is never imported or used by any other file in the provided codebase. The chat route in `app/api/chat/route.ts` defines its own tools inline.

- **File:** `lib/ai/chat-tools.ts`
- **Line:** 1
- **Category:** dead-code
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either remove the unused module or refactor the chat route to import and use these shared tool definitions.

### 67. [MEDIUM] The `mapPartC` function iterates over a hardcoded list of sub-domains (`['mobility', 'personal_care', 'domestic_adls', 'community_access', 'communication']`). If the assessment data contains additional functional domains not in this list, they will be included later in the loop. However, if a sub-domain is missing from the assessment data, it will be reported as `NO_DATA`, which is correct. The bug is that the function assumes all sub-domains are at the top level of `functional_domains`, but the actual structure might be nested differently.

- **File:** `lib/ai/domain-mapper.ts`
- **Line:** 107
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a comment or validation to ensure the assessment data structure matches expectations, or make the sub-domain list configurable.

### 68. [MEDIUM] The `canonicalKey` function converts the section ID to lowercase and replaces non-alphanumeric characters with underscores. This can cause collisions between different section names that normalize to the same key (e.g., 'Part A' and 'Part_A' both become 'part_a').

- **File:** `lib/ai/domain-mapper.ts`
- **Line:** 155
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use a more specific matching strategy, such as checking for exact substring matches after normalization, or use a lookup table with canonical names.

### 69. [MEDIUM] The `correctionContext` is appended to `clinicalNotes` without any separator or formatting. If `correctionContext` is provided, it will be concatenated directly to the end of `clinicalNotes`, which may cause the LLM to misinterpret the context or produce malformed output.

- **File:** `lib/ai/generate.ts`
- **Line:** 82
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a clear separator (e.g., `\n\n---\n\nCORRECTION CONTEXT:\n`) before appending `correctionContext` to `clinicalNotes`.

### 70. [MEDIUM] The `buildSummaryGenerationPrompt` is called with `reportSoFar` which is built from `previousSections`. However, `previousSections` is a `Record<string, string>` where keys are section names and values are content. The iteration `Object.entries(previousSections)` does not guarantee order, so the `reportSoFar` may have sections in an arbitrary order, which could confuse the LLM.

- **File:** `lib/ai/generate.ts`
- **Line:** 103
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use an ordered list of section keys (e.g., from the template) to iterate over `previousSections` in the correct order.

### 71. [MEDIUM] The `stripDuplicateHeading` function removes the first line if it matches the section name. However, if the section name contains special characters (e.g., colons, slashes), the comparison might fail due to inconsistent normalization. For example, 'Part A: About The Participant' vs 'Part A: About The Participant' (with different spacing) would not match.

- **File:** `lib/ai/generate.ts`
- **Line:** 130
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Normalize both strings more aggressively (e.g., remove all punctuation and extra spaces) before comparing, or use a more robust matching algorithm.

### 72. [MEDIUM] The `embeddingStr` is constructed by joining the embedding array with commas and wrapping in brackets. If the embedding array contains very large or small numbers, the string representation might be truncated or lose precision, leading to incorrect similarity calculations.

- **File:** `lib/ai/rag.ts`
- **Line:** 33
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use a more robust serialization method, such as `JSON.stringify(embedding)` or a custom function that ensures full precision.

### 73. [MEDIUM] The `routeFeedbackToSections` function parses the LLM response as JSON. If the LLM returns malformed JSON (e.g., due to a syntax error), `JSON.parse` will throw an unhandled exception, crashing the request.

- **File:** `lib/ai/revise.ts`
- **Line:** 30
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Wrap `JSON.parse` in a try-catch block and return a default value (e.g., `{ sections: [], clarificationNeeded: 'Failed to parse response' }`) on error.

### 74. [MEDIUM] The `createDeserializer` function creates a new Plate editor instance every time it's called. This is inefficient and may cause memory leaks if called frequently. Additionally, the editor is created with plugins but never destroyed.

- **File:** `lib/editor/report-to-plate.ts`
- **Line:** 18
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Create the deserializer once outside the function or use a singleton pattern to reuse the same editor instance.

### 75. [MEDIUM] The `reportToPlate` function uses `tempEditor.api.markdown.deserialize` to convert markdown to Plate nodes. If the markdown content contains invalid syntax or unsupported elements, `deserialize` may return unexpected results or throw an error.

- **File:** `lib/editor/report-to-plate.ts`
- **Line:** 100
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Wrap the `deserialize` call in a try-catch block and handle errors gracefully (e.g., by inserting the raw text as a paragraph).

### 76. [MEDIUM] The `generateDocx` function in `lib/export/docx.ts` is never imported or used by any other file in the provided codebase. The DOCX export is handled by `components/report/export-button.tsx` and `components/workspace/workspace-layout.tsx` which use `docx` directly.

- **File:** `lib/export/docx.ts`
- **Line:** 1
- **Category:** dead-code
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Either remove the unused module or refactor the export components to use it.

### 77. [MEDIUM] The `createClient` function uses `await cookies()` which is a Next.js server-side function. If this function is called from a non-server context (e.g., a client component), it will throw an error. The function is exported and could be imported anywhere.

- **File:** `lib/supabase/server.ts`
- **Line:** 6
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a runtime check to ensure this function is only called on the server, or rename it to indicate it's server-only (e.g., `createServerClient`).

### 78. [MEDIUM] The `createServiceClient` function uses `createServerClient` with empty cookie handlers. This is correct for a service client, but the function name is misleading because it creates a server client, not a service client. The service role key is used, which is correct for admin operations.

- **File:** `lib/supabase/server.ts`
- **Line:** 22
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Rename the function to `createServiceRoleClient` or add a comment clarifying its purpose.

### 79. [MEDIUM] The `embedding` field is stored as a string `[${embeddings.data[i].embedding.join(',')}]` instead of using the proper pgvector format. The Supabase client may not correctly parse this string into a vector type, causing insertion errors or incorrect query results.

- **File:** `scripts/seed-foundational.ts`
- **Line:** 37
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use the Supabase client's built-in vector support (e.g., pass the array directly if the client supports it, or use a raw SQL query with proper vector formatting).

### 80. [MEDIUM] The `buildAuthCookies` function splits the session JSON into chunks of 3180 bytes. If the session JSON is exactly a multiple of 3180 bytes, the last chunk will be empty, resulting in a malformed cookie.

- **File:** `tests/e2e/peter-parker-e2e.mjs`
- **Line:** 83
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add a check to skip empty chunks when building the cookie string.

### 81. [MEDIUM] The `buildAuthCookies` function uses `encodeURIComponent` to encode the session JSON. However, Supabase auth cookies are typically base64-encoded, not URI-encoded. Using `encodeURIComponent` may produce cookies that are not recognized by the server.

- **File:** `tests/e2e/peter-parker-e2e.mjs`
- **Line:** 83
- **Category:** bug
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use `Buffer.from(sessionJson).toString('base64')` to encode the session JSON, or use the Supabase client's built-in cookie serialization.

### 82. [LOW] The `verify_key` function uses `removeprefix('Bearer ')` which is case-sensitive. A header with a lowercase 'bearer' prefix would not be stripped, causing the token comparison to fail even with a valid key.

- **File:** `agents/server.py`
- **Line:** 30
- **Category:** input-validation
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Use a case-insensitive check for the 'Bearer ' prefix, or use a standard library function like `re.sub(r'^Bearer\s+', '', authorization, flags=re.I)`.

### 83. [LOW] The file name from the user-uploaded file is used directly in the storage path. While Supabase storage may handle path traversal, it is safer to sanitize the file name to prevent unexpected behavior.

- **File:** `app/api/ingest/route.ts`
- **Line:** 27
- **Category:** input-validation
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Sanitize the file name by removing or encoding path traversal characters.

### 84. [LOW] The `handleClearFailed` function uses `Promise.all` to delete multiple reports concurrently. If one deletion fails, the others still proceed, but the local state update on line 107 filters out all failed reports regardless of which deletions succeeded. This could lead to a mismatch between the UI and the database.

- **File:** `components/reports/report-list.tsx`
- **Line:** 100
- **Category:** edge-case
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Track which deletions succeeded and only remove those from the local state, or use a sequential approach with error handling.

### 85. [LOW] The file input's `accept` attribute is set but the `handleFiles` function does not validate file types on the client side. A user could drag and drop files of any type.

- **File:** `components/ui/file-upload.tsx`
- **Line:** 82
- **Category:** input-validation
- **Pass:** security
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Add client-side file type validation in `handleFiles` by checking the file's `type` property against the allowed types.

### 86. [LOW] The toolbar position calculation uses `window.scrollY` which does not account for the toolbar's own height. If the selection is near the top of the viewport, the toolbar may appear above the visible area.

- **File:** `components/workspace/editor-toolbar.tsx`
- **Line:** 30
- **Category:** edge-case
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Clamp the `top` value to be at least 0 or use a fixed offset that accounts for the toolbar height.

### 87. [LOW] The `handleClickOutside` callback is recreated on every render due to the `useCallback` dependency on `onClose`. If `onClose` is not memoized, this can cause unnecessary re-registrations of the event listener.

- **File:** `components/workspace/flag-popover.tsx`
- **Line:** 30
- **Category:** edge-case
- **Pass:** bugs
- **Score:** 5/10
- **Rationale:** Not individually scored
- **Suggestion:** Ensure `onClose` is memoized with `useCallback` in the parent component, or use a ref to store the callback.
