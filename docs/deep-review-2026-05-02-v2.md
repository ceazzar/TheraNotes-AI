# Deep Review Report

**Generated:** 2026-05-02 16:49
**Model:** deepseek-chat
**Passes:** security, bugs, architecture, types
**Files scanned:** 108
**Duration:** 336.5s
**Findings:** 41

---

## Summary

| # | Severity | Category | File | Line | Finding | Score |
|---|---|---|---|---|---|---|
| 1 | critical | access-control | `agents/assessment_companion/tools.py` | 18 | The `get_assessment_data` tool fetches assessment data by ID without verifying that the requesting user owns or has permission to access that assessment. An attacker could enumerate assessment IDs and retrieve data belonging to other users. | 9/10 |
| 2 | critical | access-control | `agents/assessment_companion/tools.py` | 35 | The `get_clinician_profile` tool fetches a clinician's profile by user_id without verifying that the requesting user is authorized to view that profile. An attacker could enumerate user IDs and access other clinicians' profile data including credentials and preferences. | 9/10 |
| 3 | critical | access-control | `agents/ndis_planner_simulator/tools.py` | 18 | The `get_report_sections` tool loads report sections by report_id without verifying that the requesting user owns the report. An attacker could enumerate report IDs and access any report's sections. | 9/10 |
| 4 | critical | access-control | `agents/ndis_planner_simulator/tools.py` | 37 | The `get_assessment_data` tool loads assessment data linked to a report without verifying that the requesting user owns the report or assessment. An attacker could enumerate report IDs to access linked assessment data. | 9/10 |
| 5 | critical | access-control | `agents/ndis_planner_simulator/tools.py` | 97 | The `get_past_corrections` tool loads past corrections for a clinician by user_id without verifying that the requesting user is authorized to view those corrections. An attacker could enumerate user IDs to view other clinicians' correction history. | 9/10 |
| 6 | critical | access-control | `agents/revision_agent/agent.py` | 42 | The `get_report_sections` tool in the revision agent loads report sections by report_id without verifying that the requesting user owns the report. An attacker could enumerate report IDs and access any report's sections. | 9/10 |
| 7 | critical | access-control | `agents/revision_agent/agent.py` | 59 | The `get_past_corrections` tool in the revision agent loads past corrections by user_id without verifying that the requesting user is authorized to view those corrections. An attacker could enumerate user IDs to view other clinicians' correction history. | 9/10 |
| 8 | critical | access-control | `agents/revision_agent/agent.py` | 76 | The `record_correction` tool inserts a correction record with a user_id that is provided as a parameter, without verifying that the requesting user matches that user_id. An attacker could record corrections under another user's identity, potentially poisoning the learning profile for that user. | 9/10 |
| 9 | critical | access-control | `agents/revision_agent/agent.py` | 107 | The `check_cross_section_impact` tool loads report sections by report_id without verifying that the requesting user owns the report. An attacker could enumerate report IDs and access report content. | 9/10 |
| 10 | critical | injection | `app/api/ingest/route.ts` | 33 | The file name from the upload (`file.name`) is used directly in the storage path (`${user.id}/${file.name}`) without sanitization. An attacker could upload a file with a name containing path traversal characters (e.g., `../../etc/passwd`) to overwrite arbitrary files in the storage bucket. | 9/10 |
| 11 | critical | xss | `components/report/formatted-report.tsx` | 72 | Uses `dangerouslySetInnerHTML` with `renderInlineMarkdown()` which only escapes `<>&` but does not sanitize other HTML or script content. If report content contains malicious HTML (e.g., `<img onerror=alert(1)>`), it will be rendered unsanitized. | 9/10 |
| 12 | critical | xss | `components/report/formatted-report.tsx` | 148 | Uses `dangerouslySetInnerHTML` in table header cells (`<th>`) with `renderInlineMarkdown()` output that only escapes `<>&`. Malicious content in report data can execute arbitrary JavaScript. | 9/10 |
| 13 | critical | xss | `components/report/formatted-report.tsx` | 155 | Uses `dangerouslySetInnerHTML` in table body cells (`<td>`) with `renderInlineMarkdown()` output that only escapes `<>&`. Malicious content in report data can execute arbitrary JavaScript. | 9/10 |
| 14 | critical | access-control | `components/reports/report-list.tsx` | 37 | The `ReportList` component fetches all reports from the `reports` table without any user ID filter. This means any authenticated user can see all reports in the database, not just their own. | 9/10 |
| 15 | critical | access-control | `components/settings/exemplar-list.tsx` | 24 | The `fetchExemplars` function queries the `exemplar_chunks` table without any user ID filter. This means any authenticated user can see all exemplar chunks in the database, not just their own. | 9/10 |
| 16 | critical | access-control | `components/settings/exemplar-list.tsx` | 55 | The `handleDelete` function deletes exemplar chunks from the `exemplar_chunks` table by `source_file` without verifying that the current user owns those chunks. A user could delete another user's exemplars by guessing the source filename. | 9/10 |
| 17 | critical | access-control | `components/settings/exemplar-list.tsx` | 60 | The `handleDelete` function removes files from storage using the path `${user.id}/${sourceFile}` but does not verify that the `sourceFile` belongs to the current user before deleting from the database. A user could delete another user's storage files by manipulating the source filename. | 9/10 |
| 18 | high | duplication | `agents/assessment_companion/agent.py` | 1 | The `_parse_json_output` function in `agents/assessment_companion/agent.py` (lines 100-118) is nearly identical to the one in `agents/ndis_planner_simulator/agent.py` (lines 103-121) and `agents/revision_agent/agent.py` (lines 175-193). All three parse JSON from LLM responses with markdown fence handling. | 9/10 |
| 19 | high | duplication | `agents/assessment_companion/agent.py` | 1 | The agent creation pattern (`create_*_agent` function) is duplicated across `agents/assessment_companion/agent.py`, `agents/ndis_planner_simulator/agent.py`, and `agents/revision_agent/agent.py`. Each creates an `Agent` with a name, instructions, model, and tools list. | 7/10 |
| 20 | high | duplication | `agents/ndis_planner_simulator/agent.py` | 1 | The `_parse_json_output` function in `agents/ndis_planner_simulator/agent.py` (lines 103-121) is nearly identical to the one in `agents/assessment_companion/agent.py` (lines 100-118) and `agents/revision_agent/agent.py` (lines 175-193). All three parse JSON from LLM responses with markdown fence handling. | 9/10 |
| 21 | high | duplication | `agents/ndis_planner_simulator/agent.py` | 1 | The agent creation pattern (`create_*_agent` function) is duplicated across `agents/ndis_planner_simulator/agent.py`, `agents/assessment_companion/agent.py`, and `agents/revision_agent/agent.py`. Each creates an `Agent` with a name, instructions, model, and tools list. | 7/10 |
| 22 | high | duplication | `agents/revision_agent/agent.py` | 175 | The `_parse_json_output` function in `agents/revision_agent/agent.py` (lines 175-193) is nearly identical to the one in `agents/assessment_companion/agent.py` (lines 100-118) and `agents/ndis_planner_simulator/agent.py` (lines 103-121). All three parse JSON from LLM responses with markdown fence handling. | 9/10 |
| 23 | high | duplication | `agents/revision_agent/agent.py` | 1 | The agent creation pattern (`create_*_agent` function) is duplicated across `agents/revision_agent/agent.py`, `agents/assessment_companion/agent.py`, and `agents/ndis_planner_simulator/agent.py`. Each creates an `Agent` with a name, instructions, model, and tools list. | 7/10 |
| 24 | high | data-exposure | `agents/shared/db.py` | 5 | The Supabase service role key is loaded from an environment variable and used to create a client with full admin privileges. If the environment variable is leaked or the client is used in a context where the key could be exposed (e.g., server-side rendering logs, error messages), an attacker could gain unrestricted access to the database. | 8/10 |
| 25 | high | access-control | `app/api/chat/route.ts` | 37 | The chat API fetches a report by either `reportId` or `sessionId` from the request body, but only filters by `user_id` when querying by `reportId`. When querying by `sessionId`, the filter `eq('user_id', user.id)` is applied, but the session could belong to another user if the session ID is guessed or enumerated. The code does not verify that the session belongs to the authenticated user. | 7/10 |
| 26 | high | access-control | `app/api/generate/route.ts` | 97 | When creating a new session for a report, the code inserts a session with `user_id: user.id` but does not verify that the `sessionId` provided in the request (if any) belongs to the authenticated user. An attacker could provide a sessionId belonging to another user and have the report associated with that session. | 7/10 |
| 27 | high | injection | `app/api/refine/route.ts` | 33 | The `selectedText` and `instruction` from the request body are interpolated directly into the user prompt sent to the AI model without sanitization. While this is a prompt injection vector rather than a traditional injection, an attacker could craft input that manipulates the AI's behavior, potentially causing it to ignore instructions or leak information. | 7/10 |
| 28 | high | duplication | `components/report/export-button.tsx` | 1 | The DOCX export logic in `components/report/export-button.tsx` is duplicated in `components/workspace/workspace-layout.tsx` and `lib/export/docx.ts`. All three build a `Document` with the same structure (title, sections, paragraphs). | 7/10 |
| 29 | high | access-control | `components/reports/report-list.tsx` | 80 | The `handleDelete` function sends a DELETE request to `/api/reports/${id}` without any client-side ownership check. If the API endpoint does not verify ownership, a user could delete another user's reports by guessing the report ID. | 7/10 |
| 30 | high | access-control | `components/reports/report-list.tsx` | 88 | The `handleClearFailed` function sends DELETE requests to `/api/reports/${r.id}` for all failed reports without any ownership check. If the API endpoint does not verify ownership, a user could delete another user's failed reports. | 7/10 |
| 31 | high | duplication | `components/workspace/workspace-layout.tsx` | 1 | The DOCX export logic in `components/workspace/workspace-layout.tsx` is duplicated in `components/report/export-button.tsx` and `lib/export/docx.ts`. All three build a `Document` with the same structure (title, sections, paragraphs). | 7/10 |
| 32 | medium | dead-code | `agents/assessment_companion/tools.py` | 1 | The `get_clinician_profile` tool in `agents/assessment_companion/tools.py` is defined but never called by the agent's system prompt or any other code in the provided files. The agent has access to it but the prompt doesn't instruct its use. | 5/10 |
| 33 | medium | injection | `app/api/chat/route.ts` | 88 | The `contextPrompt` includes the active section content directly from the database without sanitization before passing it to the AI model. If a section contains malicious content (e.g., from a previous injection attack), it could influence the AI's behavior in unexpected ways. | 6/10 |
| 34 | medium | injection | `components/report/formatted-report.tsx` | 72 | The `renderInlineMarkdown` function only escapes `<`, `>`, and `&` but does not escape single or double quotes, leaving the output vulnerable to attribute injection if the HTML is placed inside an attribute context. | 5/10 |
| 35 | medium | input-validation | `components/report/formatted-report.tsx` | 72 | The `ReportContent` component renders report content that comes from the database without sanitization. If the report content contains malicious HTML (e.g., from a compromised AI model or database), it will be rendered unsanitized. | 8/10 |
| 36 | medium | input-validation | `components/report/formatted-report.tsx` | 148 | The `ReportTable` component renders table content from the database without sanitization. If the table data contains malicious HTML, it will be rendered unsanitized. | 8/10 |
| 37 | medium | input-validation | `components/report/formatted-report.tsx` | 155 | The `ReportTable` component renders table body cells from the database without sanitization. If the table data contains malicious HTML, it will be rendered unsanitized. | 8/10 |
| 38 | medium | data-exposure | `components/reports/report-list.tsx` | 37 | The Supabase query selects `assessments(participant_name)` which exposes participant names from the `assessments` table. If the RLS policy on `assessments` is not properly configured, this could leak participant data across users. | 6/10 |
| 39 | medium | data-exposure | `components/reports/report-list.tsx` | 37 | The Supabase query selects `planner_review` which may contain sensitive review data. If the RLS policy on `reports` is not properly configured, this could expose review data across users. | 6/10 |
| 40 | medium | input-validation | `components/settings/exemplar-upload.tsx` | 32 | The file upload sends the file to `/api/ingest` without client-side validation of file content type beyond the accept attribute. A user could bypass the browser's file picker and upload a file with a different extension or malicious content. | 7/10 |
| 41 | medium | input-validation | `components/workspace/editor-toolbar.tsx` | 93 | The `refineText` state is sent directly to the `/api/refine` endpoint without client-side validation. A user could send arbitrary text as the instruction, potentially leading to prompt injection if the API uses it in an LLM prompt. | 5/10 |

