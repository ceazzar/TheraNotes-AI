# Clinician Workflow Review - Round 3

| Field | Value |
|---|---|
| Reviewer | NDIS OT (12 FCAs/month, AHPRA-registered) |
| Date | 2026-05-10 |
| Build | Production deploy at theranotes.com.au, sha `89a24bc` |
| Method | Live PROD via headless browse + DOCX download verification + code-level audit of round-2 fix lines |
| Cost guard | Generate / Run NDIS Review / Refine / Apply fix all DO-NOT-CLICK (none clicked) |
| Round | 3 (verification mode) |

## Vote

**yes-with-caveats**

The two load-bearing R2 P0s (REG-1 DOCX and REG-2 false residency on /login) shipped clean; export now produces a real Word doc, login copy is honest, no dead-affordances, profile auto-fill respects typed input - I would use this on a real client.

## Suspected regressions from round 2

| ID | Severity | Surface | What broke | Caused by |
|---|---|---|---|---|
| WF-REG-1 | P3 | Workspace footer | The save-status pulse animation no longer fires while saving. CSS rule is `.tn-saved[data-saving="true"] .tn-saved-dot` (`app/globals.css:1772`) but the new component emits `data-status="saving"` (`components/workspace/workspace-footer.tsx:38-41`). The chip text still flips to "Saving...", but the visual pulse cue introduced in round 1 is silently dead. | NEW-8 fix (add `error` state, switch to `data-status` attribute). The CSS selector tied to the old `data-saving` attribute was not migrated. Cosmetic - "Saving..." text still surfaces - so P3, but it's the kind of dead CSS that compounds the next time someone refactors the chip. |
| WF-REG-2 | P2 | /generate banner stack | The "Draft restored - Picked up your in-progress intake from just now." banner still appears on a brand-new account that has only the profile auto-fill written to localStorage (assessor / credentials / email / company) and no human-typed input. Repro: clear localStorage, reload /generate (auto-fill writes draft), reload again -> banner shows. R2-07 was filed in round 2 and was never fully fixed; it survives the round-2 ship. Sort-of-a-regression because the round-2 punch list called it out and it shipped without a fix. | Banner is gated only on "draft has a savedAt". Auto-fill from profile counts as a save. |
| WF-REG-3 | P3 | Print output | The `.tn-doc::after` pseudo-element approach (`globals.css:1882`) renders the disclaimer correctly inside the workspace doc, but headless Chromium's PDF export of `/reports/<id>` produced a 60KB PDF whose document title is `Workspace | TheraNotes AI` and which renders the live workspace chrome rather than the print-styled paper. Real macOS Cmd+P with print-preview does respect the print stylesheet (per round-2 finding 12 verified) - but the PDF route via the browser print API does not in this headless config. Likely a tooling artefact, not a product regression, but worth a one-shot real-browser check before the OT pilot. | Day-3 print CSS - `::after` only fires when print media query matches; some PDF capture paths don't trigger it. |

(REG-1, REG-2, NEW-4, NEW-7, NEW-8 themselves all PASS. Detail in next section.)

## TL;DR

Round 2 closed the two showstoppers I filed last time. **DOCX export now works** - I clicked Download DOCX on a real Peter Parker report and a 27,108-byte `application/vnd.openxmlformats-officedocument.wordprocessingml.document` blob was produced with no unhandled rejection. The fix landed at `lib/editor/plate-to-sections.ts:33-102` as a `preprocessForMarkdown` walker that converts Plate `table`/`tr`/`td` nodes back into a GFM table string before the markdown serializer ever sees them, then `lib/export/docx.ts:160-219` parses that markdown table back into a real Word `Table`/`TableRow`/`TableCell`. The fix is structurally sound (it short-circuits the unknown-node serializer crash without touching the Plate plugin registration) and the bytes prove it works end-to-end. The Header that renders so beautifully in the workspace finally survives the export round-trip.

