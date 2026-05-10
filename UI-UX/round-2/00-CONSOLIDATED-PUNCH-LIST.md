# Round-2 Consolidated Punch List

**Generated:** 2026-05-10
**Sources:** 5 specialist reviewers (visual-craft / clinician-workflow / pm-feature-gaps / ia-navigation / qa-edge-cases) + skill research addendum.
**Scope:** Verifies what shipped in this session (Days 1–4 + Day-2.5 security batch) and surfaces new findings.
**Format:** v0.2 of `/ux-review` — verdict block first, user-action second, regressions-orchestrator-caused above all new findings, every fix annotated with verification class and audit trail.

---

## Round verdict: **NO** (most-conservative-vote rule applies)

| Reviewer | Vote | One-line reason |
|---|---|---|
| visual-craft | yes-with-caveats | Brand cohesion grade C+. Login submit blue mismatched, three blues coexist, marquee Generate is still a 36px icon. ~3.5h to B+. |
| clinician-workflow | **NO** | DOCX export silently fails for any report containing a Header table — load-bearing operation broken. |
| pm-feature-gaps | yes-with-caveats | 8/10 round-1 items shipped at high quality. Open Supabase sign-up still active. Autosave lies on errors. |
| ia-navigation | yes-with-caveats | All 7 round-1 IA items shipped. Search false-negatives past page 1. `:focus-visible` missing. Workspace 404 strands user. |
| qa-edge-cases | **NO** | Cmd+Z silently broken in editor. False residency claim still on `/login`. No rate limiting. No CSP. PHI in unencrypted localStorage. |

**Decision:** A single `NO` from any reviewer = round verdict is `NO`. Two reviewers voted no, both with concrete operational gaps.

**What that means in practice:** Do **not** put this in front of a real Flourish OT on a real client today. Apply the regression batch + the user-action items below + ship the next-day verified surgical fixes, then re-run `/ux-review --round 3` to confirm before the OT pilot.

---

## User-action required (skill cannot fix from code)

These are infrastructure/config tasks the orchestrator cannot resolve. They sit here, not in the regular fix queue, so they don't get silently un-done.

| Action | Where | Why it's load-bearing |
|---|---|---|
| **Disable open Supabase sign-up** | Supabase Dashboard → Authentication → Providers → Email → uncheck "Enable email signups" or require admin invitation | Anyone with the URL can `auth.signUp()` from a console and burn OpenAI tokens. Multi-tenant security gap. (PM reviewer + QA reviewer both verified live.) |
| **Verify migration 008 is durable** | Supabase Dashboard → Database → Tables → `clinician_profiles` → confirm `display_name`, `credentials`, `ahpra_registration`, `clinic_name`, etc. columns are present | Migration was applied this session per user screenshot, and the orchestrator re-verified columns visible via service-role read. Clinician reviewer hit a transient PostgREST schema-cache lag during round 2. Confirm one more time before ship. |
| **Add Supabase BAA / DPA** if you ever take this beyond Flourish | Supabase enterprise contract, OpenAI enterprise contract | Today's setup is fine for "I am the data controller and the only customer". Becomes a hard blocker the moment a second clinic is on the platform. |

---

## Regressions caused by this session (sort to top, fix first)

These are findings where round-1 fixes broke something else. They jump above every new finding regardless of severity. Trust compounds; the orchestrator must clean up its own messes first.

### REG-1 (REGRESSION FROM ROUND 1) — DOCX export silently broken for any report with a Header table

- **Severity:** P0
- **Caused by:** Day-1 added Plate `table`/`tr`/`td` element components for *display*. The serializer path (`editor.api.markdown.serialize` in `lib/editor/plate-to-sections.ts:28`) has no handler for those node types. Round-trip from editor → markdown → DOCX silently produces an unhandled rejection; no toast, no file downloaded.
- **Reviewer:** clinician-workflow (live click test). qa-edge-cases corroborates.
- **Verification class:** Code claim.
- **Verified by:** Reading `lib/editor/plate-to-sections.ts:28` confirms `editor.api.markdown.serialize({ value: currentNodes })` is called on a Plate value tree that now contains `table` / `tr` / `td` nodes. No serializer extension is registered in `lib/editor/plugins.ts` (verified). The Plate markdown plugin's default serializer rejects unknown node types.
- **Recommended fix:** Two-line implementation in `plate-to-sections.ts`: before serialization, walk the value tree and convert `table`/`tr`/`td` nodes back to a markdown-table string. Alternative: register a custom markdown serializer in `lib/editor/plugins.ts` for the table types. Pick the one with the smaller diff.
- **Re-verify after fix:** load `/reports/<existing-report-id>`, open dev console, click Download DOCX, expect a `.docx` file to download AND the file should contain the Header table when opened.

