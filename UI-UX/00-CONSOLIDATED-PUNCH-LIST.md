# Morning Punch List — Consolidated UI/UX Findings

**Generated:** 2026-05-09 (overnight)
**Sources:** 5 specialist reviewers (visual-craft, clinician-workflow, PM-feature-gaps, IA-navigation, edge-cases) — full reports in this folder, ~17,000 words combined.

---

## What I already fixed tonight

These were zero-risk, multi-agent-converged, and mechanical. Done before you wake up:

| Fix | File | Why |
|---|---|---|
| **Avatar menu crash** — wrapped `DropdownMenuLabel` in `DropdownMenuGroup` | `components/layout/user-menu.tsx` | P0. Base UI's `MenuPrimitive.GroupLabel` requires a `MenuGroup` parent context. Without it, the menu threw `MenuGroupRootContext is missing` and tripped the global error boundary on every avatar click. Verified by clinician reviewer in a real browser. |
| **"Saved just now" trust-killer** → just "Saved" | `components/workspace/workspace-footer.tsx` | P0. The chip claimed "Saved just now" on initial render before any save had happened. Edge-case reviewer flagged as #1 ship-blocker. Honest text now; plumb a real `lastSavedAt` later if timestamps matter. |
| **Plural grammar** — "0 suggestion" → "0 suggestions", same for "0 warning" | `components/workspace/toc-sidebar.tsx:149,145` | P2 nit, but visible. |
| **"Data stays in Australia" misstatement** removed | `app/generate/page.tsx:1072` | P0 compliance. OpenAI has no AU region in 2026; the claim was load-bearing-false in a clinical context. Replaced with "yours to edit and verify before sending to NDIS". |
| **Boilerplate SVGs deleted** — next.svg, vercel.svg, globe.svg, file.svg, window.svg | `public/` | P1 brand. No code referenced any of them. |

Type-check clean after all five.

**Not fixed tonight (needs design / scope decisions, see below):** avatar profile model, settings expansion, autosave on `/generate`, workspace markdown table rendering, DOCX letterhead/markdown, login screen, Sparkles purge, two-design-systems consolidation, dead buttons (Find/Appendices/Signatures), reports list search.

---

## Convergence-weighted findings (most important first)

The strongest signal is when 3+ independent reviewers found the same issue. Listed in order of convergence count then severity.

### P0 — ship-blockers (4–5 reviewers agree)