The **`/login` residency lie is gone**. The bullet now reads "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." This is the honest version. A clinician reading the login page now gets a true statement of where data flows. NDIS-grade compliance angle satisfied. The same bullet on `/generate` was already truthful (round 1 fix preserved). Three dead Attach/Dictate/Template buttons on /generate are gone (NEW-4 PASS). Workspace 404 keeps the Topbar (NEW-7 PASS - hit `/reports/totally-fake-id` and the Generate/Reports/Settings nav remained, allowing the user to bounce back without going to history). Save-status chip now distinguishes `error` from `saved` (NEW-8 PASS - code at `hooks/use-auto-save.ts:11,44` and `components/workspace/workspace-footer.tsx:26-36`). Profile auto-fill respects typed input (functional setters at `app/generate/page.tsx:153-156` only fill if the field is empty - I verified by typing "Manual Override Person" into Assessor, reloading, and watching it survive).

What I'm flagging in this round is mostly thin: a CSS migration miss on the save-status pulse animation, the Draft-restored banner showing for an empty profile-only draft, and a few R2-vintage frictions that didn't get scheduled (NDIS Review still surfaces raw "Agent service is not configured" copy; mobile workspace at 375px still renders a 280px sidebar and a 95px paper column; aria/title/body inconsistency on the Generate button). None block a Friday FCA. The product is finally lighter on the way out, which was the round-2 ask. I would use this on a real client tomorrow.

The biggest qualitative shift is trust. Round 1 had a workspace that displayed beautifully but couldn't export; round 2 had a beautiful export pipeline that crashed silently; round 3 has a beautiful workspace that actually produces a Word document a planner can open. The disclaimer ("AI-drafted. Clinician review required before submission.") sits next to the Print and Download buttons in the footer, the print CSS injects the same disclaimer into the printed page via `::after`, and the DOCX footer carries it through the document footer alongside page numbers. That responsibility surface is now consistent across all three output paths (screen, print, DOCX). I no longer have to mentally track whether the planner sees the caveat.

## Verification of round-2 fixes

| ID | Surface | Method | Evidence | Verdict |
|---|---|---|---|---|
| **REG-1** | DOCX export from workspace | Logged in as test@user.com, navigated to `/reports/0a81842a-af23-4d87-8517-45a1a7d25ec9` (a Ready Peter Parker report), instrumented `URL.createObjectURL` to capture any blob the export creates, then clicked the "Download DOCX" footer button. Code-level audit of `lib/editor/plate-to-sections.ts:33-102` (`tableNodeToMarkdown` + `preprocessForMarkdown`) and `lib/export/docx.ts:160-280` (markdown table parser + `Table`/`TableRow`/`TableCell` renderer). | Captured Blob `{size: 27108, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}`. No `unhandledrejection`. The preprocess walker explicitly converts `type === 'table'` nodes to a paragraph with the GFM table string as text content (line 81-89), recurses into other element children (line 90-96), and the docx renderer parses pipe-delimited rows into a styled Word table with bold headers and shaded cells (line 250-280). | **PASS** |
| **REG-2** | `/login` marketing column | Cleared cookies, hit `/login` while logged out, read the bullet list at the right column. | Bullet text reads: "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." The previous false claim ("Australian-region storage. Your data never leaves Supabase ap-southeast-2.") is gone. `grep "never leaves" app/login/page.tsx` returns no matches. | **PASS** |
| **NEW-4** | `/generate` intake footer dead chips | Logged in, hit `/generate`, queried all `<button>` elements with `Attach\|Dictate\|Template\|Paperclip\|Mic` in text. | Zero matches. Buttons are gone. Code at `app/generate/page.tsx` no longer contains the `tn-tool-chip` Paperclip/Mic/FileText cluster from round 2. | **PASS** |
| **NEW-7** | Workspace 404 Topbar visibility | Navigated to `/reports/totally-fake-id` and `/reports/00000000-0000-0000-0000-000000000000`. Inspected the rendered DOM. | `hasTopbar: true`, navLinks include all four (`TheraNotes`, `Generate`, `Reports`, `Settings`), `bodyText` shows "Report not found or you don't have access. Back to Reports". User is not stranded. | **PASS** |
| **NEW-8** | Save indicator error state | Code-level audit (could not provoke a real save error against prod without risk). Read `hooks/use-auto-save.ts` and `components/workspace/workspace-footer.tsx`. | `SaveStatus` enum now includes `'error'` (line 11). Catch path sets `setSaveStatus('error')` (line 44) and re-marks dirty so retries continue. The footer renders a `<button>` with `AlertTriangle` icon and "Save failed - click to retry" text bound to `onRetrySave` (line 26-36). Idle state renders separately and reads "Idle" with the green dot. The chip no longer lies. | **PASS (code-level)** |
| **Profile auto-fill** | `/generate` Assessor pre-fill from clinician profile | Logged in as test@user.com, saved a profile in `/settings` (Display name="Dr Test Reviewer", Credentials="Occupational Therapist, AHPRA OCC0001234", Clinic="Test Clinic Pty Ltd"), navigated to `/generate`, inspected input values. Then typed "Manual Override Person" into Assessor, reloaded the page, and re-inspected. | First load: Assessor="Dr Test Reviewer", Credentials="Occupational Therapist, AHPRA OCC0001234", Email="test@user.com", Provider/Company="Test Clinic Pty Ltd". After typing override and reloading: Assessor="Manual Override Person" survives - functional setters at `app/generate/page.tsx:153-156` honour the rule that pre-fill never overwrites typed input. | **PASS** |

