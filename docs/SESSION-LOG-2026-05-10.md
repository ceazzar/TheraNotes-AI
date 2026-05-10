# Session Log — 2026-05-10

**Duration:** Single continuous session, ~12-14 hours wall clock across an evening + morning
**Author:** Claude Opus 4.7 (1M context) running in Claude Code
**Outcome:** Production deploy live at theranotes.com.au, multi-agent UX review framework packaged as a reusable skill

---

## TL;DR for the next session

**The app is live in production at https://www.theranotes.com.au with all of the following work shipped via commit `424efad` on `main`:**

1. **Engine fixes**: RAG silent-failure surfaced, `gpt-4o` → `gpt-5.5` defaults across all paths, full Responses API migration with `reasoning.effort=high`
2. **Phase B staged generation**: per-section `requires`/`references` in template.json, `lib/ai/intake.ts` bucket-availability checker, `lib/ai/header.ts` deterministic Header builder, skip-pending gate that costs zero tokens when intake is missing
3. **Migrations 007 + 008** applied to prod Supabase project `iyjlbybgxdecruzgydll` (verified via service-role read)
4. **Days 1-4 UX overhaul**: persistent Topbar, dead-button purge, Sparkles purge (semantic icons only for AI actions), Base UI Select primitive, branded two-column login screen, /generate localStorage autosave with restore banner, Clinic Profile UI in Settings auto-filling /generate, DOCX rewrite with letterhead + markdown rendering + page numbers + footer disclaimer, @media print CSS, reports list search/filter/pagination, URL rename `/workspace/[id]` → `/reports/[id]` with permanent 308 redirect
5. **Day-2.5 P0 security**: `proxy.ts` fails CLOSED on missing/placeholder `SUPABASE_URL`, workspace + reports queries add explicit `user_id` filter alongside RLS, clinical-responsibility disclaimer in workspace footer, prompt-injection rule in section generation prompt, `safeCell` pipe-escaping in Header builder
6. **Round-2 verified surgical fixes** (4 regressions caused by my own work + 8 new findings from a second multi-agent review)
7. **3 upstream cherry-picks** (backslash regex, ghost-code-block filter, Plate typography defense)
8. **`/ux-review` skill installed at `~/.claude/skills/ux-review/`** — 5-agent parallel UX review with verify-before-fix gate, regression-catch as headline of round 2+, single round verdict by most-conservative-vote
9. **Open Supabase sign-up disabled** in dashboard (anyone-with-URL signup attack closed; verified via anon-key signUp probe → `signup_disabled` 422)

**The thing that wasn't done that the user wants done in the new session:** **a real round-3 multi-agent UX review against the LIVE production URL** (https://www.theranotes.com.au). Round 1 and Round 2 ran against the local dev server. Production has never been reviewed by the agents — only my own curl probes. There are deploy-pipeline-specific risks (Vercel edge middleware, build minification, real auth cookies, CDN caching of old vs new bundle) that local testing cannot catch.

The skill spec already supports this — see `~/.claude/skills/ux-review/SKILL.md` for full operational contract. The new session should `/ux-review --url https://www.theranotes.com.au --round 3`.

---

## Where to start the next session

Read these files in order, then read this section:

1. `docs/STRATEGY-2026-05-09.md` — the framing decision that started this work
2. `UI-UX/round-2/00-CONSOLIDATED-PUNCH-LIST.md` — what was on the table, what shipped, what was rejected, what was deferred
3. `UI-UX/round-2/SKILL-RESEARCH-ux-review.md` — the design rationale for the `/ux-review` skill (incl. the v0.3 dogfood-driven refinements)
4. `~/.claude/skills/ux-review/SKILL.md` — the actual installed skill (operational contract)
5. This file (session log)

Then run the kickoff prompt at the bottom of this document.

---

## Conversation arc — what actually happened

### Phase 0 — Project triage (yesterday evening)

The user came in asking me to look at three abandoned projects. The first two (Tribly, then a third I forget) got "kill it / reframe it" verdicts after multi-agent research dispatches. The TheraNotes-AI verdict was: **don't kill it, reframe as internal Flourish productivity tool, ship to one OT this week**.

Critical finding from the codebase audit: the founder's "PMF doubt" was anchored in a configuration bug. All AI calls defaulted to `gpt-4o`, the RAG layer was silently swallowing all Supabase errors via try/catch, `SUPABASE_SERVICE_ROLE_KEY` was a literal empty string in `.env.local`. Every test the founder ran was judging the *idea* against output produced by the wrong model with zero exemplar context. Output was generic; founder rationalised this as "PMF doubt"; reality was broken plumbing.