| # | Issue | Where | Reviewers |
|---|---|---|---|
| 1 | **No autosave on `/generate`.** 5–10 minutes of intake form work disappears on any nav, refresh, or tab close. Verified empirically: `localStorage.length === 0`; no `useLocalStorage` / `sessionStorage` anywhere in `app/generate/` or `hooks/`. | Add a `useLocalStorage` (or `localforage`) hook keyed on user id. Restore on mount; clear on successful generation. | Clinician, PM, Edge-cases, IA |
| 2 | **3 dead buttons in workspace** look like real affordances and silently do nothing. | `workspace-layout.tsx:372-374` (Find), `toc-sidebar.tsx:99-106` (Appendices, Signatures). Either wire them or delete them. | IA, Visual, Clinician, Edge-cases |
| 3 | **Quick-add chips on `/generate`** (`+Sensory`, `+Scores`, `+Mental health`, `+Goals`) inject literal placeholder text into the clinical notes textarea. With Phase B's structured intake, these are now redundant AND clinically contaminating — sample copy ("hypersensitive to noise in community settings") will end up verbatim in real reports. | `app/generate/page.tsx` lines ~860-940. **Delete the chip block entirely.** Structured intake already covers what they pretended to fast-track. | Clinician, Edge-cases, Visual, IA |
| 4 | **Settings page is exemplar-uploads only.** Missing clinic identity (name, AHPRA, NDIS provider#), per-OT profile, default report header, model preferences. The Header section in every report has placeholder fields that should pull from a profile. | `app/settings/` — add Profile section + Clinic section. | Clinician, PM, IA, Edge-cases |
| 5 | **Reports list has no search, no filter, no client grouping, no pagination.** With 58 stale Peter Parker test rows visible, finding a real client is already painful. Code: `report-list.tsx` does no `.range()`. | Add a search input + a simple status filter + `.range(0, 49)`. | Clinician, PM, IA |

### P0 — security / trust killers (single-reviewer but high-stakes)

| # | Issue | Where | Reviewer |
|---|---|---|---|
| 6 | **Middleware fails OPEN if `NEXT_PUBLIC_SUPABASE_URL` is missing or contains the literal string "placeholder".** A misconfigured deploy silently bypasses the auth gate. | `proxy.ts` | Edge-cases (BUG-001) |
| 7 | **Workspace report fetch lacks an explicit `user_id` filter.** Tenant isolation depends entirely on RLS policies being correct in production. Defense-in-depth missing. | `components/workspace/workspace-layout.tsx` | Edge-cases |
| 8 | **Prompt injection vector.** Free-text identity fields (participant name, assessor, etc.) are templated verbatim into the LLM system+user prompts. A malicious or malformed entry could derail the section it's used in. | `lib/ai/prompts.ts` and `lib/ai/header.ts` | Edge-cases |
| 9 | **Public sign-up is open** via the stock Supabase Auth UI on `/login`. Anyone with the URL can register an account in your project. | `app/login/page.tsx` | PM |
| 10 | **NDIS Review panel exposes raw error copy:** "Agent service is not configured" leaks as user-facing text. | `app/api/review/route.ts` or wherever review errors propagate | Clinician |

### P0 — broken core deliverables (2 reviewers, severe)

| # | Issue | Where | Reviewers |
|---|---|---|---|
| 11 | **Markdown tables render as flat vertical text in `/workspace/[id]`.** This means **the Phase B deterministic Header section is unreadable in the editor** — own-goal from this session. Plate.js needs a markdown-table renderer or the Header content needs to become a Plate-native table block. | `lib/editor/report-to-plate.ts` and `plate-editor.tsx` | Clinician, PM |
| 12 | **DOCX export strips all markdown.** Tables print as `\| ... \|`, lists as `* item`, headings as bold paragraphs, no letterhead, no page headers/footers, no `@media print` block. The actual deliverable to NDIS is broken. | `lib/export/docx.ts` (and **two duplicate implementations** in `workspace-layout.tsx` + `export-button.tsx` — dedupe) | PM, Edge-cases |
| 13 | **`window.print()` prints the entire UI chrome** (sidebar, topbar, footer). | Add a `@media print` block in `app/globals.css` that hides chrome and styles report-document for paper. | PM, Edge-cases |
| 14 | **Generation failure leaves orphan reports in DB**, no Resume affordance, no retry. User restarts and double-spends tokens. | `app/api/generate/route.ts` (resume logic) + workspace UI button | PM, Edge-cases |
| 15 | **Zero AI provenance signals.** No "generated at" timestamps per section, no model name shown, no exemplar trail, no clinical responsibility disclaimer near the export button. Clinicians cannot tell what's authored vs AI-drafted. | Multiple touchpoints — start with a small "Section provenance" bar in the workspace footer and a footer disclaimer on exported DOCX. | Clinician, PM |

### P1 — visual cohesion / brand

| # | Issue | Where | Reviewer |
|---|---|---|---|
| 16 | **Login is the biggest credibility break.** Stock Supabase Auth UI with `theme="dark"` rendered on a white page. No brand mark, no marketing column. | `app/login/page.tsx` — replace with a custom layout using shadcn `Card` + a brand mark on the left | Visual |
| 17 | **Two parallel design systems collide.** Bespoke `tn-*` (Geist/Urbanist, pill buttons, hsl accent) + raw shadcn (oklch primary, rounded-lg, different blue). Buttons, radii, focus rings drift. | Pick one. Most efficient: extend `tn-*` token names into Tailwind theme so shadcn primitives can adopt them. | Visual, Clinician |
| 18 | **Sparkles is used 8+ times for unrelated purposes** (brand, AI refine, error, 404, success, progress, sidebar). Single biggest "AI demo cliché" tell. | `grep -rn "Sparkles" components/ app/` and replace each with a context-appropriate icon. | Visual |
| 19 | **5 raw `<select>` and 4 raw `<input type="date">` on /generate**, plus native `<details>` with `▸` font character. **This is what gives the spreadsheet feel.** All from my Phase B intake build. | Replace with shadcn `Select`, a real `DatePicker` (or react-day-picker), and `Accordion`. | Visual |
| 20 | **Two report stylesheets** render the same content visibly differently — `.report-document` (post-generate preview) and `.tn-doc` (workspace editor). | Pick one canonical clinical-document style; delete the other. | Visual |
| 21 | **Generic Next.js favicon and SVGs in public/** (deleted the SVGs tonight; favicon still default). | Replace `app/favicon.ico` with a TheraNotes mark. | Visual |
| 22 | **Topbar disappears on `/workspace` and `/settings`.** App has 3 different chrome systems. | Make the Topbar persistent for all authenticated routes. | Visual, IA |
| 23 | **Generate button is a 36px arrow icon** for a 6-minute, $1+ action. Asymmetric to its weight. | Make it a labeled pill: "Generate report →" or similar. | Visual |

### P1 — IA / discoverability

| # | Issue | Where | Reviewer |
|---|---|---|---|
| 24 | **URL mismatch:** list at `/reports`, detail at `/workspace/<uuid>`. Should be `/reports/<id>`. | App Router: rename `app/workspace/[id]/` → `app/reports/[id]/`, redirect old URLs, update internal links. | IA |
| 25 | **No `/clients` entity.** Clients exist only as denormalized `participant_name` strings on assessments. Once a clinician has multiple reports per client this hits a wall. | Add a `clients` table; foreign key from assessments. Likely a 2-3 day effort. | IA |
| 26 | **No global search, no Cmd+K, no recent items, no "+ New report" CTA on `/reports` outside the empty state.** | Add a `+ New report` button to the reports list header that's always visible. | IA, PM |
| 27 | **"Tip: upload your previous FCA reports in Settings"** — the word "Settings" is plain text, not a Link. | `app/generate/page.tsx` first-run banner | IA |

### P1 — input validation gaps

| # | Issue | Where | Reviewer |
|---|---|---|---|
| 28 | **Empty `participantName` silently becomes "Quick Generate"** instead of erroring. | `app/generate/page.tsx:103` — require participant name in form validation. | Edge-cases |
| 29 | **DOB year 1820 accepted, WHODAS scores accept negative numbers and >100**, no min/max enforcement. | Add `min`/`max` (already on inputs) and validate on submit. | Edge-cases |
| 30 | **No 500K+ char clinical notes guard.** | Add a soft limit + warning. | Edge-cases |

### P2 — performance / nice-to-have

| # | Issue | Where | Reviewer |
|---|---|---|---|
| 31 | **Sequential generation, 80-120s end-to-end.** Parts A/B/C are independent and could run in parallel. | `app/generate/page.tsx` runGeneration loop — `Promise.all` for the independent sections. | Edge-cases |
| 32 | **Generation logs invisible to users.** Well-designed `generation_logs` table sits unsurfaced. | Add an "Activity" section in workspace right rail or per-section "Generated at X" timestamps. | PM |
| 33 | **No team / org / share schema.** Single-user RLS only — no path to "share this draft with my supervisor." Largest structural debt for a clinic-wide rollout. | Schema work; defer until after the first OT pilot. | PM |

---

## Recommended sequence (4-day batch)

**Day 1 — bug + brand floor (4-6h):**
- Topbar persistent on all authenticated routes (#22)
- Real login screen (#16)
- Replace Sparkles uses (#18)
- Replace native `<select>`/`<input type="date">`/`<details>` with shadcn primitives (#19)
- Fix `/workspace` markdown table rendering (#11) — biggest bang per hour
- Wire or delete the dead buttons (#2)

**Day 2 — autosave + drafts + identity (6-8h):**
- `/generate` autosave with localStorage + a "draft restored" toast (#1)
- Profile model on settings (#4 part 1) — name, credentials, email, company
- Plumb profile fields into the Header builder so the Header table populates without per-report re-entry (#15 partial)

**Day 3 — DOCX letterhead + print (4-6h):**
- DOCX export markdown rendering (#12) — headings, lists, tables, bold
- DOCX letterhead block reading from clinic settings
- `@media print` CSS so Print prints the document, not the chrome (#13)
- Dedupe the three DOCX export implementations

**Day 4 — reports list polish (4-6h):**
- Search + status filter + pagination (#5)
- "+ New report" CTA always visible (#26)
- URL rename `/workspace/<id>` → `/reports/<id>` with redirect (#24)
- Delete redundant quick-add chips on /generate (#3)

That's a focused 4-day batch totaling 18-26 hours of effort. After that, the app feels like an internal app, not a spreadsheet.

---

## What's good and worth preserving

Per the visual reviewer, things to NOT touch:

- The `tn-gen-card` design language for the Generate page is genuinely good (typography, spacing, the editorial feel)
- The Phase B collapsible intake structure works conceptually — it's the native form elements inside the collapsibles that need swapping, not the architecture
- The deterministic Header builder is the right call — just needs the workspace renderer to handle markdown tables
- The `generation_logs` schema is well-designed; just needs a viewer
- The strict per-user RLS is the right default for now
- The Phase B `requires` / `references` declarative section dependencies are clean — easy to extend

---

## Reading order if you only have 30 minutes in the morning

1. **This file** (you're reading it — covers the 80%)
2. `02-clinician-workflow-review.md` — the only one with live browser screenshots; most evidence-rich
3. `03-pm-feature-gaps.md` — for the 1-week roadmap and structural calls
4. **Skim** the other three only if you want depth on a specific category

Then pick the Day 1 batch and go. If you want me to execute Day 1 in a single focused session, I can do that.