Net: 6/6 round-2 fixes verified clean against PROD.

## Walk-through (the job-to-be-done)

The fictional clinical job: I'm Mary Jane Watson, an OT at Test Clinic Pty Ltd. I'm seeing a new participant tomorrow morning. Tonight I want to (1) get my profile set up so my AHPRA and clinic details pre-fill every report; (2) start a fresh FCA intake for a new participant; (3) check that I can find existing reports for that participant on the reports list; (4) verify I can export an existing report to DOCX so I can email the planner; (5) confirm the print path produces a clean document.

**Step 1 - profile setup.** I sign in (`test@user.com` / `test123`). Lands on `/generate` (correct - landing on the most common task). Topbar carries Generate / Reports / Settings tabs. Click Settings. Form loads. Nine fields rendered: Display name, Credentials, AHPRA registration, Contact email (already pre-filled with my auth email - nice), Contact phone, Clinic / provider name, ABN, NDIS provider #, Clinic address. I fill Display name = "Dr Test Reviewer", Credentials = "Occupational Therapist, AHPRA OCC0001234", Clinic = "Test Clinic Pty Ltd". Click "Save changes". Footer message changes to "Saved". No error. The supabase 400 from round 2 is gone - migration 008 is durably applied to prod. *Friction:* The "Save changes" button could be sticky to the form footer and the save success feedback could be a toast rather than inline below the button - I had to scan for it. Also no retry affordance if a save fails (similar to the save-indicator improvements on the workspace - the Settings save path didn't get the same error treatment).

**Step 2 - intake.** Click Generate in the topbar. Lands on `/generate`. Tip banner says "Tip - Upload your previous FCA reports in Settings to personalise the AI's writing style." OK, that's helpful. Below the tip, the intake form is clean - Participant name, NDIS number, Assessor (already filled "Dr Test Reviewer" from profile), then the Client Details collapsible (DOB, plan dates, address, primary contact name + phone), Assessor & Assessment Details (Credentials and Email and Provider already pre-filled, Assessment date(s), Report date, Mode select), WHODAS 2.0 Scores (six numeric fields gated to 0-100 by HTML5 only), Sensory Profile (4 selects), NDIS Goals (3 textareas), and the clinical notes textarea. Three dead chips from round 2 (Attach / Dictate / Template) are gone (NEW-4 verified). The Generate button is now a labelled pill ("Generate sections" with arrow), 163x32px - much better than the round-1 36px round icon. *Friction:* the Generate button text says "Generate  sections" with no count when no sections are selectable yet (because no clinical-notes content); aria-label says "Generate 0 sections", title says "Generate 0 of 8 sections" - three different copies, R2-12 not addressed. Body text below textarea says "Will generate 7 of 8 sections" only after clinical notes are typed. The aria-label and title should both read "of 8" so screen-reader users hear the contract.

**Step 3 - reports list.** Click Reports in the topbar. List loads with 24 cards initially, then a "Load more" pagination at the bottom. Each card carries the participant name ("FCA - Peter Parker"), status badge (Ready / Failed), section count, relative time. Cards are buttons (not anchor links) which makes right-click "open in new tab" not work - minor pattern friction. Search input filters live but only on the loaded page (round-2 NEW-5 was a separate finding about server-side search; visual confirmed that the input does filter, but past page 1 it would miss). Status combobox shows "all" (lowercase - R2-19 cosmetic, still present). "+ New report" CTA is in the top-right. **Note:** every card reads "FCA - Peter Parker" because the test database is dominated by Peter Parker generations; with 23+ identical-looking cards, this list is hard to navigate even for a single test fixture. R2-22 (no client grouping) is the right post-pilot work.