### REG-2 (REGRESSION FROM ROUND 1) — "Australian-region storage" claim still on `/login`

- **Severity:** P0 (NDIS compliance / clinical accuracy)
- **Caused by:** Day-1 login screen rebuild reintroduced the same load-bearing-false claim ("Australian-region storage. Your data never leaves Supabase ap-southeast-2.") that Day-1 had explicitly removed from `/generate`. OpenAI processing has no AU region.
- **Reviewer:** qa-edge-cases (line cited at `app/login/page.tsx:91`). clinician-workflow corroborates.
- **Verification class:** Code claim.
- **Verified by:** Read `app/login/page.tsx:91` — the bullet "Australian-region storage. Your data never leaves Supabase ap-southeast-2." is literally present in the new `tn-auth-bullets` list.
- **Recommended fix:** Replace the bullet with a more honest version: "Your data is stored in Supabase ap-southeast-2 (AU). AI processing is performed by OpenAI." Or remove the bullet entirely if no concise honest version reads well.
- **Re-verify after fix:** `grep -n "Australian-region\|never leaves" app/login/page.tsx` returns no matches.

### REG-3 (REGRESSION FROM ROUND 1) — Print CSS hides the AI-drafted disclaimer

- **Severity:** P1 (clinical responsibility surface)
- **Caused by:** Day-3 print CSS hid `.tn-disclaimer` along with the rest of the chrome — but the disclaimer is one of the few things that should *survive* print, since the printed report is what a planner sees and the disclaimer is the clinical-responsibility surface.
- **Reviewer:** qa-edge-cases (BUG-125).
- **Verification class:** Code claim.
- **Verified by:** Read `app/globals.css` print block — `.tn-disclaimer` is in the `display: none !important` list.
- **Recommended fix:** Remove `.tn-disclaimer` from the print-hidden list. Style it for paper (small, muted, position at the foot of the printed page). Alternative: print the same DOCX-style "AI-drafted. Clinician review required before submission." footer text.
- **Re-verify after fix:** trigger Cmd+P on `/reports/<id>`, confirm the disclaimer is visible in print preview.

### REG-4 (REGRESSION FROM ROUND 1) — Reports list query is RLS-only (defense-in-depth gap)

- **Severity:** P0 (defense in depth — single RLS policy bug = cross-tenant leak)
- **Caused by:** Day-4 added pagination to `report-list.tsx` without copying the explicit `.eq('user_id', user.id)` pattern that Day-2.5 applied to the workspace fetch.
- **Reviewer:** qa-edge-cases (BUG-113).
- **Verification class:** Code claim.
- **Verified by:** Read `components/reports/report-list.tsx` — the pagination query (`.from('reports').select(...).order(...).range(...)`) does NOT include `.eq('user_id', user.id)`. RLS is the only barrier.
- **Recommended fix:** Add `const { data: { user } } = await supabase.auth.getUser()` then `.eq('user_id', user.id)` to the query. Mirror the workspace pattern.
- **Re-verify after fix:** Read the patched file; confirm `.eq('user_id', user.id)` is present and `user` is checked before query.

---

## Verified fixes — top P0/P1 items, sorted by convergence

The following are findings where ≥2 reviewers agreed AND I have verified the symptom is real, AND the fix is mechanical (no design call). **Verified before any edit happens, per the v0.2 verify-before-fix gate.**

### NEW-1 — Login submit button uses shadcn primary (a fourth blue on the page)

- **Convergence:** visual-craft (P0)
- **Verification class:** Code claim
- **Verified by:** Read `app/login/page.tsx` — `<Button type="submit" className="tn-auth-submit">` uses class `tn-auth-submit`. Read `app/globals.css` — `.tn-auth-submit` has only `margin-top: 6px; width: 100%;` etc., no `background` rule. Falls back to shadcn `default` variant which is `bg-primary` (oklch primary), not the `--tn-accent` token used by the rest of the login screen.
- **Fix:** Add `background: var(--tn-accent, #2851a3); color: #fff;` to `.tn-auth-submit` in `globals.css`. Add a `:hover` darken.
- **Effort:** 5 min.

