# Clinician Workflow Review - Round 2

**Reviewer:** Senior OT, 15+ years NDIS practice. Returning beta tester.
**Date:** 2026-05-10
**Build under review:** localhost:3001 (current main, dev mode)
**Method:** Drove the live UI as a real clinician would, with the Peter Parker reference. Did not click Generate or Refine (cost-controlled). Tested every other interactive element. Screenshots in `/tmp/clinician-r2/` (33 captured). Cross-checked against `00-CONSOLIDATED-PUNCH-LIST.md` and `02-clinician-workflow-review.md`.
**Audience:** non-clinician founder. Clinical needs translated into product requirements.

---

## 1. TL;DR for the founder

Rounds 1 and 2 together show genuine progress on the surface. The product now feels like a deliberate clinical tool rather than a demo. The intake page is polished, the workspace renders the deterministic Header beautifully, autosave actually works, the topbar is consistent, the avatar menu no longer crashes. That is real progress.

But two of the largest items shipped this batch are quietly broken in the running environment, and one is broken at the code level:

1. **DOCX export throws `Cannot handle unknown node 'table'` and silently fails.** The Header section is a Plate table block, and the markdown serializer used by `plateToSections` does not have a handler for `table` nodes. Click "Download DOCX" - nothing happens, no error message, no file. This is the load-bearing deliverable to NDIS. P0.
2. **Settings Profile saves return 400 from Supabase.** Migration `008_clinician_profile_fields.sql` is in the repo but has not been applied to the live dev database. So the new Profile UI loads but cannot read, cannot save, cannot pre-fill anything on `/generate`. From a clinician perspective the Profile feature does not work at all. P0 in current environment.
3. **Login marketing column still says "Australian-region storage. Your data never leaves Supabase ap-southeast-2."** The same false claim was supposedly removed in the overnight punch list but it was only removed from `app/generate/page.tsx`. The login page still asserts it. For NDIS-grade clinical software this is a compliance risk. P0.

Net: I would not use this on a real client tomorrow. With the DOCX bug fixed and the migration applied, I would.

---