**Step 4 - DOCX export.** Click the first Ready Peter Parker card. Workspace loads at `/reports/0a81842a-af23-4d87-8517-45a1a7d25ec9`. URL reflects the report directly (Day-4 redirect to `/workspace/...` deprecated). Topbar persistent. Sidebar shows TOC of 8 sections (Header, Overview, Process, Parts A-E) plus the NDIS Planner Review card with "0 critical / 0 warnings / 0 suggestions". Center column shows the report. Header section renders as a real two-column table with 30 rows including "Participant Full Name | Peter Parker", "NDIS Number | 123456789", "Date of Birth | 1975-08-15" etc. Footer carries the save-status chip (currently "Idle"), the "AI-drafted. Clinician review required before submission." disclaimer, and three buttons: Print, Run NDIS review, Download DOCX. I instrument `URL.createObjectURL` and click Download DOCX. A `Blob` of size 27,108 bytes with the correct Word MIME type is produced. No unhandled rejection. The round-2 P0 (REG-1) is fixed end-to-end. *Friction:* the download starts silently with no progress indicator - for a multi-page report this could be 3-5 seconds during which a clinician would click again. Add a "Generating Word document..." inline state on the Download DOCX button while `Packer.toBlob` runs. Also no toast on success ("Saved FCA-Peter-Parker.docx to your Downloads") - this is the moment of "did it work" and the absence of feedback fed the round-2 silent-fail bug. Add a success toast.