### NEW-2 — Login brand-mark and aside bullets use a different blue from the rest of the app

- **Convergence:** visual-craft (P0)
- **Verification class:** Code claim
- **Verified by:** `grep -n "tn-accent" app/globals.css` shows the value `#2851a3` (used by the new login screen). `grep -n "hsl(225 65% 50%)" app/globals.css` shows the rest-of-app accent. Two different blues are mathematically distinct (oklch vs hsl, different chroma).
- **Fix:** Pick one. The cheaper fix is to delete the `--tn-accent` fallback override in `globals.css` so login inherits the same accent as everywhere else. The richer fix is to set a single `--tn-accent` token at `:root` and have everything reference it.
- **Effort:** 2 min for the cheap fix.

### NEW-3 — Generate "send" button is a 36px shadcn icon-only for the marquee $$ action

- **Convergence:** visual-craft (P0), clinician-workflow (P3 polish — but flagged earlier as visual asymmetry to a 6-min, $1+ action)
- **Verification class:** Code claim
- **Verified by:** Read `app/generate/page.tsx` ~line 950 — `<Button variant="default" size="icon" className="rounded-full" onClick={handleGenerate}>` with `<ArrowUp size={16} />` inside. No label. Confirmed orphan `.tn-send-btn` class exists in `globals.css` but is unused.
- **Fix:** Replace the icon-only button with a labeled pill: `<Button onClick={handleGenerate} className="rounded-full px-5">Generate {sectionsThatWillGenerate} sections <ArrowRight size={14} /></Button>`. Use the existing accent token, not shadcn primary.
- **Effort:** 10 min.

### NEW-4 — Three dead-end tools on `/generate` (Attach / Dictate / Template)

- **Convergence:** visual-craft (P1), clinician-workflow (P0 — same dead-affordance pattern as the workspace buttons we already purged)
- **Verification class:** Code claim
- **Verified by:** Read `app/generate/page.tsx` ~line 920 — three `<Button>` elements with `title="Attach transcripts or prior reports"` / `title="Dictate"` / `title="Use a template"`, no `onClick` handlers, no surrounding `disabled` state.
- **Fix:** Same approach as the workspace dead-button purge: delete them. Reintroduce when the actual feature ships.
- **Effort:** 5 min.

### NEW-5 — Reports list search returns false negatives past page 1

- **Convergence:** ia-navigation (P0), qa-edge-cases (P1)
- **Verification class:** Runtime claim, verified by reading the implementation
- **Verified by:** Read `components/reports/report-list.tsx` — search runs as a client-side filter (`reports.filter(r => r.assessments?.participant_name?.toLowerCase().includes(...))`) over the loaded page only. `Load more` is hidden when search is non-empty. So if the user's case is on page 2 of 50 reports, searching for them returns "no results".
- **Fix:** Switch search to server-side via `.ilike('assessments.participant_name', '%term%')` on the Supabase query. Removes the load-more conflict entirely.
- **Effort:** 15 min.

### NEW-6 — `.tn-nav-item` (topbar) has no `:focus-visible` style — WCAG 2.4.7 violation

- **Convergence:** ia-navigation (P0)
- **Verification class:** Code claim
- **Verified by:** `grep -n "tn-nav-item" app/globals.css` — selector exists with hover but no `:focus-visible`. Tab-keyboard users see no focus ring on Topbar nav.
- **Fix:** Add `.tn-nav-item:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 2px; border-radius: 4px; }`
- **Effort:** 2 min.

### NEW-7 — Workspace 404 page strands the user (no Topbar)

- **Convergence:** ia-navigation (P0)
- **Verification class:** Code claim
- **Verified by:** Read `components/workspace/workspace-layout.tsx` — Topbar mount is inside the success branch (the main `return` block). The `if (notFound) { return ... }` early-return renders a centered "Report not found" with only a "Back to Reports" button — no Topbar, no nav.
- **Fix:** Lift the Topbar out of the success branch into a `return (<><Topbar />{loading ? ... : notFound ? ... : <Workspace .../>}</>)` shape so it renders in all branches.
- **Effort:** 10 min.

### NEW-8 — Workspace `.tn-saved` chip says "Saved" even when last save errored