Wrote `docs/STRATEGY-2026-05-09.md` capturing the reframe + decision filter + ship-this-week plan.

### Phase A — Responses API migration

Migrated `generate.ts`, `revise.ts`, `refine/route.ts` from `client.chat.completions.create` to `client.responses.create` with `reasoning.effort=high`. Updated token accounting (`input_tokens`/`output_tokens` instead of prompt/completion). Fixed temperature handling — gpt-5 family reasoning models reject custom temperature, only default (1) is allowed.

E2E quality delta: Part E goal fabrication eliminated (model now writes `[INSUFFICIENT DATA]` instead of inventing goals from absent data), proportionality boundary phrases appearing, deeper clinical INSUF flagging.

Cost reality check (after the user pushed back on my $15-35/FCA estimate): pulled real token counts from `generation_logs`. Actual cost per FCA: **$0.25–$1.74** depending on which OpenAI tier `gpt-5.5` ends up at. At Flourish's 12 FCAs/month: $3-21/month — rounding error vs $40-90K/yr in saved OT time.

### Phase B — Staged-generation intake

Migration 007: added `intake_metadata JSONB` and `ndis_goals TEXT[]` to `assessments`. New files:

- `lib/ai/intake.ts` — bucket-availability checker (`client`/`assessor`/`assessment`/`clinical_notes`/`standardized_scores`/`ndis_goals`/`report_so_far`)
- `lib/ai/header.ts` — deterministic Header section builder, no LLM call, builds the Header table directly from intake fields (latency went from ~15s to **0.9s**)
- `requires` / `references` declarations on every section in `template.json`
- Skip-pending gate at top of `generateSection` — no LLM/RAG work happens for sections whose `requires` aren't satisfied. Returns `{ status: 'pending', missing: [...] }` with zero token spend.

Frontend: `/generate` extended with 5 collapsible intake sections (Client Details / Assessor / WHODAS / Sensory Profile / NDIS Goals) + section preview banner ("Will generate X of 8 sections"). `FormattedReport` renders pending sections as dashed-border placeholder cards.

E2E re-run with full intake: **8/8 sections ready, 0 pending, 7,610 words, INSUF markers down from 18 → 7**. Spot-checks confirmed Header populated from intake, Part E quoted goals verbatim, Part D produced full WHODAS interpretation.

### Day-1 UX batch (round-1 reviewers' agreed P0s)

After Phase B I dispatched 5 specialist Opus reviewers in parallel against the local dev server: visual-craft, clinician-workflow, pm-feature-gaps, ia-navigation, qa-edge-cases. Each produced a 3000-5000 word report; I consolidated them into `UI-UX/00-CONSOLIDATED-PUNCH-LIST.md`.

Day-1 fixes shipped (all verified-before-fix, several reviewer claims rejected with negative evidence — credentials-committed, XSS, PDF-parser-broken were all false alarms):

- Workspace markdown table rendering — Plate's TablePlugin registered schema but no React components were bound; tables rendered as flat vertical text. Created `components/workspace/plate-elements.tsx` with `TableElement`/`TableRowElement`/`TableCellElement`/`TableHeaderCellElement` and wired them via `TablePlugin.withComponent()` + `.extend()` override.
- Persistent Topbar on /workspace and /settings (was 3 different chrome systems)
- Quick-add chips removed from /generate (clinically contaminating sample text)
- Dead workspace buttons removed (Find / Appendices / Signatures had no onClick)
- Sparkles icon purge — 8+ unrelated uses → 5 consistent AI-only uses (Refine, Apply fix, generation in progress). Brand mark = `Stethoscope`.
- 5 native `<select>` → Base UI `Select` primitive in `components/ui/select.tsx`
- Native `<details>` chevron char → inline lucide-stroke SVG
- Real branded login screen replacing stock Supabase Auth UI

### Day-2 UX batch

- `hooks/use-form-draft.ts` — debounced localStorage autosave with restore banner, per-user keyed
- Migration 008: added `display_name`, `credentials`, `ahpra_registration`, `contact_email`, `contact_phone`, `clinic_name`, `clinic_abn`, `ndis_provider_number`, `clinic_address` to `clinician_profiles`
- `lib/profile.ts` + `components/settings/profile-form.tsx` for clinic profile management
- Header builder reads profile defaults — pre-fills assessor name/credentials/email/company/AHPRA registration when per-report intake omits them
- /generate auto-fills assessor fields from profile on mount (only when blank — never overwrites typed input)