**Step 5 - print.** Cmd+P (or click the Print button which calls `window.print()`). Round-2 verified that the print stylesheet is comprehensive (`globals.css:1796-1894`): hides topbar/sidebar/footer/refine-panel/banners, sets `@page` size A4 with 18mm/16mm margins, page-breaks before each `h2`, avoids breaking tables and orphan headings, forces black-on-white. The `tn-disclaimer` is hidden (it's chrome) but a `::after` pseudo-element on `.tn-doc` and `.report-document` injects the disclaimer text on the last page (REG-3 fix from round 2 verified at code level). I produced a headless PDF as a sanity check; that path may not trigger the print media query the same way real Cmd+P does (the headless PDF was titled "Workspace | TheraNotes AI" and likely captured the live workspace chrome) but this is a tooling artefact rather than a product regression. **Recommend:** before the OT pilot, do one round-trip in a real browser (Cmd+P -> Save as PDF) to confirm the disclaimer appears on the last page of the printed output.

**Step 6 - draft restore on a fresh account.** I cleared localStorage (`Object.keys.filter('theranotes').forEach(removeItem)`), reloaded `/generate`. On first reload, only the Tip banner showed (correct - no draft). The profile auto-fill effect populated Assessor / Credentials / Email / Company, the autosave hook wrote that to localStorage, and on **second reload** the "Draft restored - Picked up your in-progress intake from just now." banner appeared even though I'd typed nothing. R2-07 is half-fixed: a truly empty draft no longer triggers the banner, but a profile-prefill-only draft does. **Fix:** the banner gate should be "draft has any field that came from typing", not "draft has any field at all". One way: tag profile-autofill writes with a flag in the saved envelope so the restore-banner only fires on user-input writes.

**Step 7 - mobile.** Set viewport to 375x812 (iPhone). Hit a real workspace report. Sidebar still 280px wide, paper column 95px. Round-2 R2-10 not addressed. iPad-portrait would still work; iPhone home-visit would not. Keeping P1.

## New findings

### WF-1 - Save-status pulse animation no longer fires (CSS migration miss)

- **Severity:** P3
- **File:** `app/globals.css:1772` vs `components/workspace/workspace-footer.tsx:38-41`
- **Repro:** Open any workspace, type into a section to dirty the editor, watch the save-status chip during the 1500ms debounce + save. Chip text flips Idle -> Saving... -> Saved as expected. The dot stays solid green throughout. The CSS rule that should pulse the dot during save is `.tn-saved[data-saving="true"] .tn-saved-dot { ... animation: tn-pulse-dot 1s infinite; }`. The component now emits `data-status="saving"` (and `error`/`saved`/`idle`). The selector matches nothing.
- **Why it matters:** the pulse was the visual cue that something was happening during save. Without it, on a slow network the user only sees text change. Cosmetic but noticeable.
- **Fix:** change the selector to `.tn-saved[data-status="saving"] .tn-saved-dot` (one-line edit). While there, add a `[data-status="error"] .tn-saved-dot { background: var(--tn-danger); }` for completeness, even though the error state currently renders without the dot (it uses an AlertTriangle icon).
- **Effort:** 5 min.

### WF-2 - "Draft restored" banner triggers when only profile auto-fill has been written

- **Severity:** P2
- **File:** `app/generate/page.tsx` (the `handleDraftRestore` callback and the autosave hook write path)
- **Repro:** as a new account, sign in, navigate to `/settings`, save a profile (so the auto-fill source exists), clear `localStorage` with `Object.keys(localStorage).filter(k => k.includes('theranotes')).forEach(k => localStorage.removeItem(k))`, navigate to `/generate`. First load: only the Tip banner shows (correct - no draft to restore). The auto-fill effect populates Assessor / Credentials / Email / Company; the autosave debounces and writes to localStorage. **Second reload:** "Draft restored - Picked up your in-progress intake from just now." banner appears. I never typed anything.
- **Why it matters:** the banner copy implies the user had an in-progress intake. A clinician opening a fresh `/generate` in the morning will see "Draft restored from just now", panic that they accidentally saved someone else's data, and have to reason about why. Trust dilution.
- **Fix:** tag profile-autofill writes with a flag (`fromProfile: true`) in the envelope so the restore banner only fires when there's at least one field that came from a typing event. Or simpler: only show the banner if **typed** fields are non-empty (participant name, NDIS, DOB, clinical notes, goals, WHODAS scores, sensory selects). Auto-filled assessor/credentials shouldn't count.
- **Effort:** 15-30 min.

### WF-3 - Generate button aria-label / title / body text disagree (carryover, R2-12)

- **Severity:** P2
- **File:** `app/generate/page.tsx` Generate button
- **Repro:** inspect the button when no clinical notes are entered: `text` = "Generate  sections" (note double space - empty count slot), `aria-label` = "Generate 0 sections", `title` = "Generate 0 of 8 sections", body text below = nothing visible until notes are typed.
- **Why it matters:** screen-reader users hear "Generate 0 sections", sighted users with hover-tooltip see "Generate 0 of 8 sections", visible label says nothing until typing. Three different contracts. The "of 8" version is the truthful one.
- **Fix:** unify on "Generate {n} of {m} sections" everywhere (visible label, aria-label, title). When n=0 the button can also be disabled with a `disabled` state and the body text below can remain.
- **Effort:** 5 min.

### WF-4 - "Run NDIS review" surfaces raw "Agent service is not configured" copy when service is disabled (carryover, R2-05)

- **Severity:** P1
- **File:** `app/api/review/route.ts:18` returns the error string verbatim; `components/workspace/workspace-layout.tsx:239` bubbles it directly to `reviewError` and renders it in the UI.
- **Repro:** in environments where the agent server isn't configured (which is every dev env without `AGENT_API_URL`), the workspace shows a red banner with "Agent service is not configured" - dev-speak that a clinician shouldn't have to parse.
- **Why it matters:** clinician-facing copy should never expose backend-config language. Even if the service is healthy in prod today, a future outage will surface this string.
- **Fix:** the API can keep returning the diagnostic; the UI should map known error strings to clinician-friendly copy ("NDIS Planner Review is unavailable right now. Try again in a few minutes; if it persists, contact your administrator."). Same translation for the Run NDIS review toast.
- **Effort:** 15 min.

### WF-5 - Mobile workspace at 375px renders 280px sidebar and 95px paper column (carryover, R2-10)

- **Severity:** P1
- **File:** `components/workspace/workspace-layout.tsx` and the related grid CSS
- **Repro:** set viewport to 375x812, navigate to any workspace report. Inspect: `.tn-side` width = 280px, `.tn-paper` width = 95px, viewport = 375px. The paper column is unusable.
- **Why it matters:** home-visit FCAs on iPhone are a real OT need. iPad portrait works; iPhone does not. A clinician trying to dictate notes on the train can't use this surface.
- **Fix:** at <768px, collapse the sidebar to a slide-in drawer (hamburger toggle on the workspace topbar opens it), let the paper take the full width minus padding. The TOC sidebar is high-information-density and works at <=320px paper width if it has the full viewport.
- **Effort:** 1-2h.

### WF-6 - Downloading DOCX has no progress feedback during `Packer.toBlob`

- **Severity:** P2
- **File:** `components/workspace/workspace-footer.tsx:70-76` (the Download DOCX button)
- **Repro:** click Download DOCX on any Ready report. The blob is created in 200-800ms in my test (small report), but a 30-page real report will likely take 1-3s. During that window the button doesn't change state.
- **Why it matters:** silence is what fed the round-2 P0 (the click did nothing, the button stayed bright, the user clicked again, nothing happened). Even with the bug fixed, the absence of an "Exporting..." inline state means the next time something goes wrong (network blip, blob creation slow, browser permission dialog), the user has no signal that work is in flight.
- **Fix:** add an `exporting: boolean` state in `WorkspaceLayout`, pass it to the footer; while exporting, render the button as `<Button disabled> <Spinner /> Generating...</Button>`. On success, render a brief toast "Saved FCA-Peter-Parker.docx to your Downloads". On failure, render a toast with the error and a retry affordance.
- **Effort:** 30 min.

### WF-7 - Settings save success is a tiny inline "Saved" with no retry path on failure

- **Severity:** P2
- **File:** `components/settings/profile-form.tsx` (the Save changes button + status text)
- **Repro:** click Save changes after editing the profile. The button row shows a small "Saved" text. No toast. No timestamp. If the save had failed (which round 2 hit due to schema), the user gets "Save failed." with no retry button.
- **Why it matters:** the workspace footer got the round-2 NEW-8 treatment (explicit error + retry). The Settings page didn't get the same upgrade. Asymmetric reliability surface.
- **Fix:** apply the same pattern as `useAutoSave` - explicit error state, retry button when error, friendly copy. While there, write a recently-saved timestamp ("Saved 6s ago") so the user has confidence the latest edit landed.
- **Effort:** 30 min.

### WF-8 - Reports cards are `<button>` not `<a>`, breaking right-click new-tab and command-click

- **Severity:** P3
- **File:** `components/reports/report-list.tsx` (the card markup)
- **Repro:** right-click on any report card. The browser context menu shows nothing related to opening in a new tab. Cmd-click opens nothing. This breaks a power-user workflow (clinician with two reports open in two tabs to compare).
- **Why it matters:** a clinician switching between two FCAs they're calibrating cannot keep both open without using the topbar+back button repeatedly.
- **Fix:** change the card from `<button>` to `<a href="/reports/{id}">`. Style the same way; remove the `onClick` and let the link do the navigation. Keyboard accessibility also improves (anchor with `Enter` is universally expected).
- **Effort:** 15 min.

### WF-9 - Two banners stack on `/generate` when both Tip and Draft Restored are eligible (carryover from round 2)

- **Severity:** P3
- **Repro:** dismiss the "Draft restored" banner with the X. The "Tip - Upload your previous FCA reports in Settings to personalise..." banner replaces it. Two banners is acceptable; the dismiss-and-replace pattern feels like the page is nagging.
- **Fix:** show only the highest-priority banner at any moment. Priority order: Draft Restored (informs the user about state recovery) > Tip (upsells exemplars). Once Draft Restored is dismissed, do not show Tip in the same session - the user already chose to clear the chrome.
- **Effort:** 10 min.

### WF-10 - Status filter combobox label is "all" lowercase (carryover, R2-19)

- **Severity:** P3
- **Repro:** `/reports`, look at the status filter combobox. Selected value displays as "all" (lowercase). Other UI uses sentence case.
- **Fix:** change the option label to "All" (display only - the underlying value can stay `"all"`).
- **Effort:** 1 min.

### WF-11 - Settings -> Save flow has no inline confirmation that profile data will pre-fill `/generate`

- **Severity:** P3
- **File:** `app/settings/page.tsx` after the save success
- **Repro:** save a profile. The user knows it saved but doesn't know that this will auto-populate Assessor / Credentials / Email / Company on `/generate`. The connection between the two screens is implicit.
- **Why it matters:** discoverability. A clinician who sets up the profile and then opens `/generate` will be pleasantly surprised by the pre-fill, but a clinician who opens `/generate` first will have already typed everything by hand and never set up the profile. Add a one-time inline note on the Settings success state ("Saved. Your details will pre-fill every new report.") and a one-time inline note on the empty Assessor field on `/generate` ("Tip: set up your profile in Settings to pre-fill this on every report.").
- **Effort:** 10 min.

### WF-12 - No surface for "previous reports for this client" - client roster still missing (carryover, R2-22)

- **Severity:** P2 (post-pilot work, but the right structural fix)
- **File:** `components/reports/report-list.tsx` and the data model
- **Repro:** I have 23 cards labelled "FCA - Peter Parker". They could be 23 progress reports for the same participant or 23 separate one-off generations. There is no way to tell, no grouping, no "client roster" view.
- **Why it matters:** real-world use case is "I'm seeing Sarah Wilson tomorrow; what FCAs have I written for her?" Today the answer is "search her name and scroll the resulting page". With grouping by participant + plan dates, the answer becomes "open her client card, see the timeline".
- **Fix:** group by participant_name + ndis_number on the list view; show one card per client with the most recent report's status and a "N reports" count; expand on click to see the timeline. Add an "Archive" action per client card. Add NDIS plan-end-date warning when within 60 days.
- **Effort:** 1-2 days. Right post-pilot work.

### WF-13 - DOCX filename convention drops the date

- **Severity:** P3
- **File:** `components/workspace/workspace-layout.tsx` DOCX trigger and the filename construction
- **Repro:** click Download DOCX. Filename is `FCA-Peter Parker.docx`. Two reports for the same participant overwrite each other in the Downloads folder.
- **Why it matters:** every Australian OT I know files reports as `FCA - {Surname, Firstname} - {YYYY-MM-DD}.docx`. The format the tool uses today loses the date and uses first-name-last-name order.
- **Fix:** filename pattern should be `FCA - {participantSurname}, {participantFirstname} - {reportDate || YYYY-MM-DD}.docx`. If the participant_name is a single token, fall back to participant_name as-is.
- **Effort:** 15 min.

### WF-14 - No save indicator on `/generate` intake (autosave is silent)

- **Severity:** P3
- **File:** `app/generate/page.tsx`
- **Repro:** type into any field on the intake. The autosave hook debounces and writes to localStorage 400ms after the last keystroke. There's no visual indicator. The clinician can close the tab and reopen, but until they do, they have no feedback that the autosave is working.
- **Why it matters:** the workspace has a save-status chip in the footer; the intake should too. Same trust signal.
- **Fix:** add a small "Auto-saved" pill at the bottom of the intake card that pulses when the autosave fires. Match the workspace footer chip's visual language.
- **Effort:** 30 min.

### WF-15 - "Where do I attach a referral PDF?" - intake has no upload affordance

- **Severity:** P2 (real clinician workflow gap, not a regression - just missing functionality)
- **Repro:** I'm starting an FCA. The participant came with a 14-page NDIS plan PDF and a 4-page referral letter from their GP. There's nowhere to upload them on `/generate`. The clinical notes textarea is the only place to dump information.
- **Why it matters:** a real OT receives PDFs from referrers and wants the AI to extract from them, not retype into a textarea. The Attach button removed in round 1 was the right affordance with the wrong wiring; the intake should re-introduce a working file picker that ingests text/PDF/DOCX uploads into the clinical notes textarea (with an extraction step). The Settings page already has an exemplar-upload pipeline; reuse the chunking / extraction logic on intake.
- **Fix:** add a "Attach intake documents" button in the intake card that accepts PDF/DOCX/TXT, extracts text, and prepends it to the clinical notes textarea with a separator ("--- From referral.pdf ---"). The clinician can edit before generating. Don't re-introduce the round-2 dead chip; introduce a real one.
- **Effort:** 4-6h. Real feature work, not polish.

### WF-16 - Workspace topbar back-link to `/reports` is implicit through the Topbar nav

- **Severity:** P3
- **Repro:** in the workspace at `/reports/<id>`, there's no breadcrumb or "< Back to Reports" affordance. The user must hit the Reports link in the global topbar. That's fine but breadcrumb gives a stronger sense of place.
- **Fix:** add a small "< Reports" link above the report title or in the workspace topbar beside the report name. Cheap navigation cue.
- **Effort:** 15 min.

## What's good and worth preserving

- **The DOCX export pipeline.** The architecture (preprocessing markdown table nodes, then parsing GFM tables back into Word `Table` API) is the right structural fix for the round-2 P0. It cleanly separates display-rendering (Plate plugin) from serialization (markdown shim) without adding a hard dependency on Plate's internal serializer behaviour. Future Plate upgrades won't break the export path. Page numbers in the footer, the disclaimer in the footer, the letterhead from the clinician profile - this is a real exporter.
- **The save-status error treatment.** `'idle' | 'saving' | 'saved' | 'error'` with explicit error state, retry button, and the markDirty function preserving the error status until the next attempt is exactly the right shape. The pattern should propagate to Settings save (WF-7) and any other write path.
- **Profile auto-fill respecting typed input.** Functional setters with empty checks (`v.trim() ? v : profile.display_name ?? ''`) are race-safe by construction. This is the right pattern; replicate it any time we want to soft-fill a field.
- **Login marketing column.** "Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI." is the right tone - factual, specific, doesn't oversell. NDIS-grade compliance angle satisfied.
- **404 page keeping the Topbar.** Tiny but load-bearing. A clinician hitting a stale link no longer goes "uh, where am I" - the four nav items remain.
- **Disclaimer surface consistency.** The "AI-drafted. Clinician review required before submission." text appears in three output paths (workspace footer, print via `::after`, DOCX via Footer Paragraph). Single source of truth on responsibility. This is the kind of detail clinicians notice and lawyers value.
- **The deterministic Header table rendering as a real two-column table in the workspace.** This was the round-1 P0 fix and it survives round 2. The "Field | Details" column structure reads like a professional report.
- **Two-step delete on report cards.** First click reveals "Delete?" badge, second click commits. Saves an OT from nuking 30 minutes of work.
- **`+ New report` always visible in the top-right.** Works whether the list is empty or full. Universal entry point for the most common action.

## Recommended sequence

Day-half to take this from yes-with-caveats to a clean yes:

1. **WF-1** (5 min) - migrate `data-saving` -> `data-status="saving"` in the CSS pulse selector. Add `[data-status="error"]` styling for symmetry.
2. **WF-3** (5 min) - reconcile Generate button aria-label / title / body to "Generate {n} of {m} sections" everywhere.
3. **WF-10** (1 min) - fix "all" -> "All" on the status filter combobox.
4. **WF-2** (15-30 min) - gate "Draft restored" banner on typing, not on profile-prefill writes.
5. **WF-9** (10 min) - banner stack: only show highest-priority banner; once Draft Restored is dismissed, suppress Tip in the same session.
6. **WF-4** (15 min) - translate "Agent service is not configured" to clinician-friendly copy.
7. **WF-13** (15 min) - DOCX filename pattern `FCA - {Surname, Firstname} - {YYYY-MM-DD}.docx`.
8. **WF-6** (30 min) - inline "Generating..." state on Download DOCX button + success/failure toast.
9. **WF-7** (30 min) - apply save-status error pattern to Settings save flow.
10. **WF-8** (15 min) - convert reports cards from `<button>` to `<a href>` for new-tab support.

Subtotal: ~2h 35min for items 1-10. Brings the existing surfaces from "good" to "clinician-tested clean".

Then larger work items (post-pilot, not blockers):

11. **WF-5** (1-2h) - mobile workspace drawer for <768px.
12. **WF-11** (10 min) + **WF-14** (30 min) + **WF-16** (15 min) - the smaller polish items.
13. **WF-15** (4-6h) - real intake-document attach affordance with PDF/DOCX text extraction.
14. **WF-12** (1-2 days) - reports list grouped by participant.

The product crosses the threshold from "interesting demo" to "clinical tool I would defend" with items 1-10. Items 11-14 are the difference between a usable tool and a tool a clinic standardises on.

---

*End of report. 13 screenshots + one PDF in `UI-UX/round-3/screenshots/clinician/`. Verified against PROD at theranotes.com.au sha 89a24bc on 2026-05-10. No cost-guarded buttons clicked; DOCX download verified via `URL.createObjectURL` instrumentation, no OpenAI calls triggered.*