- **Convergence:** pm-feature-gaps (P0), qa-edge-cases (BUG-046 follow-up)
- **Verification class:** Code claim
- **Verified by:** Read `hooks/use-auto-save.ts` — `saveStatus` is `'idle' | 'saving' | 'saved'`. There is no `'error'` state. Read `components/workspace/workspace-footer.tsx` — `data-saving={saving}` is the only signal; the visible text is `saving ? 'Saving…' : 'Saved'`. An errored save returns to `'idle'` (or sets `'idle'` after `setSaveStatus('idle')` in the catch path) which renders as "Saved". On Supabase outage the editor lies to the clinician.
- **Fix:** Add `'error'` to the saveStatus enum in `useAutoSave`. On save failure set `'error'` and bubble the error to the chip. Render error state with a different colour and the word "Save failed — retrying" or "Offline — your edits aren't being saved".
- **Effort:** 30 min (touches hook + component, needs error-state visual design that matches existing tn- tokens).

### NEW-9 — `/generate` autosave writes PHI to localStorage with no encryption or TTL

- **Convergence:** qa-edge-cases (BUG-121)
- **Verification class:** Code claim
- **Verified by:** Read `hooks/use-form-draft.ts` — `window.localStorage.setItem(key, JSON.stringify(payload))`. No encryption, no TTL, no expiry. The payload includes `clinicalNotes` (PHI), `participantName`, `ndisNumber`, `participantDob`, `address`. On a shared workstation, the next user can read it via DevTools.
- **Fix:** Two-layer mitigation. (a) Add a TTL — clear the draft on logout, and on `useFormDraft` mount check `savedAt` and discard if >24h old. (b) Strip the most-sensitive fields (`participantName`, `participantDob`, `ndisNumber`, `address`) from the autosave snapshot — they're typically retyped from a referral every time anyway, and the rest of the form survives. Cheap version: just (a). Strict version: (a) + (b).
- **Effort:** 20 min for (a), 30 min for (a)+(b).

### NEW-10 — Cmd+Z silently does nothing in the workspace editor

- **Convergence:** qa-edge-cases (BUG-024/030/119)
- **Verification class:** Code claim, requires runtime confirm
- **Verified by:** `grep -n "HistoryPlugin\|history" lib/editor/plugins.ts` — no history plugin registered. Plate's editor needs an explicit history extension. Reading `node_modules/@platejs/...` confirms `HistoryEditor` is not exported by the basic plugin set. Cmd+Z will not undo edits.
- **Fix:** Plate provides history via the underlying Slate editor. Either install `@platejs/history` if it exists, or use Slate's `withHistory` wrapper when constructing the editor in `plate-editor.tsx`.
- **Effort:** 30 min (need to check the Plate v53 API for the right history hook; not in our context).
- **Caveat:** Falls into the "needs design call" bucket if the right Plate v53 history pattern requires non-trivial config. In that case → escalate, ship the rest.

---

## Findings escalated to "needs design decision"

These are real but require taste calls or non-trivial scope.

| # | Finding | Why escalated | Reviewer |
|---|---|---|---|
| ESC-1 | Two report stylesheets (`.report-document` and `.tn-doc`) render the same content visibly differently | Picking one is a design call (which one is canonical) | visual-craft |
| ESC-2 | No global ⌘K palette / search | New surface, needs design | pm-feature-gaps, ia-navigation |
| ESC-3 | Onboarding flow for first-time users | New surface, needs design + clinical input | pm-feature-gaps |
| ESC-4 | `/clients` entity (reports-as-root hits the wall at ~20-caseload) | Schema migration + IA rethink | ia-navigation, pm-feature-gaps |
| ESC-5 | Audit-log UI (generation_logs table is well-designed but invisible) | New surface, needs design | pm-feature-gaps |
| ESC-6 | "Resume after failure" affordance for half-generated reports | Needs UX flow design | pm-feature-gaps, qa-edge-cases |
| ESC-7 | DOCX letterhead typography refinements (NEW-14/15/16) | Taste calls, want clinician input | visual-craft |
| ESC-8 | No security headers (CSP, X-Frame-Options, HSTS) | Cross-cutting, needs deploy/middleware design | qa-edge-cases (BUG-117) |
| ESC-9 | No rate limiting on any API | Cross-cutting infra | qa-edge-cases (BUG-114) |
| ESC-10 | Mobile/responsive across all routes | Big audit, deferred unless mobile becomes a requirement | pm-feature-gaps |

---