## Details

### 1. [CRITICAL] The `get_assessment_data` tool fetches assessment data by ID without verifying that the requesting user owns or has permission to access that assessment. An attacker could enumerate assessment IDs and retrieve data belonging to other users.

- **File:** `agents/assessment_companion/tools.py`
- **Line:** 18
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_assessment_data` tool in assessment_companion/tools.py fetches assessment data by ID with no user ownership check, allowing any authenticated user to access any assessment by enumerating IDs.
- **Suggestion:** Add a user_id parameter to the tool and filter the query by both assessment_id and user_id, or implement a permission check before returning data.

### 2. [CRITICAL] The `get_clinician_profile` tool fetches a clinician's profile by user_id without verifying that the requesting user is authorized to view that profile. An attacker could enumerate user IDs and access other clinicians' profile data including credentials and preferences.

- **File:** `agents/assessment_companion/tools.py`
- **Line:** 35
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_clinician_profile` tool fetches any clinician's profile by user_id without authorization, allowing enumeration of user IDs to access other clinicians' profile data.
- **Suggestion:** Restrict this tool to only return the profile of the authenticated user, or add an authorization check that the requesting user matches the user_id parameter.

### 3. [CRITICAL] The `get_report_sections` tool loads report sections by report_id without verifying that the requesting user owns the report. An attacker could enumerate report IDs and access any report's sections.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 18
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_report_sections` tool in ndis_planner_simulator/tools.py loads report sections by report_id with no user ownership check, allowing access to any report via ID enumeration.
- **Suggestion:** Add a user_id parameter and filter the query by both report_id and user_id, or implement a permission check.

### 4. [CRITICAL] The `get_assessment_data` tool loads assessment data linked to a report without verifying that the requesting user owns the report or assessment. An attacker could enumerate report IDs to access linked assessment data.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 37
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_assessment_data` tool in ndis_planner_simulator/tools.py loads linked assessment data via report_id without verifying user ownership, enabling unauthorized data access.
- **Suggestion:** Add a user_id parameter and verify ownership of the report before fetching the linked assessment data.