## 2. Verification table (the 15 shipped items)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Workspace markdown tables render properly | **VERIFIED** | `10-workspace.png`, `25-ndis-panel.png` - Header table renders as a clean two-column "Field / Details" grid. Reads like a professional report. Lines like "Participant Full Name | Peter Parker" are correctly tabulated, not stacked vertically. Plate now uses `TablePlugin` (`lib/editor/report-to-plate.ts:18`). |
| 2 | Persistent Topbar on /workspace, /settings, /generate, /reports | **VERIFIED** | `02-generate-after-login.png`, `04-settings.png`, `06-reports-list.png`, `10-workspace.png` - all four routes show the Topbar. Code: `Topbar` imported in `app/generate/page.tsx`, `app/reports/page.tsx`, `app/settings/page.tsx`, and embedded in `components/workspace/workspace-layout.tsx:317`. |
| 3 | Quick-add chips removed from /generate | **VERIFIED** | `02-generate-after-login.png` - no `+Sensory / +Scores / +Mental health / +Goals` chips. Comment at `app/generate/page.tsx:1125` confirms removal: "Quick-add chips removed (Day 1 review)". |
| 4 | Dead workspace buttons removed (Find, Appendices, Signatures) | **VERIFIED** | `10-workspace.png` - sidebar shows only sections + NDIS Planner Review card. Code comment at `components/workspace/toc-sidebar.tsx:96` confirms. The sentence in `workspace-layout.tsx:340` even self-documents the dead Find button removal. |
| 5 | Avatar menu no longer crashes | **VERIFIED** | `03-avatar-menu.png` - menu opens cleanly, shows test@user.com and Sign out. Stress-tested with 6 rapid open/close cycles, no errors thrown. Escape closes the menu. No `MenuGroupRootContext` error. |
| 6 | Sparkles icon used only for AI actions | **VERIFIED** | `15-floating-toolbar.png` - Sparkles only on Refine button. `grep -rn "Sparkles"` returns 4 files: `editor-toolbar.tsx` (Refine), `flag-popover.tsx` (Apply fix), `progress-screen.tsx` (generation in progress), `refine-panel.tsx` (Refine panel). Brand mark in `components/layout/topbar.tsx:21` is `<Stethoscope size={16}/>`. |
| 7 | Native `<select>` replaced with Select primitive on /generate | **VERIFIED (with caveat)** | `18-mode-select-popover.png` - Mode dropdown is a Base UI Select (custom span markup confirmed via `html @e21`). The Status filter on /reports is also a custom combobox. Caveat: in the headless test the popover did not visibly open after click - I cannot confirm popover keyboard navigation works as expected because the dropdown stayed visually flat in headless mode. Visual verification by a human in a real browser is recommended. |
| 8 | Real login screen with two-column branded layout | **VERIFIED** | `01-root.png` - left column has TheraNotes logo, headline "NDIS-grade Functional Capacity Assessments, drafted in minutes", three bullet selling points. Right column has email/password card with the brand stethoscope icon and "Internal clinician access only." subtitle. Looks like a credible internal product. |
| 9 | /generate autosaves to localStorage with "Draft restored" banner | **VERIFIED** | `17-generate-with-draft.png`, `20-after-reload-restore.png` - storage key `theranotes:generate:draft:<userId>` writes a JSON envelope with `state`, `savedAt`, `v: 1`. After page reload all 13 fields restored verbatim including 288-character clinical notes textarea. Banner text: "Draft restored. Picked up your in-progress intake from just now." with a working dismiss X. Race-safe: profile autofill uses functional setters that do not overwrite typed values (`app/generate/page.tsx:156-159`). |
| 10 | Settings has Profile section, fields pre-fill /generate Assessor | **NOT FIXED (env bug)** | `04-settings.png`, `05-settings-after-save.png` - Profile UI is built (Display name, Credentials, AHPRA, Email, Phone, Clinic name, ABN, NDIS provider #, Address). Code is correct: `lib/profile.ts` reads/upserts; `app/generate/page.tsx:148-167` pre-fills Assessor from profile. **But the live Supabase returns 400 to both reads and writes** (network log: `clinician_profiles?select=...&user_id=eq.... -> 400`). On Save the UI says "Save failed.". The new columns (display_name, credentials, ahpra_registration, contact_email, contact_phone, clinic_name, clinic_abn, ndis_provider_number, clinic_address) from `008_clinician_profile_fields.sql` were never applied to the dev database. Functionally the feature does not work. |
| 11 | DOCX export with letterhead, markdown rendering, page numbers, footer disclaimer | **REGRESSED / BROKEN** | The new `lib/export/docx.ts` is a real implementation: 329 lines, parses markdown headings/lists/tables/bold, adds clinic letterhead, page numbers, and a footer disclaimer. **However** clicking "Download DOCX" throws an unhandled promise rejection: `Cannot handle unknown node 'table'`. Captured stack via `unhandledrejection` listener in `30-h2-click.png` console output. The error is in the upstream serializer at `editor.api.markdown.serialize` (`lib/editor/plate-to-sections.ts:28`). The Plate `TablePlugin` registers a render handler but no markdown-serialize handler. So every report containing the deterministic Header table (every report) cannot be exported. **No file is downloaded. No error is shown to the user.** This is the most important deliverable and it is silently broken. |
| 12 | Print produces clean output (no UI chrome) | **VERIFIED** | `13-print-emulated.png` - emulated print CSS hides topbar/sidebar/footer/floating toolbar/popovers/banners. `globals.css` has two `@media print` blocks: one configures `@page` size A4 with 18mm/16mm margins; the other tightens table break-inside and heading break-after. Generated PDF (`12-print-preview.pdf`) is 36KB, 1 page in headless (real browser would paginate to ~30 pages on this report). |
| 13 | Reports list has search, status filter, "+ New report" always visible, Load more | **VERIFIED** | `06-reports-list.png`, `09-search-empty.png` - "+ New report" pill top-right, search input "Search by participant name...", status filter combobox "all", "Load more" pagination at bottom. Search filters live (typed "ZZZ_NOMATCH" -> "No reports match this filter."). "Load more" doubled the visible count from 24 -> 48 cards. The list still has no client grouping, no per-OT column, but the basic pagination contract is in place. |
| 14 | /workspace/<id> redirects to /reports/<id> (308 permanent) | **VERIFIED** | `curl` confirmed `308 -> /reports/<id>`. Followed in browser: `goto /workspace/...` -> URL becomes `/reports/...`. SEO-safe permanent redirect; old links keep working. |
| 15 | Clinical responsibility disclaimer in workspace footer | **VERIFIED** | `10-workspace.png` shows "AI-drafted. Clinician review required before submission." next to Print/Run NDIS review/Download DOCX buttons. Code at `components/workspace/workspace-footer.tsx:33`. Title attribute provides extended context: "The clinician retains full responsibility for the report's clinical accuracy, including any AI-drafted content." This is exactly the trust-signal a clinician needs and is well-positioned next to the export action. |

**Summary:** 11 of 15 verified clean, 1 verified with caveat, 1 not fixed (env bug), 1 regressed/broken, 1 partially regressed (item #16 below).

---

## 3. New bugs and frictions found in Round 2

Severity rubric: **P0** = ship-blocker, **P1** = serious friction or trust break, **P2** = polish, **P3** = nice-to-have.

### P0 - export silently fails

**Bug R2-01. DOCX export throws unhandled promise rejection on every report containing a markdown table.**
- File: `lib/editor/plate-to-sections.ts:28`, `lib/export/docx.ts`, `components/workspace/workspace-layout.tsx:245-258`
- Repro: Open any report -> click Download DOCX -> nothing happens. No file. No toast. No error.
- Stack (captured via `window.unhandledrejection`):
  ```
  Cannot handle unknown node `table`
    at Object.unknown ... node_modules_06r7qu6._.js:21501:11
    at Object.one [as handle] ... node_modules_06r7qu6._.js:19246:23
    at containerFlow ... node_modules_06r7qu6._.js:21143:41
    at toMarkdown ... node_modules_06r7qu6._.js:21462:24
  ```
- Why: The Plate `TablePlugin` renders tables in the editor (good), but the Plate `MarkdownPlugin.serialize` has no handler registered for the `table` node type, so when `plateToSections` calls `editor.api.markdown.serialize({ value: currentNodes })` on the Header section it throws synchronously inside the awaited promise.
- Fix path: register a markdown table serializer with the Markdown plugin, OR convert the Header section to definition-list rows on the way into the editor and back on the way out. The deterministic Header builder also has all the field/value pairs in a typed structure; you could short-circuit the export and write the Header table directly with the `docx` Table API, bypassing the markdown roundtrip entirely.
- Consequence: every clinician click of "Download DOCX" since this bug shipped has produced silence. Clinicians will conclude "the export button is broken" and stop trusting the tool.

**Bug R2-02. Settings Profile reads and writes return Supabase 400 - migration 008 not applied to dev DB.**
- File: `lib/profile.ts`, migration `supabase/migrations/008_clinician_profile_fields.sql`
- Repro: open `/settings`, see "Failed to load profile." next to the Save button on first load. Fill form. Click Save changes. See "Save failed.".
- Network: `GET .../clinician_profiles?select=user_id,display_name,credentials,...&user_id=eq.<id> -> 400 (109 bytes error body)`. Same shape on POST upsert.
- Why: The select string requests columns added by migration 008 (`display_name`, `credentials`, `ahpra_registration`, `contact_email`, `contact_phone`, `clinic_name`, `clinic_abn`, `ndis_provider_number`, `clinic_address`). Migration file exists in the repo but has not been applied to the running Supabase project.
- Fix path: run `supabase db push` against the dev project (or `supabase migration up` depending on workflow). Add a CI step that applies pending migrations before merge.
- Consequence: feature 10 ships invisible. The Profile UI is real, the pre-fill code is real, but a clinician cannot save anything. Worse, the failure messages are vague ("Failed to load profile", "Save failed.") with no diagnostic. Item 4 of the Group A clinician must-fix list ("Per-OT profile in Settings") therefore reads as shipped in the punch list but is not actually working.

**Bug R2-03. Login marketing column still claims "Australian-region storage. Your data never leaves Supabase ap-southeast-2."**
- File: `app/login/page.tsx:91`
- Repro: open `/login` while logged out, read the left column third bullet.
- Why: The overnight fix removed the same misstatement from `app/generate/page.tsx:1072` but the login page has its own copy of the marketing claim. It was missed.
- Compliance angle: the claim is materially false. Even if Supabase tenant lives in ap-southeast-2, every report generation sends prose, identity fields, and clinical notes to OpenAI's APIs (US-resident by default). Asserting on a clinical product's login page that data "never leaves" Supabase is a false statement of fact a participant or planner could rely on.
- Fix path: replace the bullet with something honest about data flow ("Your reports are stored in our Australian database; AI drafting uses OpenAI's hosted models" or similar). Or remove the bullet and make a different selling point.
- Consequence: P0 because it is on the public-facing screen every clinician sees on first login.

### P0 - dead-button regression on /generate

**Bug R2-04. Three new dead buttons on /generate intake footer: Attach, Dictate, Template.**
- File: `app/generate/page.tsx:1094-1110`
- Repro: open `/generate`. Look at the bottom bar of the intake card. Click any of the three pill chips ("Attach", "Dictate", "Template"). Nothing happens.
- Code reads:
  ```jsx
  <Button variant="ghost" size="sm" className="tn-tool-chip" title="Attach...">
    <Paperclip size={14} /> Attach
  </Button>
  <Button variant="ghost" size="sm" ... title="Dictate">
    <Mic size={14} /> Dictate
  </Button>
  <Button variant="ghost" size="sm" ... title="Use a template">
    <FileText size={14} /> Template
  </Button>
  ```
- No `onClick`. The same pattern that was rightly purged from the workspace (Find, Appendices, Signatures) has reappeared on the intake. A clinician will click these because the affordances look real - and conclude the page is half-broken.
- Fix path: either wire them up (Attach should open a file picker; Dictate should request mic; Template should open a saved-templates picker) or delete them. If they are placeholders for Phase C, hide them behind a feature flag and do not render them.
- Severity: P0 because dead affordances are a trust-killer in a tool that is already asking the clinician to trust AI output. Same severity rationale as the original Find/Appendices/Signatures call.

### P1 - silent error states

**Bug R2-05. NDIS Review panel still shows raw "Agent service is not configured" error copy.**
- File: `app/api/review/route.ts:18-20` (raw API error) plus the workspace banner that renders it
- Repro: open any report -> click NDIS Review header tab -> banner says "Agent service is not configured" in red.
- Identical to round 1 finding. Punch list item #10 (P0 trust killer) still untouched.
- Fix path: the API can keep returning the diagnostic; the UI should translate to "NDIS Planner Review is not available in this environment. Ask your administrator to enable the review service." Same change for the toast on Run NDIS review.

**Bug R2-06. Save errors on Settings are dev-speak, not clinician-speak.**
- File: `app/settings/page.tsx` (the toast / inline message)
- "Failed to load profile." and "Save failed." with no further detail.
- Fix: friendlier copy, an inline link to "retry", and a console-friendly logger that doesn't surface the raw 400 body to the user.

**Bug R2-07. The "Draft restored" banner shows even when the saved draft is empty.**
- File: `app/generate/page.tsx` (the `restoredAt` state setter)
- Repro: visit `/generate` for the first time as a new account. The autosave hook writes an empty-state envelope on mount. Subsequent reload shows "Draft restored - Picked up your in-progress intake from 6 minutes ago." even though no real fields were typed.
- Fix: only set `restoredAt` if the loaded draft has at least one non-empty field, OR write to localStorage only when the user has actually typed.

### P1 - validation gaps still present

**Bug R2-08. WHODAS scores accept >100 and <0 (HTML5 only validates on submit, the form does not block typing).**
- File: `app/generate/page.tsx` WHODAS spinbutton inputs
- Verified empirically: typed 150 and -10 into Understanding and Mobility fields. `input.value = "150"`, `input.checkValidity() = false`, but state was happily saved into `localStorage.theranotes:generate:draft.state.whodasUnderstanding = "150"`.
- Fix: clamp on change (`onChange={e => setX(clamp(parseInt(e.target.value) || 0, 0, 100))}`) or show an inline error; absolutely do not let invalid values reach generation. WHODAS interpretation is grounded in a 0-100 disability percentile - 150 is clinically nonsense and would derail a Part D narrative.

**Bug R2-09. DOB input has no min/max - year 1820 is accepted as valid.**
- File: `app/generate/page.tsx` DOB input
- Verified: `input.checkValidity() = true` for value `1820-01-01`.
- Fix: set `min="1900-01-01"` and `max={today}` on all date inputs (DOB, plan dates, assessment date, report date). Plan end before plan start should warn. Report date in the future should warn.

### P1 - mobile + small viewport

**Bug R2-10. Workspace at 375x812 (mobile) is broken.**
- File: `components/workspace/workspace-layout.tsx` and the related CSS
- Repro: `viewport 375x812` then open any report. Sidebar takes the full width, the document column is pushed off-screen. (`28-workspace-mobile.png`).
- Real OT need: home-visit intake on iPad. The intake page works at iPad portrait. The workspace does not.
- Fix: at < 768px collapse the sidebar by default (slide-in drawer) and let the document use full width.

**Bug R2-11. Generate button is a 36px round arrow icon for a $1+, 90-second action.**
- File: `app/generate/page.tsx` Generate button
- Verified: `class="... size-8 rounded-full"`. `aria-label="Generate 7 sections"`. `title="Generate 7 of 8 sections"`.
- Same problem as the round 1 visual reviewer flagged. The action is high-cost and high-stakes; the affordance is a 32x32 chevron. A new clinician opening this page would not parse what the button does without hovering for a tooltip.
- Fix: pill button reading "Generate 7 of 8 sections ->" with the arrow as a trailing icon, sized at least 40px high with horizontal padding. Match its visual weight to its action weight.

**Bug R2-12. Aria-label and title attribute on Generate button disagree.**
- `aria-label="Generate 7 sections"` (says 7)
- `title="Generate 7 of 8 sections"` (says 7 of 8)
- Body text below the textarea says "Will generate 7 of 8 sections."
- Pick one. Screen-reader users hear different copy than sighted users, and the aria string drops the contract ("7 of 8 implies 1 will skip - I should know which").

### P2 - smaller frictions

**Bug R2-13. The "Tip: upload your previous FCA reports in Settings" banner reappears after the Draft Restored banner is dismissed.**
- File: `app/generate/page.tsx`
- Repro: dismiss the Draft Restored banner -> the older Tip banner replaces it.
- Two banners stacking on every visit feels like a tutorial that won't shut up. Pick one banner per page state, or coalesce into one.

**Bug R2-14. The default favicon is still the generic Next.js mark.**
- File: `app/favicon.ico` (25KB - default Next.js asset)
- Punch list called this out (item #21) as part of the Day-1 brand floor. Not addressed.

**Bug R2-15. Tab order through the WHODAS section is correct but every spinbutton has no visible label collision with its placeholder, only the small all-caps label above the input. A screen reader announces the long aria-label but a sighted clinician needs to slow down to map "Understanding & Communicating" to score 42.**
- Minor. Consider always-visible labels at slightly larger size on the WHODAS row.

**Bug R2-16. The "Cmd+S" keyboard shortcut triggers the browser save-page dialog, not an in-app save.**
- File: workspace editor
- Saves are debounced and automatic, so this is not strictly broken, but a clinician used to Word will instinctively hit Cmd+S. Either swallow the event (preventDefault) and show a "Saved" flash, or document elsewhere that saves are automatic.

**Bug R2-17. No global Cmd+K command palette or recent-items dropdown.**
- Original IA finding (#26 in punch list). Not addressed. Low severity; would help a power-user OT navigate between clients quickly.

**Bug R2-18. Clinician profile pre-fill silently fails on /generate even when Supabase is healthy.**
- File: `app/generate/page.tsx:148-167`
- The wiring catches all errors and is silent ("Silent - auto-fill is a convenience, not a requirement."). With migration 008 unapplied, the catch swallows every 400 and produces no signal. A clinician who saved Profile yesterday and gets no pre-fill today has no way to know why.
- Fix: surface a one-time toast when `fetchProfile` throws ("Could not load profile - your saved details will not pre-fill until this is resolved").

### P3 - polish

**Bug R2-19. The `/reports` list status combobox label is "all" lowercase. Other UI uses sentence case ("All").**
**Bug R2-20. The two-step delete (click trash -> "Delete?" badge -> click again) is invisible until hovered. Add a short pulse/animation when the confirming state is entered.**
**Bug R2-21. The "N" Next.js dev indicator overlaps the NDIS Planner Review chips at bottom-left of the workspace sidebar in dev mode. Not present in production builds, so cosmetic.**
**Bug R2-22. Report card titles all read "FCA - Peter Parker" with no client de-duplication. With 24 cards, every visible card is identical text. The list is unusable past a few clients without grouping.**

---

## 4. The Day-3 / Day-4 features in detail

### DOCX letterhead (Day 3)

The implementation in `lib/export/docx.ts` is well-thought-through:
- Letterhead block driven from the clinician profile: clinic name (bold, 13pt), then a subline of address + email (10pt grey, with bottom border).
- Title centered as `Document.HeadingLevel.TITLE`.
- Each section as Heading 2 with a faint underline.
- Markdown paragraphs handled.
- Page numbers in the footer, right-aligned as "Page X of Y".
- Footer disclaimer text on every page.
- Filename convention `FCA-${participantName}.docx` matches Australian OT conventions reasonably well (better would be `FCA - ${Surname, Firstname} - ${YYYY-MM-DD}.docx` but this is fine for Round 2).

If the markdown table serializer crash were fixed, this would be a strong export. As shipped it produces zero documents because the first section has a table and the serializer dies before reaching `Packer.toBlob`.

The export also depends on the clinician profile (`fetchProfile`) which currently returns null due to the Supabase 400 - the export gracefully degrades to header-less output, which is good defensive design. Once the migration is applied and the profile is real, the letterhead will populate.

**Day 3 verdict:** great architecture, fatal bug in the upstream serializer, dependent on a feature (profile) that does not work yet. Net: not usable.

### Print CSS (Day 3)

`globals.css` has a focused print stylesheet:
- `@page { size: a4; margin: 18mm 16mm; }` - correct A4 margins for an Australian clinical report.
- Hides `.tn-topbar`, `.tn-side`, `.tn-ws-topbar`, `.tn-footer`, `.tn-sel-toolbar`, `.tn-refine-panel`, `.tn-popover`, `.tn-banner`, `.tn-disclaimer`, `nav`, `header.tn-topbar`. Comprehensive.
- Tables use `break-inside: avoid` so the Header doesn't split awkwardly.
- Headings use `break-after: avoid` so a Heading 2 doesn't strand at the bottom of a page.

Tested by emulating print media in the browser - the document area appears clean, chrome is gone, the report content reads like a printable manuscript. The print contract is well-met.

**Day 3 verdict:** real polish here. This is shippable.

### Reports list (Day 4)

The list is now functional in a way it was not in Round 1:
- Search by participant name - works, instant filter.
- Status filter combobox ("all", presumably "Ready" / "Failed" / "Generating") - opens correctly though I could not visually confirm the popover in headless.
- Pagination via "Load more" - confirmed working (24 -> 48 cards on click).
- "+ New report" pill always visible top-right.
- "Clear N failed" cleanup utility for dev hygiene.
- Two-step delete confirmation prevents accidental nukes.
- Card metadata: status badge, section count, relative time. Clean.

What is still missing:
- No client grouping. With 48 cards labelled identically ("FCA - Peter Parker"), the list is visually homogeneous. Once Hayley's clinic has real clients, the list needs grouping (one card per client, expand for that client's reports).
- No NDIS#, no plan-end-date urgency indicator, no owning OT.
- No "+ New report" CTA appears in the empty state of an empty filter result (just "No reports match this filter.").
- No bulk actions (archive, export ZIP).

**Day 4 verdict:** the basic list contract is in place and the UX is reasonable. The structural shift to a client roster is still outstanding and is the right post-pilot work.

### URL redirect /workspace -> /reports (Day 4)

Implementation: 308 permanent redirect at `app/workspace/[id]/route` (or middleware). Tested with `curl -I` - returns `308 Permanent Redirect` with `location: /reports/<id>`. Tested in browser - URL transparently rewrites. Old links keep working. Excellent.

**Day 4 verdict:** clean. URL hierarchy is now sensible (`/reports` is the index, `/reports/<id>` is the detail).

---

## 5. What it now feels like to use - narrative

I came back to this expecting to find more bugs than fixes, because that is the usual pattern with a "five things shipped overnight" claim. I was pleasantly surprised. The intake page now feels like a deliberate clinical tool. The topbar is consistent across every authenticated route. The avatar menu opens, holds together under repeated clicks, and closes on Escape - basic but missing-in-Round-1. The login page is genuinely on-brand: a stethoscope mark, an internal-clinician access bullet pattern, the right Inter+Urbanist type pairing. The two-step delete on report cards stops me from nuking 30 minutes of OT work with one accidental click. The autosave actually works - I closed the tab, reopened, and Peter Parker, his NDIS number, his DOB, his address, his clinical notes, his goals were all where I left them. The "Draft restored" banner is the right small ceremony for that recovery. The deterministic Header table now renders as an actual table in the workspace, not a flat vertical pile of strings - the single biggest fix from Round 1, and it works.

The disclaimer next to Export is a small thing that matters to me. "AI-drafted. Clinician review required before submission." Sitting in the same row as the Print and Download buttons, it sets the right contract. I am the one signing this report. Good.

But then I tried to do the thing the tool exists to do: get a Word document I can email to the planner. I clicked Download DOCX. Nothing happened. No spinner, no error toast, no file in Downloads. I clicked again. Still nothing. I checked the console - silent unhandled promise rejection: `Cannot handle unknown node 'table'`. The same Header table that renders so beautifully in the workspace is what blows up the export. Every report this tool has ever produced cannot be exported to DOCX while this bug is live. That is not a polish issue. That is the product not doing the one thing it exists to do.

Then I tried to set up my Profile in Settings - my AHPRA, my email, my clinic name, the things that should pre-fill every report so I don't retype "Mary Jane Watson, Occupational Therapist, AHPRA: OCC0001234" into every intake. I filled the form. Clicked Save changes. "Save failed." in red. No further detail. No way to know whether the schema is wrong, whether my session is expired, whether Supabase is down. I am locked out of the very feature that was supposed to fix the round-1 complaint about being one-of-many-clinicians.

So would I use this on a real client tomorrow? No - and not because the surface is bad, but because the two load-bearing operations are silently broken. I would generate a report, edit it in the workspace (which is genuinely good), then either watch the export do nothing or fall back to copy-pasting the entire 30-page document into Word by hand. The autosave is a safety net but not a deliverable. The disclaimer is honest but not enough. The Run NDIS Review button still says "Agent service is not configured" in dev-speak red.

Two changes flip my answer from no to yes:

1. **Apply migration 008 to the dev database, and write a CI step that fails the build if migrations are pending.** The Profile feature instantly becomes real, the pre-fill works, the letterhead populates. This is a 10-minute operational fix.

2. **Fix the markdown table serializer in DOCX export.** The cleanest fix is probably to detect the table block, render it directly with the `docx` Table API, and skip the markdown roundtrip. The deterministic Header builder already has the data in a structured shape - you do not need to roundtrip it through markdown at all. Once this lands, every report can be exported.

Both fixes are small and bounded. Neither requires a Round 3 design pass. They just need to be done before the next clinician sits down with the tool.

The intake page is still the strongest part of the product, and Round 2 made it stronger. The workspace is now genuinely usable - sections jump correctly, the Plate editor accepts edits, undo works, the floating toolbar is clean, the disclaimer reads true. The reports list has a search and a filter and pagination. The avatar menu opens. The login is on-brand. Five real wins.

But the two broken pieces are the two pieces a clinician most needs to trust. Fix those and I will use this on Friday.

> "I want a tool that gets out of the way and lets me do the clinical reasoning. Round 2 made it lighter on the way in. Now make it lighter on the way out."

- A real OT, every Friday at 4pm.

---

## 6. Recommended fix order for Round 3

1. **Apply migration 008 to dev Supabase.** Operational. Unblocks Profile + pre-fill + DOCX letterhead. (10 min.)
2. **Fix DOCX export table serialization.** Either register a table handler with the markdown serializer or short-circuit the Header section through the `docx` Table API. (1-2h.)
3. **Remove the false "Australian-region storage" claim from `app/login/page.tsx:91`.** Replace with an honest data-flow statement. (5 min.)
4. **Wire or delete Attach / Dictate / Template buttons on /generate.** Delete them for now if not implemented. (15 min.)
5. **Translate "Agent service is not configured" to clinician-friendly copy.** (15 min.)
6. **Add `min="1900-01-01" max="today"` to date inputs; clamp WHODAS scores 0-100 on change.** (30 min.)
7. **Conditionally show Draft Restored banner only when there is real saved data.** (10 min.)
8. **Mobile workspace: collapse sidebar by default at < 768px.** (1-2h.)
9. **Resize Generate button to a labelled pill matching its action weight.** (30 min.)
10. **Reconcile Generate button aria-label / title / body text - all should say "Generate N of M sections" consistently.** (5 min.)

Total: a focused half-day brings the product from "interesting demo with two silent breaks" to "I can use this Friday on a real client".

---

*End of report. 33 screenshots in `/tmp/clinician-r2/`. Cross-checked verification table against repository code at `lib/`, `components/`, `app/`, `supabase/migrations/` as of 2026-05-10.*