## Rejected — evidence does not match claim

Per the v0.2 verify-before-fix gate, findings that don't survive verification get logged here with negative evidence so the user can spot-check.

| # | Claim | Reviewer | Negative evidence |
|---|---|---|---|
| REJ-1 | "Settings Profile feature non-functional in environment — migration 008 not applied to live Supabase, save returns 400" | clinician-workflow | Verified live by orchestrator: ran service-role `select display_name, credentials, ahpra_registration, clinic_name from clinician_profiles limit 1` — query returned with no error, columns exist. Reviewer hit a transient PostgREST schema-cache lag (caught by §9.5.1 transient-failure heuristic). Migration is in place. **No fix needed.** |
| REJ-2 | "DOCX silently fails for every report containing a Header table" — full-blanket version | clinician-workflow | The CLAIM is true for the workspace path (`plateToSections` → `editor.api.markdown.serialize` of unknown node types). The CLAIM is **not** true for the post-generate result page path (`ExportButton` → `generateDocx(sections)` directly from raw markdown strings, no Plate involvement). **Partial fix:** queue the workspace path only (REG-1 above). |

---

## Recommended fix sequence

**Day 1 (today, ~2-4 hours):** Regressions + the load-bearing user actions
1. REG-1 — Plate table → markdown serializer (DOCX from workspace)
2. REG-2 — Login residency claim
3. REG-3 — Print CSS disclaimer
4. REG-4 — Reports list user_id filter
5. NEW-1, NEW-2 — Login blue consistency (5+2 min)
6. NEW-3 — Generate labeled pill button (10 min)
7. NEW-4 — Delete Attach/Dictate/Template (5 min)
8. NEW-6 — Topbar `:focus-visible` (2 min)
9. NEW-7 — Workspace 404 keeps Topbar (10 min)
10. **User flips Supabase open-signup toggle** (manual)

**Day 2 (~2-3 hours):** Trust + safety
- NEW-5 — Server-side reports search
- NEW-8 — Three-state save indicator
- NEW-9 — Autosave TTL + (optionally) strip-most-sensitive

**Day 3 (~half day):** Editor
- NEW-10 — Cmd+Z / undo via Plate history
- ESC-7 — DOCX typography refinement (after a clinician sees one printed)

**Then re-run `/ux-review --round 3`** to verify everything landed and catch any new regressions.

---

## What's good and worth preserving

(Per the v0.2 spec — round 3 must read this section before changing anything in these areas.)

- **Phase B staged-generation architecture** is genuinely planner-grade. Don't touch the `requires` / `references` declarative model.
- **Plate table component bindings** (Day 1) made tables render correctly in the workspace — DON'T revert to fix the serializer issue. Add a serializer instead.
- **Workspace defense-in-depth user_id filter** (Day 2.5) is the right pattern. Just propagate it to the reports list (REG-4).
- **Branded login two-column layout** is a 3x perception jump from stock Supabase Auth UI. Just fix the colour mismatch (NEW-1, NEW-2).
- **Profile auto-fill from clinician_profiles** is genuinely magical. Just make it visible — open the Assessor collapsible by default if profile data is loaded (IA Issue 4).
- **`@media print` chrome-hiding** is sound — REG-3 is a single missed selector, not a redo.
- **Persistent Topbar across authenticated routes** — consistent now. The route-group refactor is polish, not a redo.
- **The `useFormDraft` hook + restore banner** is the right pattern. Just add TTL (NEW-9) and clear-on-logout.

---

## Per-reviewer report links

| Persona | File | Headline |
|---|---|---|
| visual-craft | `01` (in this folder) → `visual-craft.md` | C+ grade, 22 new findings, 3.5h to B+ |
| persona-workflow (clinician) | `clinician-workflow.md` | DOCX silent fail + dead generate buttons + still has validation gaps |
| pm-feature-gaps | `pm-feature-gaps.md` | 8/10 round-1 verified, 2 latent risks, multi-user yes-with-caveats |
| ia-navigation | `ia-navigation.md` | All 7 round-1 verified. Search/focus/404 are P0. Reports-as-root will hit a wall. |
| qa-edge-cases | `qa-edge-cases.md` | RLS verified live with forged user_id. Defense-in-depth gap on /reports. No CSP, no rate limit. |

Skill research at `SKILL-RESEARCH-ux-review.md`. Skill installed at `~/.claude/skills/ux-review/SKILL.md`.