### 5. [CRITICAL] The `get_past_corrections` tool loads past corrections for a clinician by user_id without verifying that the requesting user is authorized to view those corrections. An attacker could enumerate user IDs to view other clinicians' correction history.

- **File:** `agents/ndis_planner_simulator/tools.py`
- **Line:** 97
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_past_corrections` tool in ndis_planner_simulator/tools.py loads corrections by user_id without authorization, allowing enumeration of user IDs to view other clinicians' correction history.
- **Suggestion:** Restrict this tool to only return corrections for the authenticated user, or add an authorization check that the requesting user matches the user_id parameter.

### 6. [CRITICAL] The `get_report_sections` tool in the revision agent loads report sections by report_id without verifying that the requesting user owns the report. An attacker could enumerate report IDs and access any report's sections.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 42
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_report_sections` tool in revision_agent/agent.py loads report sections by report_id with no user ownership check, allowing unauthorized access to any report.
- **Suggestion:** Add a user_id parameter and filter the query by both report_id and user_id, or implement a permission check.

### 7. [CRITICAL] The `get_past_corrections` tool in the revision agent loads past corrections by user_id without verifying that the requesting user is authorized to view those corrections. An attacker could enumerate user IDs to view other clinicians' correction history.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 59
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `get_past_corrections` tool in revision_agent/agent.py loads corrections by user_id without authorization, allowing enumeration of user IDs to view other clinicians' correction history.
- **Suggestion:** Restrict this tool to only return corrections for the authenticated user, or add an authorization check that the requesting user matches the user_id parameter.

