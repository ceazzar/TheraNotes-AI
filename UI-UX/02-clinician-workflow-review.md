# Clinician Workflow Review — TheraNotes-AI Beta

**Reviewer:** Senior OT, 15+ years, FCAs weekly. Beta tester for an internal Flourish Health productivity tool.
**Date:** 2026-05-10
**Build under review:** localhost:3000 (current main)
**Method:** drove the live UI as a clinician with the Peter Parker reference notes. Did not click Generate. Screenshots stored in `/tmp/clinician-review/`.
**Audience:** non-clinician founder. I have translated clinical needs into product requirements.

---

## TL;DR — punch list

The tool is closer than I expected. The intake page is intelligent and the staged-generation UX (only generate the sections you have data for) is genuinely good. But the rest of the surface around the AI - the things a clinician spends 90% of her time on - is missing or broken in ways that will block daily use across a 3-5 OT team.

If I were grading this as "ready to live with on Monday morning":

| Area | Rating | Comment |
|---|---|---|
| Login | 6/10 | Works. No "where do I start" landing. Lands me on /generate with no orientation. |
| Intake form | 7/10 | Smart staged-generation logic. Form is clean. Progressive disclosure works. Has small friction issues described below. |
| Reports list | 3/10 | No search, no filter, no client grouping. 58 failed Peter Parker shells from testing. I can't find anything in 3 clicks. |
| Workspace (post-gen) | 5/10 | Editor exists. Section nav exists. Markdown tables render as flat vertical text. No timestamps, no "what changed", no AI provenance. |
| Settings | 2/10 | Only RAG exemplar uploads. No clinic name, no AHPRA, no default assessor, no per-OT preferences. |
| Trust signals | 2/10 | No "generated at...", no model used, no exemplar provenance, no clinical responsibility disclaimer at draft level. |
| Crash on user menu | 0/10 | Clicking my own avatar throws an unhandled `MenuGroupRootContext is missing` runtime error. This is a P0. |
| Draft autosave | 0/10 | Reload /generate mid-form and everything is wiped. No localStorage, no draft record. Cardinal sin for a 4pm clinician. |
| Export | not tested | I refused to trigger generation. Verified the Download DOCX button exists in workspace footer. |
| NDIS Review feature | broken | Banner says "Agent service is not configured." I assume this is a missing env var, but as a tester I have no path forward. |

**Top 5 must-fix before I can rely on this on a real client:**

1. **Draft autosave on /generate.** I will not retype intake. Period.
2. **Reports list = client list with search + filter + status grouping.** Currently unusable past day 3.
3. **User menu crash.** Cannot ship.
4. **Settings page** for clinic identity (name, AHPRA, default report header). I am one of three OTs - we should not all be Mary Jane Watson.
5. **Trust footer per section** - generated at, model, exemplars used, "review before sending" disclaimer.

---

## Walk-through narrative

### 1. First-time experience — "where do I start?"

I logged in with `test@user.com` / `test123`. The login page is fine, clean, single column. After login I was dropped straight onto `/generate` with no hello, no "welcome back", no list of my open drafts, no inbox of clients.

For a clinician this is jarring. My day does not start with "generate". My day starts with "what reports am I behind on?" — that is the morning question. If I open this app at 8am with a coffee in hand, I want to see:

- Drafts in progress (with last-edited date)
- Drafts waiting on data (e.g. "WHODAS scores still pending")
- Recently generated (so I can re-export to send)
- Status colours for each so I can triage

What I actually got: a blank intake form titled "Draft a Functional Capacity Assessment". No client context. No "continue last draft". No idea what I did yesterday.

> *OT colleague voice:* "OK so this is just for new ones? Where's the one I was working on Friday?"

**Recommendation:** make `/` the home page. Default view = client roster with status. /generate is a sub-route reached from the roster (or a "+ New report" button).

### 2. New report — intake form

I clicked Generate (the nav link, not the AI trigger button), got the intake form, and pasted in the Peter Parker note while filling fields. The intake page genuinely impressed me. Things I liked:

- Progressive disclosure: collapsibles for Client Details, Assessor, WHODAS, Sensory Profile, NDIS Goals. Doesn't drown me in fields.
- Status badges per collapsible: "Add DOB to populate Header" → "Header will populate" once filled. This is the right pattern.
- Bottom-line sentence under the textarea: *"Will generate 5 of 8 sections. Pending: Header, Part D, Part E - add the unlocking data above to include them."* That's exactly what a clinician needs - a real-time contract about what the AI is going to do.
- The "+ Sensory / + Scores / + Mental health / + Goals" pill chips are an interesting forcing function.