### Day-2.5 P0 security/clinical batch

(Inserted between Days 2 and 3 when the user asked "is this multi-user ready / clinical-data ready")

- `proxy.ts` fails CLOSED on missing or `placeholder` `SUPABASE_URL` (was fail-open — silent auth bypass on misconfig)
- Workspace `report` fetch + update both add explicit `.eq('user_id', user.id)` defense-in-depth alongside RLS
- Clinical responsibility disclaimer ("AI-drafted. Clinician review required before submission.") in workspace footer
- Prompt-injection mitigation rule (#10) in section generation prompt — instructs model to treat clinical notes / questionnaire data / participant fields as data, not instructions
- `safeCell` pipe-escaping in Header builder

### Day-3 UX batch

- `lib/export/docx.ts` rewritten — was a flat-paragraph dump that printed lists as `* item` and tables as `| col |`. Now renders markdown headings (h2/h3 → DOCX heading 3/4), bullet lists with proper bullet formatting, pipe-delimited tables as DOCX tables, bold/italic. Adds letterhead from clinician profile, page numbers, footer disclaimer ("AI-drafted. Clinician review required before submission.").
- Deduped 3 in-component DOCX implementations (`workspace-layout.tsx`, `export-button.tsx`) to delegate to shared `lib/export/docx.ts`
- Full `@media print` block hides all chrome (topbar, sidebar, footers, banners, disclaimer chip), sets A4 page with 18×16mm margins, page-break rules at major sections, force black text + white background

### Day-4 UX batch

- `components/reports/report-list.tsx` extended with always-visible search input + status filter + load-more pagination + always-visible "+ New report" CTA (was empty-state only)
- URL rename `/workspace/[id]` → `/reports/[id]` with permanent 308 redirect via `next.config.ts` redirects(). All internal links updated.

### Round-2 multi-agent review

After all UX work landed, dispatched the same 5 reviewers in **verification mode** with explicit mandate to verify each shipped item still works AND check whether shipping it broke anything adjacent. Plus dispatched a 6th agent (skill-creator) to package the whole pattern as a reusable `/ux-review` skill.

Round-2 produced the most valuable single finding of the session: **regressions I caused myself**. Four direct regressions from Day-1-3 fixes:

- **REG-1** — DOCX export silently broken for any report with a Header table. My Day-1 added Plate `table`/`tr`/`td` components for *display* but the serializer path (`editor.api.markdown.serialize` in `plate-to-sections.ts:28`) had no handler for these node types. Round-trip from editor → markdown → DOCX silently produced garbage.
- **REG-2** — "Australian-region storage" misstatement removed from /generate but reintroduced on /login by my Day-1 login rebuild.
- **REG-3** — Day-3 print CSS hid the AI-drafted disclaimer along with all other chrome (regressed Day-2.5).
- **REG-4** — Day-4 added pagination to reports list without copying the Day-2.5 user_id defense-in-depth pattern.

Plus 8 new P0/P1 findings: login submit-button blue mismatch (NEW-1), Generate button still 36px chat-icon for $$ action (NEW-3), dead Attach/Dictate/Template tools on /generate (NEW-4), reports search returns false negatives past page 1 (NEW-5), `.tn-nav-item` missing :focus-visible (NEW-6), workspace 404 strands user with no Topbar (NEW-7), three-state save indicator missing (NEW-8), autosave writes PHI to localStorage with no encryption or TTL (NEW-9).

All 12 round-2 fixes shipped with `Verified by:` audit-trail per the v0.3 verify-before-fix gate. **NEW-2 was rejected with negative evidence** — `var(--tn-accent, #2851a3)` resolves to the defined token, not a literal blue.

### `/ux-review` skill installation

Installed at `~/.claude/skills/ux-review/SKILL.md` (363 lines). The skill packages the multi-agent UX review pattern with several opinionated rules baked in:

- **Verify-before-fix gate** (rule #1) — every candidate fix gets classified into code/runtime/config and verified against the evidence before any edit. Rejected findings get negative evidence in a dedicated table at the bottom of the punch list.
- **Regressions sort to top** (rule #13) — orchestrator-caused regressions outrank new findings regardless of severity, because trust compounds.
- **Single round verdict** (rule #14) — most-conservative-vote rule. One `no` from any reviewer = round verdict is `no`.
- **Per-class verification minimums** (rule #15) — code claim = read file:line; runtime claim = curl/screenshot/script; config claim = dashboard/file/env target with explicit user-vs-orchestrator action tag.
- **`Verified by:` mandatory on every P0 and P1** (rule #16) — not just shipped fixes, so the user can spot-check what was checked vs trusted.
- **Preservation rationale required** (rule #17) — any fix touching a previous round's "What's good and worth preserving" area must include a one-sentence rationale in the commit body.
- **Self-tuning auto-ship cap** (rule #11) — no magic integer; verification budget + mechanical + non-conflicting + re-verifiable, until budget exhausts or pool runs dry.
- **Transient-failure heuristic** for config-class probes — 400/406/PGRST/schema-cache signatures retry once after 30s grace (avoids the false "Profile save fails" claim that was actually PostgREST schema cache lagging).

Full design spec at `UI-UX/round-2/SKILL-RESEARCH-ux-review.md` (~3,500 words + v0.2 + v0.3 changelogs).

### Upstream extraction pass

`origin/main` had 26 commits I didn't have — almost entirely a Plate.js Pro AI-editor experiment (someone's parallel branch?) including a 120-file `feat: upgrade Plate.js editor from basic to full AI editor (#2)` commit + a chain of `fix: revert / fix: missing dep / fix: config` work that suggested it never stabilised.

Walked all 26 commits in a `/tmp/upstream-main` worktree, verified each against my code, decided per-commit:

**Pulled (3):**
- `ca4d261` backslash regex `\\+(?=[[\]])` not `\\(?=...)` — strips ALL accumulated bracket-escapes, not just one
- `edad007` ghost code-block filter — Plate's markdown deserializer produces empty code_block nodes from stray content
- `edad007` `[data-slate-editor]` typography scope — defensive override against Plate's default styles winning over `.tn-doc`

**Skipped (12 + the Plate Pro chain):**
- `a112827` two-phase generation — interesting concept (workspace upload-PDF panel for D&E generation) but `await file.text()` produces garbage on PDF/DOCX (binary formats), conflicts with my Phase B structured intake
- `markdown-joiner-transform.ts` — Vercel AI SDK streaming utility for Plate Copilot, not for my Responses API flow
- `086e47d` + 14-commit Plate Pro chain — generic editor features (callouts, footnotes, dnd, slash command, copilot) the FCA workflow doesn't need; pulling would lose all my work
- `fdd804c` "remove playwright" — initially dismissed because I checked the wrong tree (upstream's, where playwright had already been removed) instead of my branch's package.json. **THIS ONE BIT ME** — I missed it during extraction, the deploy failed, I had to re-fix later. v0.4 lesson for the skill: verify-before-fix probes must always run against the target tree, never against the source tree.

### Branching + force-push to main

Created feature branch `ux-review-overhaul-2026-05-10`, pushed, opened PR #3, then per user direction force-pushed it over `main` (replacing the 26 abandoned upstream commits entirely). Saved the abandoned upstream as branch `abandoned-main-2026-05-10` on origin so any of those commits are recoverable.

PR #3 auto-marked as merged. Vercel triggered production build.

### Production deploy fix

Vercel build failed with `ERR_PNPM_OUTDATED_LOCKFILE` — `package.json` declared `playwright@^1.59.1` but `pnpm-lock.yaml` didn't have it. (This was the upstream `fdd804c` fix I had wrongly dismissed.)

Removed `playwright` from `package.json` (it was a dead declaration — zero application code references; was only useful as local dev tooling for the gstack browser-automation skills, which bring their own deps). `pnpm install --lockfile-only` confirmed the lockfile was already consistent without it. Pushed `424efad`. Vercel build succeeded in 33s.

### Final verification (the parts I DID do)

- All 7 routes on `https://www.theranotes.com.au` respond correctly: `/` 307→/login, `/login` 200, `/generate`/`/reports`/`/settings` 307→/login, `/workspace/abc123` 308→/reports/abc123, `/reports/abc123` 307→/login
- Live HTML grep confirmed: residency misstatement gone (0 matches), branded login shell present (`tn-auth-shell`), stock Supabase Auth UI gone (0 matches)
- Migration 007 verified via service-role read of `assessments.intake_metadata, ndis_goals` — OK
- Migration 008 verified via service-role read of `clinician_profiles.display_name, credentials, ahpra_registration, clinic_name, ndis_provider_number` — OK
- Open Supabase sign-up disabled — verified via anon-key `signUp()` probe → `Signups not allowed for this instance`, status 422, code `signup_disabled`

### What I DID NOT do (the gap the new session must fill)

**No multi-agent UX review against the live production URL.** Round 1 ran against localhost:3000. Round 2 ran against localhost:3001. My production "verification" was 7 curl calls and 3 grep checks. That is not a UX review.

Risk surface I haven't tested:
- Vercel build optimisation may have inlined/minified differently than dev (CSS, JS bundling, tree-shaking)
- The Vercel Edge middleware (`proxy.ts`) running in real edge runtime, not Node dev runtime
- Auth cookies, RLS, Supabase under real network conditions vs localhost
- TLS handshake, latency, CDN caching of old vs new bundle for returning users
- Browser caching — a returning user might be on the old JS bundle for hours
- Real interactive flow: click a real Generate button (would burn ~$1 if I did it from the orchestrator, ~$1 per agent if a reviewer triggered it — the cost-guard rule explicitly forbids this without user confirmation)
- Real DOCX export with the REG-1 fix — I never clicked it on prod
- Real Plate.js editor interactions in prod browser — the 3 upstream-extracted fixes (backslash regex, ghost-code-block, [data-slate-editor] typography) need actual rendering to verify they work

This is what the new session is for.

---

## Files of record

| File | Purpose |
|---|---|
| `docs/STRATEGY-2026-05-09.md` | Original "reframe TheraNotes as internal Flourish tool, not SaaS" decision doc + appendix of what shipped Days 0-Phase B |
| `docs/SESSION-LOG-2026-05-10.md` | This file |
| `UI-UX/00-CONSOLIDATED-PUNCH-LIST.md` | Round-1 consolidated punch list — 4-day fix sequence |
| `UI-UX/01-visual-craft-review.md` thru `UI-UX/05-qa-edge-cases-review.md` | Round-1 reviewer outputs (5 files, ~17K words combined) |
| `UI-UX/round-2/00-CONSOLIDATED-PUNCH-LIST.md` | Round-2 consolidated punch list using v0.2 format (verdict block, user-action block, regressions-orchestrator-caused at top, verified-by audit trail, rejected-with-evidence) |
| `UI-UX/round-2/<persona>.md` | Round-2 reviewer outputs (5 files) |
| `UI-UX/round-2/SKILL-RESEARCH-ux-review.md` | Full design spec for the `/ux-review` skill — read §9.5 (verify-before-fix gate), §9.6 (regression-catch is the headline of round 2+), §10 (the SKILL.md draft), and the v0.2 + v0.3 changelogs |
| `~/.claude/skills/ux-review/SKILL.md` | The actual installed skill — operational contract for `/ux-review` invocations |
| `tests/e2e/peter-parker-e2e.mjs` | E2E test against the FCA pipeline using a reference clinical case |
| `supabase/migrations/007_intake_fields.sql` | Phase B migration — applied to prod |
| `supabase/migrations/008_clinician_profile_fields.sql` | Day-2 migration — applied to prod |

---

## Current state of the world

- **Git**: `main` at `424efad`, 4 commits ahead of where it was at session start (`feat:` overhaul, `docs:` ux-review reports, `fix:` upstream cherry-picks, `fix:` playwright removal)
- **Recovery**: abandoned upstream main = branch `abandoned-main-2026-05-10` on origin
- **Vercel**: production deploy live, sha `424efad`, last successful build took 33s
- **Supabase**: project `iyjlbybgxdecruzgydll`, migrations 007 + 008 applied, open sign-up disabled
- **Local dev server**: was running on `localhost:3001` at session end (3000 was held by an earlier process)
- **Test user**: `test@user.com` / `test123` exists in Supabase Auth
- **Skill ecosystem**: `/ux-review` is now in `~/.claude/skills/ux-review/SKILL.md` and discoverable

---

## Known v0.4 lesson for the skill

When extracting fixes from another tree (like the round-1 upstream-extraction pass), verify-before-fix probes must always run against **the target tree (mine)**, never against **the source tree (upstream's)**. I dismissed the playwright removal because upstream's `package.json` no longer had it — completely missing the point that mine still did. Build failed for it.

This is a one-line addition to SKILL.md rule #15 ("verify-before-fix probes target the tree being modified, not the source tree the fix was extracted from"). Add it next time the skill gets touched.