### 8. [CRITICAL] The `record_correction` tool inserts a correction record with a user_id that is provided as a parameter, without verifying that the requesting user matches that user_id. An attacker could record corrections under another user's identity, potentially poisoning the learning profile for that user.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 76
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `record_correction` tool in revision_agent/agent.py inserts a correction with a user_id parameter without verifying the requesting user matches, allowing an attacker to poison another user's learning profile.
- **Suggestion:** Validate that the authenticated user matches the user_id parameter before inserting the correction record.

### 9. [CRITICAL] The `check_cross_section_impact` tool loads report sections by report_id without verifying that the requesting user owns the report. An attacker could enumerate report IDs and access report content.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 107
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The `check_cross_section_impact` tool in revision_agent/agent.py loads report sections by report_id with no user ownership check, allowing unauthorized access to report content.
- **Suggestion:** Add a user_id parameter and filter the query by both report_id and user_id, or implement a permission check.

### 10. [CRITICAL] The file name from the upload (`file.name`) is used directly in the storage path (`${user.id}/${file.name}`) without sanitization. An attacker could upload a file with a name containing path traversal characters (e.g., `../../etc/passwd`) to overwrite arbitrary files in the storage bucket.

- **File:** `app/api/ingest/route.ts`
- **Line:** 33
- **Category:** injection
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The code uses `file.name` directly in the storage path without sanitization, which is a real path traversal vulnerability that could allow overwriting arbitrary files in the bucket.
- **Suggestion:** Sanitize the file name by removing or replacing path traversal characters (e.g., `../`, `..\`, null bytes) and consider generating a random file name instead of using the user-provided name.

### 11. [CRITICAL] Uses `dangerouslySetInnerHTML` with `renderInlineMarkdown()` which only escapes `<>&` but does not sanitize other HTML or script content. If report content contains malicious HTML (e.g., `<img onerror=alert(1)>`), it will be rendered unsanitized.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 72
- **Category:** xss
- **Pass:** security
- **Score:** 9/10
- **Rationale:** `dangerouslySetInnerHTML` with `renderInlineMarkdown` that only escapes `<>&` is a real XSS vulnerability; malicious content in report data can execute arbitrary JavaScript.
- **Suggestion:** Use a DOMPurify library to sanitize the HTML output after markdown rendering, or avoid `dangerouslySetInnerHTML` entirely by rendering markdown via a safe React component.

### 12. [CRITICAL] Uses `dangerouslySetInnerHTML` in table header cells (`<th>`) with `renderInlineMarkdown()` output that only escapes `<>&`. Malicious content in report data can execute arbitrary JavaScript.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 148
- **Category:** xss
- **Pass:** security
- **Score:** 9/10
- **Rationale:** Same XSS vulnerability as finding 19 but in table header cells, confirming the pattern exists across multiple locations in the component.
- **Suggestion:** Sanitize the HTML with DOMPurify before injecting via `dangerouslySetInnerHTML`, or render table cells using React components instead of raw HTML.

### 13. [CRITICAL] Uses `dangerouslySetInnerHTML` in table body cells (`<td>`) with `renderInlineMarkdown()` output that only escapes `<>&`. Malicious content in report data can execute arbitrary JavaScript.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 155
- **Category:** xss
- **Pass:** security
- **Score:** 9/10
- **Rationale:** Same XSS vulnerability as finding 19 but in table body cells, confirming the pattern exists across multiple locations in the component.
- **Suggestion:** Sanitize the HTML with DOMPurify before injecting via `dangerouslySetInnerHTML`, or render table cells using React components instead of raw HTML.

### 14. [CRITICAL] The `ReportList` component fetches all reports from the `reports` table without any user ID filter. This means any authenticated user can see all reports in the database, not just their own.

- **File:** `components/reports/report-list.tsx`
- **Line:** 37
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The query fetches all reports without a user_id filter, which is a real access control vulnerability allowing any authenticated user to see all reports.
- **Suggestion:** Add a filter to the Supabase query to only fetch reports belonging to the current user, e.g., `.eq('user_id', userId)` where `userId` is obtained from `supabase.auth.getUser()`.

### 15. [CRITICAL] The `fetchExemplars` function queries the `exemplar_chunks` table without any user ID filter. This means any authenticated user can see all exemplar chunks in the database, not just their own.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 24
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The query fetches all exemplar chunks without a user_id filter, which is a real access control vulnerability allowing any authenticated user to see all exemplars.
- **Suggestion:** Add a filter to the Supabase query to only fetch exemplar chunks belonging to the current user, e.g., `.eq('user_id', userId)` where `userId` is obtained from `supabase.auth.getUser()`.

### 16. [CRITICAL] The `handleDelete` function deletes exemplar chunks from the `exemplar_chunks` table by `source_file` without verifying that the current user owns those chunks. A user could delete another user's exemplars by guessing the source filename.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 55
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The delete operation does not verify user ownership before deleting exemplar chunks, allowing a user to delete another user's data by guessing the source filename.
- **Suggestion:** Add a user ID filter to the delete query, e.g., `.eq('user_id', userId)` where `userId` is obtained from `supabase.auth.getUser()`.

### 17. [CRITICAL] The `handleDelete` function removes files from storage using the path `${user.id}/${sourceFile}` but does not verify that the `sourceFile` belongs to the current user before deleting from the database. A user could delete another user's storage files by manipulating the source filename.

- **File:** `components/settings/exemplar-list.tsx`
- **Line:** 60
- **Category:** access-control
- **Pass:** security
- **Score:** 9/10
- **Rationale:** The storage file deletion uses the user's ID in the path but does not verify database ownership, allowing a user to delete another user's storage files.
- **Suggestion:** Verify ownership of the exemplar chunk in the database before deleting from storage, or use Row Level Security (RLS) policies in Supabase to enforce access control.

### 18. [HIGH] The `_parse_json_output` function in `agents/assessment_companion/agent.py` (lines 100-118) is nearly identical to the one in `agents/ndis_planner_simulator/agent.py` (lines 103-121) and `agents/revision_agent/agent.py` (lines 175-193). All three parse JSON from LLM responses with markdown fence handling.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 9/10
- **Rationale:** The finding correctly identifies near-identical `_parse_json_output` functions across three agent files, which is a clear code duplication issue that should be refactored; severity is appropriate.
- **Suggestion:** Extract `_parse_json_output` into a shared utility module (e.g., `agents/shared/llm_utils.py`) and import it in all three agent files.

### 19. [HIGH] The agent creation pattern (`create_*_agent` function) is duplicated across `agents/assessment_companion/agent.py`, `agents/ndis_planner_simulator/agent.py`, and `agents/revision_agent/agent.py`. Each creates an `Agent` with a name, instructions, model, and tools list.

- **File:** `agents/assessment_companion/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 7/10
- **Rationale:** The finding correctly identifies duplicated agent creation patterns across three files, which is a valid architectural concern, though the duplication is relatively minor and each agent has different tools and prompts.
- **Suggestion:** Consider a shared factory function or base class for agent creation to reduce boilerplate and ensure consistent configuration.

### 20. [HIGH] The `_parse_json_output` function in `agents/ndis_planner_simulator/agent.py` (lines 103-121) is nearly identical to the one in `agents/assessment_companion/agent.py` (lines 100-118) and `agents/revision_agent/agent.py` (lines 175-193). All three parse JSON from LLM responses with markdown fence handling.

- **File:** `agents/ndis_planner_simulator/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 9/10
- **Rationale:** The finding correctly identifies near-identical `_parse_json_output` functions across three agent files, which is a clear code duplication issue that should be refactored; severity is appropriate.
- **Suggestion:** Extract `_parse_json_output` into a shared utility module (e.g., `agents/shared/llm_utils.py`) and import it in all three agent files.

### 21. [HIGH] The agent creation pattern (`create_*_agent` function) is duplicated across `agents/ndis_planner_simulator/agent.py`, `agents/assessment_companion/agent.py`, and `agents/revision_agent/agent.py`. Each creates an `Agent` with a name, instructions, model, and tools list.

- **File:** `agents/ndis_planner_simulator/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 7/10
- **Rationale:** The finding correctly identifies duplicated agent creation patterns across three files, which is a valid architectural concern, though the duplication is relatively minor and each agent has different tools and prompts.
- **Suggestion:** Consider a shared factory function or base class for agent creation to reduce boilerplate and ensure consistent configuration.

### 22. [HIGH] The `_parse_json_output` function in `agents/revision_agent/agent.py` (lines 175-193) is nearly identical to the one in `agents/assessment_companion/agent.py` (lines 100-118) and `agents/ndis_planner_simulator/agent.py` (lines 103-121). All three parse JSON from LLM responses with markdown fence handling.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 175
- **Category:** duplication
- **Pass:** architecture
- **Score:** 9/10
- **Rationale:** The finding correctly identifies near-identical `_parse_json_output` functions across three agent files, which is a clear code duplication issue that should be refactored; severity is appropriate.
- **Suggestion:** Extract `_parse_json_output` into a shared utility module (e.g., `agents/shared/llm_utils.py`) and import it in all three agent files.

### 23. [HIGH] The agent creation pattern (`create_*_agent` function) is duplicated across `agents/revision_agent/agent.py`, `agents/assessment_companion/agent.py`, and `agents/ndis_planner_simulator/agent.py`. Each creates an `Agent` with a name, instructions, model, and tools list.

- **File:** `agents/revision_agent/agent.py`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 7/10
- **Rationale:** The finding correctly identifies duplicated agent creation patterns across three files, which is a valid architectural concern, though the duplication is relatively minor and each agent has different tools and prompts.
- **Suggestion:** Consider a shared factory function or base class for agent creation to reduce boilerplate and ensure consistent configuration.

### 24. [HIGH] The Supabase service role key is loaded from an environment variable and used to create a client with full admin privileges. If the environment variable is leaked or the client is used in a context where the key could be exposed (e.g., server-side rendering logs, error messages), an attacker could gain unrestricted access to the database.

- **File:** `agents/shared/db.py`
- **Line:** 5
- **Category:** data-exposure
- **Pass:** security
- **Score:** 8/10
- **Rationale:** The finding correctly identifies that the service role key is used from an environment variable, which is a genuine security concern if exposed, but the code is server-side only and the risk is standard for server-side Supabase usage.
- **Suggestion:** Ensure the service role key is only used in secure server-side contexts, never exposed to clients, and consider using row-level security (RLS) policies with the anon key for user-specific operations.

### 25. [HIGH] The chat API fetches a report by either `reportId` or `sessionId` from the request body, but only filters by `user_id` when querying by `reportId`. When querying by `sessionId`, the filter `eq('user_id', user.id)` is applied, but the session could belong to another user if the session ID is guessed or enumerated. The code does not verify that the session belongs to the authenticated user.

- **File:** `app/api/chat/route.ts`
- **Line:** 37
- **Category:** access-control
- **Pass:** security
- **Score:** 7/10
- **Rationale:** The chat API correctly filters by user_id when querying by reportId, but when querying by sessionId the code does not verify session ownership, which could allow session enumeration if session IDs are guessable.
- **Suggestion:** Add an explicit check that the session belongs to the authenticated user by querying the sessions table with both session_id and user_id.

### 26. [HIGH] When creating a new session for a report, the code inserts a session with `user_id: user.id` but does not verify that the `sessionId` provided in the request (if any) belongs to the authenticated user. An attacker could provide a sessionId belonging to another user and have the report associated with that session.

- **File:** `app/api/generate/route.ts`
- **Line:** 97
- **Category:** access-control
- **Pass:** security
- **Score:** 7/10
- **Rationale:** The generate route creates a new session with user_id but does not verify that a provided sessionId belongs to the authenticated user, potentially allowing session hijacking.
- **Suggestion:** Before using a provided sessionId, verify that the session belongs to the authenticated user by querying the sessions table with both session_id and user_id.

### 27. [HIGH] The `selectedText` and `instruction` from the request body are interpolated directly into the user prompt sent to the AI model without sanitization. While this is a prompt injection vector rather than a traditional injection, an attacker could craft input that manipulates the AI's behavior, potentially causing it to ignore instructions or leak information.

- **File:** `app/api/refine/route.ts`
- **Line:** 33
- **Category:** injection
- **Pass:** security
- **Score:** 7/10
- **Rationale:** The `selectedText` and `instruction` are interpolated directly into the user prompt without sanitization, which is a real prompt injection vector that could manipulate AI behavior.
- **Suggestion:** Consider adding input validation to reject obviously malicious patterns (e.g., attempts to override system instructions), and ensure the system prompt clearly instructs the model to ignore user attempts to change its behavior.

### 28. [HIGH] The DOCX export logic in `components/report/export-button.tsx` is duplicated in `components/workspace/workspace-layout.tsx` and `lib/export/docx.ts`. All three build a `Document` with the same structure (title, sections, paragraphs).

- **File:** `components/report/export-button.tsx`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 7/10
- **Rationale:** The DOCX export logic in `components/report/export-button.tsx` and `components/workspace/workspace-layout.tsx` is indeed duplicated with nearly identical Document construction code, which is a genuine maintainability concern.
- **Suggestion:** Consolidate DOCX generation into a single shared function in `lib/export/docx.ts` and call it from both components.

### 29. [HIGH] The `handleDelete` function sends a DELETE request to `/api/reports/${id}` without any client-side ownership check. If the API endpoint does not verify ownership, a user could delete another user's reports by guessing the report ID.

- **File:** `components/reports/report-list.tsx`
- **Line:** 80
- **Category:** access-control
- **Pass:** security
- **Score:** 7/10
- **Rationale:** The client-side delete lacks ownership verification, which is a valid concern, but the actual security depends on the server-side API implementation which is not shown here.
- **Suggestion:** Ensure the `/api/reports/[id]` DELETE endpoint verifies that the authenticated user owns the report before deleting it.

### 30. [HIGH] The `handleClearFailed` function sends DELETE requests to `/api/reports/${r.id}` for all failed reports without any ownership check. If the API endpoint does not verify ownership, a user could delete another user's failed reports.

- **File:** `components/reports/report-list.tsx`
- **Line:** 88
- **Category:** access-control
- **Pass:** security
- **Score:** 7/10
- **Rationale:** The finding correctly identifies a missing ownership check in `handleClearFailed`, which is a genuine access-control issue; however, the severity is appropriate as it depends on whether the API endpoint enforces authorization.
- **Suggestion:** Ensure the `/api/reports/[id]` DELETE endpoint verifies ownership, or filter the reports to only those belonging to the current user before sending delete requests.

### 31. [HIGH] The DOCX export logic in `components/workspace/workspace-layout.tsx` is duplicated in `components/report/export-button.tsx` and `lib/export/docx.ts`. All three build a `Document` with the same structure (title, sections, paragraphs).

- **File:** `components/workspace/workspace-layout.tsx`
- **Line:** 1
- **Category:** duplication
- **Pass:** architecture
- **Score:** 7/10
- **Rationale:** The DOCX export logic in `components/workspace/workspace-layout.tsx` and `components/report/export-button.tsx` is indeed duplicated with nearly identical Document construction code, which is a genuine maintainability concern.
- **Suggestion:** Consolidate DOCX generation into a single shared function in `lib/export/docx.ts` and call it from both components.

### 32. [MEDIUM] The `get_clinician_profile` tool in `agents/assessment_companion/tools.py` is defined but never called by the agent's system prompt or any other code in the provided files. The agent has access to it but the prompt doesn't instruct its use.

- **File:** `agents/assessment_companion/tools.py`
- **Line:** 1
- **Category:** dead-code
- **Pass:** architecture
- **Score:** 5/10
- **Rationale:** The `get_clinician_profile` tool is defined and included in the agent's tools list but the system prompt does not instruct the agent to call it, making it potentially unused; however, the agent could still call it autonomously, so this is a valid concern but not a definite dead-code issue.
- **Suggestion:** Either update the system prompt to use `get_clinician_profile` or remove the tool if it's not needed.

### 33. [MEDIUM] The `contextPrompt` includes the active section content directly from the database without sanitization before passing it to the AI model. If a section contains malicious content (e.g., from a previous injection attack), it could influence the AI's behavior in unexpected ways.

- **File:** `app/api/chat/route.ts`
- **Line:** 88
- **Category:** injection
- **Pass:** security
- **Score:** 6/10
- **Rationale:** Section content from the database is included in the prompt without sanitization, which is a valid prompt injection concern, though the impact is limited as content is already stored data.
- **Suggestion:** Consider truncating or sanitizing section content before including it in the prompt, and ensure the system prompt instructs the model to treat section content as data, not instructions.

### 34. [MEDIUM] The `renderInlineMarkdown` function only escapes `<`, `>`, and `&` but does not escape single or double quotes, leaving the output vulnerable to attribute injection if the HTML is placed inside an attribute context.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 72
- **Category:** injection
- **Pass:** security
- **Score:** 5/10
- **Rationale:** The finding about missing quote escaping is technically correct but the output is used in innerHTML, not attribute context, so the practical risk is lower than stated.
- **Suggestion:** Use a proper HTML escaping function that escapes all five HTML entities (`&`, `<`, `>`, `"`, `'`), or use a library like `he` or DOMPurify.

### 35. [MEDIUM] The `ReportContent` component renders report content that comes from the database without sanitization. If the report content contains malicious HTML (e.g., from a compromised AI model or database), it will be rendered unsanitized.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 72
- **Category:** input-validation
- **Pass:** security
- **Score:** 8/10
- **Rationale:** The finding correctly identifies that `ReportContent` uses `dangerouslySetInnerHTML` without sanitization, which is a genuine XSS risk if the database content is compromised; severity is appropriate.
- **Suggestion:** Sanitize all report content with DOMPurify before rendering, regardless of the source.

### 36. [MEDIUM] The `ReportTable` component renders table content from the database without sanitization. If the table data contains malicious HTML, it will be rendered unsanitized.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 148
- **Category:** input-validation
- **Pass:** security
- **Score:** 8/10
- **Rationale:** The finding correctly identifies that `ReportTable` uses `dangerouslySetInnerHTML` for table headers without sanitization, which is a genuine XSS risk; severity is appropriate.
- **Suggestion:** Sanitize all table cell content with DOMPurify before rendering.

### 37. [MEDIUM] The `ReportTable` component renders table body cells from the database without sanitization. If the table data contains malicious HTML, it will be rendered unsanitized.

- **File:** `components/report/formatted-report.tsx`
- **Line:** 155
- **Category:** input-validation
- **Pass:** security
- **Score:** 8/10
- **Rationale:** The finding correctly identifies that `ReportTable` uses `dangerouslySetInnerHTML` for table body cells without sanitization, which is a genuine XSS risk; severity is appropriate.
- **Suggestion:** Sanitize all table cell content with DOMPurify before rendering.

### 38. [MEDIUM] The Supabase query selects `assessments(participant_name)` which exposes participant names from the `assessments` table. If the RLS policy on `assessments` is not properly configured, this could leak participant data across users.

- **File:** `components/reports/report-list.tsx`
- **Line:** 37
- **Category:** data-exposure
- **Pass:** security
- **Score:** 6/10
- **Rationale:** The finding correctly notes that `assessments(participant_name)` is selected without an explicit user filter, but this is a standard Supabase pattern relying on RLS, so the risk is real but contingent on RLS configuration.
- **Suggestion:** Ensure Row Level Security (RLS) policies on the `assessments` table restrict access to only the owning user, or add a user ID filter to the query.

### 39. [MEDIUM] The Supabase query selects `planner_review` which may contain sensitive review data. If the RLS policy on `reports` is not properly configured, this could expose review data across users.

- **File:** `components/reports/report-list.tsx`
- **Line:** 37
- **Category:** data-exposure
- **Pass:** security
- **Score:** 6/10
- **Rationale:** The finding correctly identifies that `planner_review` is selected without an explicit user filter, but again this relies on RLS policies, making it a valid concern but not an immediate vulnerability.
- **Suggestion:** Ensure Row Level Security (RLS) policies on the `reports` table restrict access to only the owning user.

### 40. [MEDIUM] The file upload sends the file to `/api/ingest` without client-side validation of file content type beyond the accept attribute. A user could bypass the browser's file picker and upload a file with a different extension or malicious content.

- **File:** `components/settings/exemplar-upload.tsx`
- **Line:** 32
- **Category:** input-validation
- **Pass:** security
- **Score:** 7/10
- **Rationale:** The finding correctly points out the lack of client-side file content validation beyond the accept attribute, which is a genuine security concern; the severity is appropriate as server-side validation is the proper fix.
- **Suggestion:** Add server-side validation of the file type (e.g., check magic bytes) and file size limits in the `/api/ingest` endpoint.

### 41. [MEDIUM] The `refineText` state is sent directly to the `/api/refine` endpoint without client-side validation. A user could send arbitrary text as the instruction, potentially leading to prompt injection if the API uses it in an LLM prompt.

- **File:** `components/workspace/editor-toolbar.tsx`
- **Line:** 93
- **Category:** input-validation
- **Pass:** security
- **Score:** 5/10
- **Rationale:** The finding correctly notes that `refineText` is sent without client-side validation, but prompt injection is a server-side responsibility and the client-side validation suggested is not a strong security boundary, making this a moderate concern.
- **Suggestion:** Validate and sanitize the instruction text on the client side, and implement server-side prompt injection mitigations in the `/api/refine` endpoint.