Things that confused me:

- **"Generate 3 sections" vs button title "Generate 3 of 8 sections".** The visible button label says "3 sections" - that is misleading. It made me think "wait, this is a 3-section report?" The tooltip clarifies but the visible label should be "Generate 3 of 8".
- **The pill chips dump placeholder text into the notes field.** Clicking "+ Sensory" inserted the literal string `Additional: sensory -- hypersensitive to noise in community settings.` into my clinical notes. As a clinician, that is contaminating my notes with prompt scaffolding I did not write. If you want a unlock-helper, put it in a separate "additional context" textarea. Do not modify the actual clinical-notes field that I am about to attest to.
- **No "Save draft" button.** Once I have a half-filled form and a real client coming through the door, I cannot save and come back. (See section 4.)
- **Date inputs are dd/mm/yyyy text fields** — no calendar picker visible at first, the placeholder text is in the input, and the entered value `1975-08-15` only displays correctly after the field commits. Minor.
- **Mode dropdown defaults to "— select —"** — I have to click into Assessor & Assessment Details, scroll, find Mode, set it. Most of my FCAs are telehealth. Default this to my last-used mode per OT.

### 3. Form dependencies — the "8 sections" preview

Walked through every collapsible. Here is the actual unlock graph I observed:

| Field | Unlocks |
|---|---|
| Participant name + DOB + plan dates | Header section |
| Assessor credentials + company | Header (rest of) |
| WHODAS scores (all 6) | Part D: Assessment Findings |
| NDIS goals (verbatim) | Part E: Summary & Recommendations |
| Clinical notes textarea | Other 4 sections (Overview, Process, Part A, Part B, Part C) |

The dependency feedback ("Part D will skip" / "Part D will generate") is excellent. But two issues:

- **The 8 number is hardcoded** even though Sensory Profile is "Optional". So if I do not supply Sensory, what happens? Does Part D still generate without Sensory? The status doesn't say. The label "8 sections" implies a total, but really there's a max and a min and the optional fields shift it.
- **"+ Mental health" and "+ Goals" pill chips inject placeholder strings** the same way + Sensory does. Goal: pre-fill the goals textboxes from the NDIS Goals collapsible. Reality: types `My goals are to maintain my mental health...` (or similar) into the clinical-notes textarea. That is the wrong place.

> *OT voice:* "Did the system just write 'hypersensitive to noise' into MY notes? Hayley, can you delete that before I generate?"

### 4. Mid-task interruption — autosave

This is the biggest workflow gap. Test:

1. Filled the entire intake (15+ fields, full Peter Parker note pasted - 3,949 characters).
2. Navigated to /reports.
3. Came back to /generate.
4. **Every field empty. Notes textarea empty. localStorage empty.**

Confirmed in code: no `localStorage`, no `useLocalStorage`, no IndexedDB persistence in `app/generate/page.tsx`, `components/generate/`, or `hooks/`. The form is React state only.

In real OT life this happens daily:
- Phone rings mid-form — pick up in another tab, come back, gone.
- Browser crashes during a 30-min interview while I'm typing live notes - gone.
- I close the laptop to get coffee, MacBook sleeps, comes back, sometimes the page reloaded — gone.
- A 4pm Friday emergency: I lose 90 minutes of intake work.

> *OT voice:* "Yeah I'm not pasting that note in again. I'll do it in Word."

**Recommendation, priority P0:** Auto-save the intake to localStorage every 2 seconds (debounced). On page load, if a draft exists, show an unobtrusive "Resume yesterday's draft for [name]?" pill. For multi-OT, key by `userId + clientName + creationDate`. When the user clicks Generate or successfully creates an assessment record, clear the local draft.

Phase 2: persist draft to Supabase as an `assessments` row in status `draft` so a clinician can leave the office at 4pm and pick up on her home laptop at 8pm.

### 5. Multiple cases — the report list

This is currently the biggest IA failure. I navigated to /reports and saw:

- **58 failed Peter Parker shells** from testing
- **No search field**
- **No filter (status, date, client name, OT)**
- **No grouping** ("Recent / In progress / Awaiting data / Sent")
- **No pagination** — just a long grid of identical cards
- A "Clear 58 failed" button at the top - that's a nice escape hatch for the dev, but a clinician will think "did the system fail 58 times for one client?"

Every card is *literally* labelled "FCA - Peter Parker", with status (Ready / Failed), section count, and "X ago" relative time. That's it. No client photo, no NDIS number, no last-edited indicator, no "needs my action" badge.

In a clinic of 3 OTs each managing 5-10 active clients, and a year of history, this list will reach hundreds of entries. It has zero scaling affordances.

**Recommendation - replace /reports with a Client Roster:**

- Top-level view: list of clients (one card per real participant)
- Each client card: name, NDIS#, plan end date (urgency!), last activity, status of latest report, owning OT
- Click into a client → see all their reports across time
- Search bar (top): live filter by name, NDIS#, OT
- Filter chips: "My drafts" / "Awaiting data" / "Ready to send" / "Sent"
- Sort: most recent / plan end date soonest / alphabetical
- Bulk actions: archive, export selected DOCX as ZIP

Secondary need: **a separate "All reports" admin view** for the Flourish lead OT or admin to oversee team work-in-progress.

### 6. Workspace — editing a generated report

I opened the workspace for an existing Peter Parker generated report (`0a81842a-af23-4d87-8517-45a1a7d25ec9`). What works:

- **Section sidebar** with green dots = ready, grey dots = pending. Good.
- **"Draft progress: 100%"** at the top. Good.
- **Inline editor** (Plate/Slate based) with floating selection toolbar (B / I / H2 / Bullet / Refine). Working.
- **Footer** has Print, Run NDIS review, Download DOCX. Good.
- **"Saved just now"** indicator. Good (and contrasts with the missing autosave on /generate).
- **NDIS Planner Review sidebar card** showing 0 critical / 0 warnings / 0 suggestions, with "Review all 0" button. Good idea.

What's broken or missing:

- **Markdown tables render as flat vertical text.** The Header section is a markdown table with `| Field | Details |`, and it renders as:
  ```
  Field
  Details
  Report Title
  Functional Capacity Assessment Report
  Participant Full Name
  Peter Parker
  ...
  ```
  Each "key" and each "value" is on its own line. NDIS planners will not accept this. Fix the renderer to actually render markdown tables, or stop emitting tables in the prompt and emit definition lists instead.

- **No "regenerate just this section" button visible.** Workspace mode appears to be edit-only. As a clinician, my normal correction loop is:
  1. Spot a section that read-pads
  2. Click "regenerate with feedback: too verbose, cite the dosette box example"
  3. Compare old vs new
  4. Keep one
  
  Right now I can hand-edit but cannot ask the AI for a second draft of one section without re-running the whole intake. Big workflow gap.

- **No section-level metadata shown.** I cannot see at a glance: when this section was generated, what model produced it, which exemplar(s) were retrieved, how many [INSUFFICIENT DATA] markers it contains. The data exists in the JSON output (`words`, `duration`, `insufficientData`, `status`) but is not surfaced.

- **Find button (top right) does not open a search bar.** Clicking it appears to be a no-op (or it triggers selection toolbar incorrectly). Cmd+F still works as the browser's find.

- **"Run NDIS review" / "NDIS Review" panel** says "Agent service is not configured." Friendlier copy needed: "NDIS Planner Review uses an agent service that hasn't been set up on this environment yet. Ask the dev team."

- **"Review all 0"** in the sidebar is empty state - never explains what NDIS Planner Review *does*. First-time clinician will not know whether to expect "this checks for NDIS reasonable & necessary criteria" or "this is a spell-check".

- **No version history.** I made an edit. Can I undo to "as generated"? Can I see what I changed vs what the AI said? Important for clinical accountability and audit.

### 7. Export DOCX

I did not click Download (it might trigger an LLM call - not certain, given the project rules I stayed away). The button is in the workspace footer with a download icon. I noted:

- One single button: "Download DOCX". No preview. No "send to..." options.
- No "Email to support coordinator" workflow.
- No PDF option visible.
- No "include signature page" toggle.
- No control over template/branding.

Real OT export needs:
- Final pass to clean up `[INSUFFICIENT DATA]` markers (currently shown to the planner if not removed)
- Choice of clinic letterhead / no letterhead
- Optional appendix with WHODAS scoresheet and Sensory Profile raw scores
- DOCX with track-changes off, comments off
- Filename convention: `FCA - {Surname, Firstname} - {YYYY-MM-DD}.docx`

### 8. Settings page

`/settings` is one page with one feature: upload exemplar reports for RAG. I see 22 FCA-XX.md files and a README.md uploaded.

What is missing for an internal-use tool:

- Clinic name, address, phone, ABN, NDIS provider number
- Per-OT profile: full name, AHPRA registration, credentials line, default mode (telehealth/in-person), email, phone, signature image
- Default report cover/header template per clinic
- Default disclaimer/confidentiality footer text
- Per-OT exemplar shelves vs shared shelf (right now it looks like a single global shelf, which means MJ Watson's voice and Hayley's voice are blended in RAG)
- Tone slider or voice template choice
- LLM transparency: "current model: gpt-5.5", "average tokens per FCA", "approximate cost per generation"
- Audit log: who generated what, when

> *OT voice:* "Where do I put my AHPRA number? It has to go on the report. Hayley said you fix it later? OK so I edit the header every time? Mate."

### 9. Recovering from mistakes

Tested informally by clicking into existing reports. Things I noticed:

- **No undo for delete.** Each report card has a red trash icon. One click + confirm (haven't tested if there's confirm) and 30 minutes of OT time is gone forever. Need soft-delete with 30-day recovery.
- **No "duplicate this report"** for follow-up reviews. Often I generate a refresh FCA from a previous one with edits. No clone affordance.
- **No "wrong client name" rescue.** If I typed "Peter Parke" missing the second r, fix means edit field-by-field — fine here, since Header is generated from intake. But after generation, the participant name is baked into prose throughout 30+ pages. There's no global find/replace, no "rename participant" button.

### 10. Trust signals — would I sign this?

This is the most important section for a beta. Putting my AHPRA number under an AI-drafted report is a serious thing. Here is what I expect to see, and what I actually see.

| Trust signal | Status |
|---|---|
| "Generated at 14:36 on 9 May 2026" timestamp per section | Missing |
| Model used (gpt-5.5) shown somewhere | Missing |
| Number of exemplars retrieved per section ("4 of your past FCAs were used as style references") | Missing |
| Names of exemplars retrieved (so I can spot if FCA-08, the weak one, was over-weighted) | Missing |
| Visible `[INSUFFICIENT DATA]` markers - count per section, surfaced in sidebar | The markers exist in the prose (good) but are not counted/highlighted - I have to find them by reading |
| Disclaimer at top of workspace: "AI-drafted. You are clinically responsible for every line." | Missing |
| Confidence indicator per section (the JSON has `status: "ready"` vs "insufficientData: true" — surface it) | Hidden |
| Section that says "this was hand-edited after generation" vs "as-generated" | Missing |
| Audit trail / history of edits | Missing |
| Sign-off button that locks the report ("I, MJ Watson, attest...") | Missing |

The current UI is an editor. It needs to become a clinical attestation surface. The difference matters because if the planner rejects an FCA, the OT is on the hook, not the tool.

**Recommendation:** add a per-section info chip:

```
Part A · 1411 words · generated 9 May 14:36 · gpt-5.5 · 5 exemplars used
[!] 3 INSUFFICIENT DATA markers · last edited by MJ at 14:48
```

And add a workspace banner:

```
This is an AI-drafted FCA. You are clinically responsible for every claim,
recommendation, and figure in this report. Verify all dates, scores, and
support hours before signing.
```

### Bonus bug found — User menu crash

Clicking the user avatar (TE button top-right) on /generate triggered an unhandled error:

```
Base UI: MenuGroupRootContext is missing. Menu group parts must be used within <Menu.Group>.
  at MenuGroupLabelComponent
```

It threw the global error boundary ("Something went wrong / Try again"). The whole app errored. This is a P0 - the user has no way to log out, see profile, or reach settings via the avatar.

---

## Missing-features list — translated for the founder

Group A: things that block daily use across an OT team. Cannot ship internally without these.

| Feature | Why a clinician needs it |
|---|---|
| **Draft autosave** on /generate (localStorage + Supabase) | OT life is interruption-driven. Losing 30 min of intake is a session-ender. |
| **Client roster** as the home page (not a flat report list) | We think in clients, not in reports. 3 OTs * 10 clients * 3 reports/year = 90 entries by year-end. Currently unfindable past day 3. |
| **Search and filter** on report list | Same as above. Find by name, NDIS#, status, OT. |
| **Per-OT profile in Settings** | Each OT signs reports under their own AHPRA #. We can't all be one assessor. |
| **Clinic identity in Settings** | Provider name, address, NDIS provider#, default footer. |
| **User menu fix** (P0 bug) | Cannot log out or see profile right now. |
| **Markdown table rendering** | Header section is unreadable. Planners will reject. |
| **Friendly empty state for NDIS Review** | "Agent service is not configured" is dev-speak. |

Group B: clinical workflow features that turn this from "draft generator" into "report writing system".

| Feature | Why |
|---|---|
| **Regenerate single section with feedback** | Normal correction loop. Currently I can only hand-edit. |
| **"Send to clinical reviewer" workflow** | Junior OTs at Flourish should send drafts to Hayley for sign-off. Currently no review/approve state exists. |
| **Version history per section** | Audit, compare AI vs hand-edited, undo. |
| **`[INSUFFICIENT DATA]` count + "fix all" view** | Currently buried in prose. Should be a sidebar checklist with jump-to-section. |
| **Exemplar provenance per section** | Trust signal. Also helps me know which exemplars to re-tag/improve. |
| **Per-section metadata chip** (generated at, model, words, duration) | Trust + transparency + debug when output is weird. |
| **"Resume draft" prompt on intake** | Pair with autosave above. |
| **Soft-delete with 30-day recovery** | One click currently nukes 30+ min of work. |
| **Duplicate / clone report** | Common: follow-up FCA based on previous. |
| **"Mark as sent" + sent-date column** | I currently have no way to track which were emailed to which planner. |
| **Saved templates per OT** (intake presets, common phrasings) | Hayley wants the language she already uses. |

Group C: administrative / multi-OT features. Needed by month 3 of internal use.

| Feature | Why |
|---|---|
| **Audit log** (who generated, who edited, who exported) | NDIS provider compliance. Supervisor oversight. |
| **Per-OT exemplar shelf vs shared shelf** | Mary's tone vs Hayley's tone. Currently blended. |
| **Time-on-report tracker** (start to export) | Measures the ROI thesis from STRATEGY-2026-05-09. |
| **Cost per generation surfaced** | Founder needs to see real run-rate. OT doesn't, but admin does. |
| **Export to email or shared drive** | Currently just downloads to local. |
| **Report status pipeline** (Draft → Ready → In review → Sent → Archived) | Real workflow has stages. |
| **"This section was generated with broken RAG"** badge if exemplar retrieval failed | Direct response to the configuration bug story in STRATEGY-2026-05-09. The system should refuse to silently degrade. |

Group D: nice-to-have, post-pilot.

| Feature | Why |
|---|---|
| Voice dictation that actually records | Currently "Dictate" button does nothing visible. Speech-path team would love this. |
| Mobile-friendly intake (iPad form during home visit) | OT often does intake at the client's house. |
| Auto-pull client details from Splose/Airtable so I don't retype DOB and NDIS# | Real time saver. |
| Shared phrase bank ("recommended phrasings for sensory paragraphs") | Quality consistency across OTs. |
| Comparison view: "what 4 of your past FCAs said about sensory" while editing the sensory section | Voice-anchoring without re-running RAG. |

---

## Final word from the OT chair

If you fix the autosave bug, the user-menu crash, and rebuild the report list as a client roster, this tool becomes good enough for me to use on Monday.

If on top of that you add per-section AI provenance and a "regenerate this section" button, this becomes a tool I'd use over Word.

Without those - and especially without autosave - it stays in the "interesting demo" bucket. Twice losing 30 minutes of intake is enough to send any OT back to a Word template forever.

The intake page is the strongest part of the product. The staged-generation contract ("will generate 5 of 8 sections") is genuinely smart and clinician-friendly, which is rare in AI tooling. That core is worth protecting. Build the rest of the surface around it with the same level of care.

> "I want to spend my time on the clinical reasoning and the recommendations. I'll happily let the AI write the boilerplate. But the moment the tool wastes my time - retyping notes, hunting for a client, fighting a markdown table that won't render - I'm back in Word."

— A real OT, every Friday at 4pm.
