# `/ux-review` — Skill Research & Spec

**Author:** research agent  
**Date:** 2026-05-10  
**Source pattern:** TheraNotes-AI Round 1 — five parallel Opus reviewers + auto-consolidated punch list, executed against `localhost:3000` on 2026-05-09. Round 1 outputs (`UI-UX/00`-`05`) are the gold standard this skill packages.

---

## 1. What this skill is

`/ux-review` dispatches five specialist Opus subagents in parallel against a running web app, each reviewing a different UX dimension (visual craft, persona workflow, PM feature gaps, IA/navigation, edge-cases & a11y/security), and then auto-consolidates their findings into a single morning punch list with file:line citations and a recommended fix sequence. It produces what a senior cross-functional product team would catch in a one-day audit, executed in ~10 minutes of wall time, and ships zero-risk fixes immediately so the user wakes up to a better app and a prioritised list of decisions to make. Round 2 onward is **verification mode** — the same five agents are handed the previous round's reports and asked to verify what shipped vs what's still broken.

---

## 2. When it should activate

**Trigger phrases (description field, primary):**
- "ux review", "ux audit", "full ux review"
- "five agent review", "panel review", "design and product review"
- "is this app good enough", "what's wrong with my app", "audit my app like a real team would"
- "morning punch list", "overnight audit"

**Voice triggers (speech-to-text aliases):** "ux review", "u x review", "punch list", "five agent audit", "panel audit"

**Proactive suggestion conditions:**
- User just shipped a major feature and asks "does this feel right?"
- User says they want to send the app to beta testers / their first OT / a friend
- A previous `/ship` or `/qa` just landed something significant on a feature branch
- User has a `UI-UX/` folder with a previous round and is talking about iteration

**Do NOT activate when:** the user wants a quick visual polish only (use `/design-review`), a bug-only QA pass (use `/qa-only`), a plan-mode review before code is written (use `/plan-design-review` + `/plan-eng-review`), or a single-axis audit. `/ux-review` is the heavy multi-perspective pass; it costs 5x the tokens of a single review.

---

## 3. Inputs the skill needs from the user

The skill should auto-detect everything it can and only ask for what it cannot.

| Input | Default / detection | Override |
|---|---|---|
| **Base URL** | Auto-detect: read `package.json` `dev` script for port, or scan `localhost:3000`/`:4000`/`:8080`/`:5173` with `$B goto` and pick the first 200. Then verify the dev server is running with a `curl -sI` ping. | `--url https://staging.example.com` |
| **Auth** | Detect login route (`/login`, `/signin`, `/auth`). If a CDP browser session exists, use it. Otherwise check for a `.gstack/cookies.json` or test credentials in `.env.test`. If nothing, ask once. | `--user test@user.com --pass ...`, `--cookies cookies.json`, `--cdp` |
| **Persona pack** | Detect from `package.json` description, `CLAUDE.md`, and route patterns: clinical / B2B-internal / consumer / dev-tools / ecommerce / marketplace. Default = **B2B-internal**. | `--personas clinical`, `--personas dev-tools`, `--personas custom:./ux/personas.md` |
| **Cost guard** | Detect "expensive action" buttons by scanning JSX for: text matching `/Generate\|Send\|Pay\|Submit order\|Charge\|Publish\|Notify\|Invite\|Email\|SMS\|Call API\|Run/i` near `<Button>` / `<button onClick>`. Surface the list and ASK before dispatching. | `--no-click "Generate,Send invoice,Email participant"`, `--cost-guard off` (only if user is in dev with mocked services) |
| **Round number** | Auto-detect: count `UI-UX/round-*/00-CONSOLIDATED-PUNCH-LIST.md` files plus the root one. Round 1 = baseline. Round 2+ = verification mode. | `--round 2`, `--round baseline` to force fresh |
| **Output dir** | `UI-UX/` for round 1, `UI-UX/round-N/` for N≥2. | `--out ./reviews/2026-05-10/` |
| **Scope** | Full app. | `--scope "/generate,/workspace"` to focus the agents |

**The one mandatory upfront question** (`AskUserQuestion`, every run, no never-ask override): "I'm about to dispatch 5 reviewers against `<URL>`. They will navigate, click safe affordances, and take screenshots — but I've identified `<N>` buttons that look like they cost money or have side effects: `[list]`. OK to add these to the do-not-click list?" with options:
- A) Yes, do not click these (recommended)
- B) Add more — I'll specify
- C) Allow everything — this is a sandbox / dev environment with mocks

This question is one-way (cost-impacting), so even with question tuning enabled it should always ask.

---

## 4. Default 5 personas and how to swap them

The five personas are **roles**, not scripts. Each gets the same target URL, the same do-not-click list, and the same output schema, but a different lens prompt and a different reviewer character.

### 4.1 Default pack (`--personas b2b-internal`)

| # | Role | Reviewer character | Output filename |
|---|---|---|---|
| 1 | **Visual craft** | Senior product designer, Linear/Notion/Vercel lens. Cares about typography, brand cohesion, native-vs-shadcn drift, AI-cliché icons (Sparkles overuse), colour systems, focus states, spacing rhythm. | `01-visual-craft-review.md` |
| 2 | **Persona workflow walk-through** | The actual primary user. For B2B-internal default = "internal operator with 3 years on competing tools." Drives the live UI as that user would, narrates friction in their voice. | `02-persona-workflow-review.md` |
| 3 | **PM / feature-gap audit** | PM with internal-SaaS pattern recognition. What's structurally missing vs a credible product? Account/identity, library, drafts/autosave, settings, audit, recovery, multi-user. Builds a 1-week roadmap. | `03-pm-feature-gaps.md` |
| 4 | **IA / navigation** | Senior IA strategist (Stripe/Vercel/Linear lineage). Walks every route, draws the actual sitemap, finds dead buttons, URL/IA mismatches, missing global search, breadcrumb inconsistencies, mental-model gaps. | `04-ia-navigation-review.md` |
| 5 | **Edge cases / a11y / security** | Senior QA + a11y + security review. Auth fail-open, RLS / tenant isolation, prompt injection, validation gaps, keyboard/ARIA, print/export, error contracts, console hygiene. | `05-qa-edge-cases-review.md` |

### 4.2 Persona packs (project-shaped defaults)

The skill ships these and the user picks one or supplies a custom file:

- **`clinical`** — persona 2 = "senior clinician, 15 years, drives the live UI with a real-looking patient case (e.g. Peter Parker reference notes). Refuses to trigger paid generation."  
- **`b2b-internal`** (default) — persona 2 = "internal operator at a 5-person team, 3 years on the previous tool."  
- **`consumer`** — persona 2 = "first-time user, no context, found the app on a tweet, has 90 seconds before they bounce." persona 5 leans heavier on perf and mobile.
- **`dev-tools`** — persona 2 = "senior eng with 5 minutes, trying to ship to prod tonight, will close the tab if onboarding takes more than 90s." persona 3 = DX gap audit instead of PM gap audit.
- **`ecommerce`** — persona 2 = "shopper with a cart, on mobile, on the train." persona 5 leans on checkout edge cases, payment, abandoned-cart flows.
- **`marketplace`** — two personas in slot 2: buyer and seller. Bumps to 6 reviewers total for this pack only.

### 4.3 Custom persona file

A user can write `UI-UX/personas.md` with five YAML blocks, one per persona. The skill reads it, validates that each has `role`, `character`, `lens`, `output_filename`, then uses those verbatim as agent prompts. This is how each project tunes the panel without modifying the skill.

```yaml
- role: clinician_workflow
  character: "Senior OT, 15+ years, FCAs weekly. Beta tester for Flourish Health internal tool."
  lens: "Drive the live UI with the Peter Parker reference notes. Do NOT click Generate. Narrate in OT voice. Translate clinical needs into product requirements for a non-clinician founder."
  output_filename: 02-clinician-workflow-review.md
  must_test:
    - "Login -> default landing experience"
    - "Intake form on /generate (do not submit)"
    - "Reports list usability"
    - "Workspace post-generate (open an existing report)"
    - "Settings completeness"
  must_not_click:
    - "Generate"
    - "Run NDIS review"
```

---

## 5. Cost-guard pattern

Five agents in parallel, each clicking liberally, against a real dev server hitting OpenAI/Stripe/Twilio/SendGrid is a way to spend a lot of money very fast. The cost guard has three layers.

### 5.1 Static scan (before dispatch)

```bash
# Find buttons whose label or handler suggests a paid/external action
grep -rEn '(<Button|<button|onClick)[^>]*(Generate|Send|Pay|Submit|Charge|Publish|Notify|Invite|Email|SMS|Run|Refine|Regenerate|Revise|Review)' \
  app/ components/ src/ 2>/dev/null \
  | head -50
```

Plus an LLM-grade pass: the orchestrator reads the route tree, identifies primary CTAs per route, classifies each as **safe** / **side-effect** / **paid**, and surfaces the **paid** + **side-effect** lists for confirmation.

### 5.2 Per-agent prompt block (always included)

Every dispatched agent gets a verbatim "DO NOT CLICK" block in its system prompt:

> ## Cost guard — read first
> 
> The following actions cost real money or trigger real external side effects. **Do not click these under any circumstances**, even to verify another finding:
> 
> - `Generate` button on `/generate` (triggers OpenAI calls, ~$1-3 each)
> - `Send` button on any email composer
> - `Run NDIS review` on `/workspace/[id]` (triggers paid agent service)
> - [project-specific list from --no-click]
> 
> If a finding requires triggering one of these to verify, document the finding with the evidence you DO have, mark severity as you would if verified, and add `Verification blocked by cost guard — needs manual confirmation` to the finding. Do NOT trigger as a workaround.

### 5.3 Browser-level enforcement (defense in depth)

If the browse tool supports it (`$B intercept`), block the underlying network calls so even a misguided click is a no-op. Pattern:

```bash
$B intercept --block "POST /api/generate"
$B intercept --block "POST /api/review"
$B intercept --block "POST https://api.openai.com"
```

Document this in the report so the user knows clicks may have appeared to succeed but were blocked at the network layer.

### 5.4 Open question

For projects without a known free path (e.g. an app where every meaningful action is paid), the skill should fall back to **read-only mode** — agents may navigate and screenshot but may NOT click any button outside the cost-guard's known-safe list (auth, navigation, expand/collapse, sort, filter, search, scroll). This trades some workflow coverage for safety. See §12.

---

## 6. Browser tooling — fail loudly if missing

Round 1 had one agent (the visual reviewer) silently fall back to source-only review because it never had a working browser binding. That's a real bug — source-only reviews miss layout, focus state, hover state, computed colour, and rendered typography. **The skill must fail loudly if no browser tool is wired in, before dispatching any agent.**

### 6.1 Detection order

1. **`$B` (gstack browse)** — preferred. Fast, headless, has CDP mode, `snapshot -i -a`, `console --errors`, `intercept`. Detection identical to `qa-only` SKETCH:
   ```bash
   _ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
   B=""
   [ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
   [ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
   [ -x "$B" ] && echo "BROWSE_READY: $B" || echo "BROWSE_NOT_READY"
   ```
2. **`webapp-testing` skill** — Playwright-based fallback if browse is unavailable. Slower but adequate.
3. **MCP browser tools** — if user has a Chrome connected via MCP, last resort.

### 6.2 Hard gate

If detection step 1 fails and the user has not opted into a fallback, the skill STOPS and uses `AskUserQuestion`:

> No browser tool is available. `/ux-review` requires a real browser so reviewers can see what users see — source-only review misses 60% of visual and interaction findings. Three options:
> 
> A) Build the gstack browse binary now (~10 sec) — recommended  
> B) Use the `webapp-testing` Playwright fallback — slower but works  
> C) Source-only mode — five agents review the codebase only. Lower-quality output, mark report header `SOURCE-ONLY` so you don't trust visual findings.

Recommendation: A. C is allowed but every report must carry a header banner saying source-only.

### 6.3 Per-agent browser session

Each agent gets its **own** browse session (different `--profile-name` or its own Playwright context). Otherwise five agents stomp each other's navigation, cookies, and viewport. The orchestrator allocates `ux-review-1` through `ux-review-5` profile names and tears them down after.

---

## 7. Output format conventions

### 7.1 Folder layout

```
UI-UX/                                  # round 1 baseline
├── 00-CONSOLIDATED-PUNCH-LIST.md       # auto-consolidated, written last
├── 01-visual-craft-review.md
├── 02-{persona}-workflow-review.md     # filename comes from persona pack
├── 03-pm-feature-gaps.md
├── 04-ia-navigation-review.md
├── 05-qa-edge-cases-review.md
├── screenshots/                        # per-agent subfolders
│   ├── 01-visual/
│   ├── 02-workflow/
│   └── ...
├── personas.md                         # custom persona file (optional)
└── round-2/                            # round 2+
    ├── 00-CONSOLIDATED-PUNCH-LIST.md
    ├── 00-VERIFICATION-MATRIX.md       # round 2+ only — what shipped vs what didn't
    ├── 01-visual-craft-review.md
    └── ...
```

Round N for N≥3 lives in `round-N/`. The previous round's punch list is read by every round-N agent as context.

### 7.2 Per-report schema (each agent must produce)

```markdown
# {Persona} Review — {Project}

**Reviewer:** {character string}
**Date:** YYYY-MM-DD
**Build:** {URL} @ {git short sha}
**Method:** {browser tool used} + {source files inspected}
**Cost guard:** Blocked: [list]. Verification gaps noted inline.
**Round:** N (Verification mode if N>1; baseline if N=1)

## Vote (MANDATORY — first thing the orchestrator reads)

**My round verdict:** `yes` | `yes-with-caveats` | `no` | `abstain`
**One-line reason:** {<= 120 chars, used verbatim in the consolidated punch list}

## Suspected regressions from round N-1 (round 2+ only)

| # | Round-N-1 fix that may have regressed | What I observed now | Re-test method |
|---|---|---|---|

If none, write "None observed in this review path." — do not omit.

---

## TL;DR — top 5 most damaging issues

[Numbered, one paragraph each, each with file:line]

## Walk-through narrative

[Live, first-person account of driving the app. Screenshots inline.]

## Findings (severity-ranked)

Every finding uses a stable id of the form `<REVIEWER-PREFIX>-N` where the
prefix is fixed per persona (visual-craft = `VC`, persona-workflow = `WF`,
pm-feature-gaps = `PM`, ia-navigation = `IA`, qa-edge-cases = `QA`). Numbers
restart at 1 per round; round 2+ resets so consolidator can deterministically
cluster across rounds.

### P0 — ship-blockers
| ID | Finding | File:line | Evidence | Fix |
|---|---|---|---|---|

### P1 — major friction
[same table]

### P2 — minor / nit
[same table]

## What's good and worth preserving

[Things the next round should NOT change. Important — without this section,
each round risks regressing things the previous round praised.]

## Recommended sequence
[Day 1 / Day 2 / Day 3 batches with hour estimates.]
```

### 7.3 Length target

Each report: 3,000-5,000 words. Less and you're not doing the depth the round-1 reports had. More and the consolidator chokes. Enforce with a soft instruction in the agent prompt and a hard truncation only if the agent exceeds 8,000 words.

### 7.4 Citation rule

**Every finding must cite `file:line` or include a screenshot path.** Findings without evidence are dropped at consolidation time. This is the single biggest lever on report quality. Round 1's reports were strong because every finding had `app/login/page.tsx:33-34`-style citations.

---

## 8. Auto-consolidation step

After all five reports land, the orchestrator (the parent Claude that ran the dispatch) runs the consolidation pass. The pattern from `00-CONSOLIDATED-PUNCH-LIST.md` is the spec.

### 8.1 Algorithm

1. **Read all five reports** plus any custom `personas.md` for context. Read each report's mandatory `## Vote` block FIRST.
2. **Compute the round verdict** by most-conservative-vote (one `no` = `no`). Build the verdict table.
3. **Read each report's `## Suspected regressions from round N-1` section** (round 2+ only). Promote anything plausible to the regression queue for verification.
4. **Extract findings** into a normalized table: `{id, title, severity, files_lines, reviewers, fix_hint}`. Use the per-report `<PREFIX>-N` ids — that's why the schema mandates them.
5. **Cluster duplicates** — group findings by `file:line` range first (deterministic), then by root cause for runtime claims that don't have file:line. Cluster name = the most descriptive title across the cluster.
6. **Convergence-weight** each cluster: count distinct reviewers. 5/5 > 4/5 > 3/5 > 2/5 > 1/5.
7. **Re-rank** within each severity bucket by convergence count, then by reviewer-assigned severity.
8. **Sort regressions to the top** of the queue (per §9.6 rule B), tag with `REGRESSION FROM ROUND N`. They precede every new finding regardless of severity.
9. **Identify "zero-risk surgical fixes"**: clusters where (a) ≥2 reviewers agree (or it's a regression — single-reviewer regressions still qualify because they're orchestrator-caused), (b) the fix is mechanical, (c) no design decision required, (d) doesn't touch shared schema.
10. **Identify "needs design decision"** clusters: 3+ reviewers agree something is wrong but the fix has UX/scope tradeoffs.
11. **Read the previous round's `What's good and worth preserving` section** (round 2+ only). For every fix you're about to ship that touches a "preserved" area, add a one-sentence rationale to the commit body explaining why this change doesn't violate the preservation. Refuse to ship if you can't write that sentence honestly.
12. **Build recommended sequence** — Day 1 = regressions + user actions, Day 2-N = remaining batches with hour estimates.

### 8.2 Output template

```markdown
# Morning Punch List — Consolidated UI/UX Findings

**Generated:** YYYY-MM-DD (round N)
**Sources:** 5 reviewers ({names}) — full reports in this folder, ~17,000 words combined.

## What I already fixed tonight
[Table of zero-risk surgical fixes the orchestrator executed.]

## Convergence-weighted findings (most important first)

### P0 — ship-blockers (4-5 reviewers agree)
[Table]

### P0 — security / trust killers (single-reviewer but high-stakes)
[Table — single-reviewer findings get promoted if severity is auth/PII/data-loss]

### P0 — broken core deliverables (2 reviewers, severe)
[Table]

### P1 — visual cohesion / brand
### P1 — IA / discoverability
### P1 — input validation gaps
### P2 — performance / nice-to-have

## Recommended sequence (4-day batch)
[Day batches with hour estimates]

## What's good and worth preserving
[Synthesized across all five "what's good" sections]

## Reading order if you only have 30 minutes in the morning
[1. This file 2. The reviewer with the most evidence (live screenshots) 3. ...]
```

### 8.3 Disagreement handling

When reviewers disagree (e.g. visual says "delete the chips", PM says "keep them but rewire"), the consolidator does NOT pick a winner. It writes both views into the punch list under the cluster, marks it `DISAGREEMENT`, and adds a one-line recommendation framed as a question for the user. User sovereignty wins — the orchestrator never silently resolves a taste call.

---

## 9. Verification mode (round 2+)

Round 2's failure mode is "five agents re-discover the same five things round 1 found and the user gets identical reports." Verification mode prevents this.

### 9.1 What changes

Each round-N agent (N≥2) receives, in its prompt:

1. **The previous round's report for its persona** (e.g. round-2's visual reviewer reads `UI-UX/01-visual-craft-review.md`).
2. **The previous round's consolidated punch list** (`UI-UX/00-CONSOLIDATED-PUNCH-LIST.md`).
3. **The git diff since the previous round** (`git log --since=<previous round date>`, `git diff <prev-sha>..HEAD --stat`).
4. **An explicit verification mandate** (see below).

### 9.2 Verification mandate (prompt block)

> ## Round N — Verification mode
> 
> You reviewed this app on YYYY-MM-DD. Your previous report is attached. The user committed code since. Your job in this round is **not** to re-discover everything — it's to **verify the punch list**.
> 
> For each P0/P1 finding in your previous report:
> - Navigate to the relevant route, take a fresh screenshot.
> - Was it fixed? Mark `FIXED` with evidence.
> - Was it partially fixed? Mark `PARTIAL` and describe what's still broken.
> - Was it not addressed? Mark `OPEN`.
> - Was it claimed-fixed but the fix is broken in a new way? Mark `REGRESSED` and describe.
> 
> Then — and only then — surface up to 5 **new** findings you noticed this round. New findings are bonus; verification is the job.

### 9.3 Verification matrix

The consolidator produces an additional `00-VERIFICATION-MATRIX.md` for round 2+:

```markdown
# Round 2 — Verification Matrix

| # | Round 1 finding | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | Avatar menu crash | FIXED | screenshots/01-visual/avatar-menu.png | wrapped in DropdownMenuGroup, verified by 3 agents |
| 2 | Saved just now trust killer | FIXED | ... | ... |
| 11 | Markdown tables broken in workspace | PARTIAL | ... | renders now but cell borders missing |
| ... | ... | ... | ... | ... |

**Summary:** N fixed, M partial, K open, J regressed.
```

This is the primary artifact for round 2+. The morning punch list still gets generated but the matrix is what the user reads first.

---

## 9.5 The verify-before-fix gate (THE LOAD-BEARING RULE)

> **Rule:** No edit ships without verifying the finding against the actual current state of the code, the running app, or the config target. If verification fails, the finding moves to a `Rejected — evidence does not match claim` table at the bottom of the consolidated punch list, with the actual current state recorded as negative evidence. **Zero exceptions.**

This is the most important rule in the skill. Round 1 of TheraNotes had **5 documented cases** where reviewers (Opus, with file:line citations, sounding completely confident) reported things that were not true:

- "Credentials committed to git" — false. `.env*` was in `.gitignore`. Only `.env.local.example` (intentional) was tracked.
- "SUPABASE_SERVICE_ROLE_KEY empty" — true on disk, but the cause was a literal `""` value, not a missing line. Fix needed manual key paste, not a code edit.
- "XSS in report rendering" — false. `renderInlineMarkdown` escaped HTML entities BEFORE applying the bold/italic regex.
- "PDF parser broken" — false. `pdf-parse@2.4.5` API actually matched the call.
- "Sidebar section ID mismatch breaks jump-to-section" — false. `jumpTo` matched H2 textContent, not strict ID equality.

Without per-fix verification, the orchestrator would have shipped 5 wrong "fixes" — broken working code, deleted security boundaries, and burned the user's trust in the whole skill. This gate is what makes auto-ship safe.

### 9.5.1 Three verification classes (and the tool to reach for in each)

Every candidate fix gets classified into one of three buckets at consolidation time, and each bucket has a non-negotiable verification step:

| Class | Examples | Verification tool | What "verified" looks like |
|---|---|---|---|
| **Code claim** | "X is hardcoded at file:line", "imported but unused", "missing prop", "function called with wrong arg shape" | `Read` the cited file:line. The line must literally show the symptom. If the file/line is stale (refactored since the report), `Grep` for the symbol and re-locate, then re-read. | "Verified by reading `app/generate/page.tsx:629` — the link still uses `/workspace/${reportId}`." |
| **Runtime claim** | "missing focus ring", "modal traps tab", "search returns false negatives past page 1", "login returns 503", "modal does not close on Esc" | `$B` (browse) probe, `curl -sI`, or a minimal headless test. **Don't trust visual descriptions without a runtime fingerprint.** Screenshots in the source report are not enough — the verifier reproduces. | "Verified by `curl -sI http://localhost:3001/login \| head -1` returning `HTTP/1.1 200 OK`, not 503 as claimed." |
| **Config claim** | "Supabase open sign-up", "OpenAI region missing", "missing env var in deploy target", "RLS disabled", "Vercel env var unset" | **Outside-the-codebase. Mark as `manual-fix-only` and surface to the user.** Never attempt an in-code workaround for an infra/config gap — that's how you ship a hardcoded fallback that masks the real problem. | "NOT verified in-code — `.env.local` not in repo and Supabase dashboard is not accessible from this session. Marked manual-fix-only and surfaced in the user-action section of the punch list." |

If the class is ambiguous (e.g. "the avatar menu crashes" — is that a code bug or a runtime bug?), do **both** verifications. Belt-and-braces is cheap; shipping a wrong fix is expensive.

**Transient-failure heuristic (config-class only).** A config-class probe that fails with a 400/406 status, a `PGRST` error code, a "schema cache" / "could not find column" message, or any signature of "the platform hasn't caught up to a recent migration" must be retried **once after a 30-second grace window** before being marked as a real bug. Round 2 of TheraNotes had a Settings Profile save claim that looked like a config bug but was actually PostgREST's schema cache lagging behind migration 008 — re-probing 30 seconds later showed it working. Without this heuristic, transient platform lag becomes a false positive that the user spends an hour chasing.

### 9.5.2 The audit-trail pattern in the consolidated punch list

Every entry in the "What I already fixed tonight" section MUST carry a `Verified by:` line. Every entry in the "Rejected" section MUST carry a `Negative evidence:` line. The user spot-checks these — that's the trust loop.

**Fixed entry format:**

```markdown
### Fix #3 — Workspace sidebar jump-to-section uses stale section IDs
- **File:** `app/workspace/[id]/page.tsx:412`
- **Reviewers:** visual (4/5), workflow (4/5)
- **Edit:** Replaced `getElementById(slug)` with H2-textContent match.
- **Verified by:** `Read app/workspace/[id]/page.tsx:408-420` — confirmed `jumpTo` previously did `document.getElementById(s.id)` which returned null because section H2s have no `id` attribute. Re-verified post-edit by `$B goto /workspace/test-id && $B click "[data-section='Recommendations']"` — page scrolled to correct H2.
- **Commit:** `abc1234`
```

**Rejected entry format:**

```markdown
### Rejected #2 — "XSS in report rendering" (qa-edge-cases reviewer)
- **Claim:** `renderInlineMarkdown` injects unsanitized markdown as HTML, allowing `<script>` payloads.
- **Cited:** `lib/markdown.ts:84`
- **Negative evidence:** Read `lib/markdown.ts:78-96`. Function calls `escapeHtml(input)` on line 80 BEFORE the bold/italic regex on lines 84-92. The regex only matches `\*\*...\*\*` and `\*...\*` literals, which cannot contain `<` because `escapeHtml` already converted them to `&lt;`. Manually probed with `escapeHtml('<script>alert(1)</script>')` returning `&lt;script&gt;alert(1)&lt;/script&gt;`. Safe.
- **Action:** No code change. Finding documented here so future rounds don't re-raise it without new evidence.
```

### 9.5.3 Reject vs partial-fix vs escalate

A finding can survive verification three ways. Pick the right one — don't default to "wholesale change" just because the reviewer was directionally right.

| Outcome | When | Example |
|---|---|---|
| **Reject** | Verification disproves the claim entirely. Negative evidence captured. | "Credentials committed to git" — `.env*` is gitignored. Reject. |
| **Partial fix** | Verification confirms a subset of the claim. Edit only the verified portion. | Reviewer says "Sparkles icon used 8 times across the app, all AI-cliché." Verifier finds `Sparkles` imported in 8 files but only 5 are AI-action buttons; 3 are decorative section headers and look fine. Partial fix: replace the 5 AI-action ones with action-specific icons; leave the 3 decorative ones. |
| **Escalate** | Verification confirms the claim AND reveals the fix has design tradeoffs / shared-schema risk / requires a config change you can't make. Move it from "fixed tonight" to "needs design decision" or "manual-fix-only". | "Supabase RLS disabled on `reports` table" — verified true via SQL probe. Fix requires a migration + a policy decision about cross-tenant read. Escalate. |

A finding that's partially correct never produces a wholesale change. The verifier's job is to find the smallest true core of the claim and edit only that. Wholesale changes from partial findings are how `/ux-review` regresses good code in the name of fixing bad code.

### 9.5.4 The cap is self-tuning by verification yield

There is no magic number. A fixed cap is wrong in both directions: short convergence lists with fast verification get under-shipped, and huge lists with low verification yield drown the user.

**The rule:** ship every fix that simultaneously satisfies all four:

1. **Verified** (passed §9.5.1 for its class)
2. **Mechanical** (no design call, no shared-schema risk)
3. **Not undone by an already-shipped fix in this same round** (re-check the working tree before each edit)
4. **Re-verifiable by the orchestrator** with a working type-check + a `$B` probe of the affected route

Keep working the convergence-ranked list until **(a)** the verification budget runs out (default 30 minutes wall-time per round), **(b)** the candidate pool is exhausted, or **(c)** the user supplied `--ship-cap N` as an explicit hard ceiling. The user can override with `--ship-cap N` for a hard ceiling or `--verify-budget Nm` to widen/narrow the wall-clock budget.

If fewer than 5 candidates survive verification across the whole list, that's a **signal**, not a failure: tell the user explicitly in the report ("Only 3 of 17 candidate fixes survived verification — the reviewers had a low truthfulness rate this round, recommend re-running with `--evidence-strict` or auditing the reviewer prompts"). Don't silently ship a thin batch.

### 9.5.5 Cross-references

This gate composes with two other rules in this doc:

- **§5 cost guard** — verification probes never trigger paid actions. If verifying a runtime claim would require clicking `Generate`, mark the finding `Verification blocked by cost guard — needs manual confirmation` and escalate. Same one-way-door rule applies.
- **§6 browser tooling fail-loud** — if the browser tool is unavailable, runtime claims cannot be verified. In source-only mode, ALL runtime-class findings auto-escalate to "needs manual confirmation" and the auto-ship cap drops to code-class fixes only. Banner this on the punch list.

### 9.5.6 The phase order, written out

This is the literal order the auto-ship loop runs in each round. Copy-paste into SKILL.md:

```
dispatch (5 agents in parallel)
  -> reports land
  -> consolidate (cluster + convergence-weight + classify each candidate)
  -> verify-each-candidate-fix (Read / $B probe / mark manual-fix-only)
       -> if verified: queue for edit
       -> if rejected: write to Rejected table with negative evidence
       -> if partial: queue partial scope only
       -> if escalate: move to needs-decision section
  -> edit (smallest possible diff per verified candidate)
  -> typecheck
       -> if fail: revert, move to needs-decision
  -> commit (one fix per commit, citing reviewer + Verified by line)
  -> next candidate
  -> stop at 10 verified-and-shipped, exhausted pool, or no zero-risk left
  -> write punch list with Fixed / Rejected / Needs-decision sections
  -> report to user
```

The verify step is **between** consolidate and edit. It is not a one-time gate at the start of the round. Every fix passes through it.

---

## 9.6 Regression-catch is the headline of round 2+

Round 2 of TheraNotes proved that the single most valuable thing a multi-agent re-review produces is not new bugs — it's catching things the orchestrator broke between rounds. Specifically, round 2 surfaced four direct regressions caused by round-1 fixes:

| Regression | Caused by | Caught by |
|---|---|---|
| DOCX export silently broken for any report containing a Header table | Day-1 added Plate `table`/`tr`/`td` components for display — never round-tripped through `editor.api.markdown.serialize` | clinician walk-through (clicked Export, nothing downloaded) |
| "Australian-region storage" misstatement removed from `/generate` but still ships on `/login` | Day-1 login screen rebuild reintroduced the same NDIS-compliance claim that Day-1 had removed elsewhere | qa-edge-cases reviewer |
| Print CSS hides the AI-drafted disclaimer | Day-3 print CSS hid `.tn-disclaimer` along with all other chrome — regressed the Day-2.5 disclaimer that's load-bearing for clinical responsibility | qa-edge-cases reviewer |
| Reports list query is RLS-only (missing the same `.eq('user_id')` defense-in-depth shipped for workspace) | Day-4 added pagination to `report-list.tsx` without copying the user_id pattern from the workspace fetch fixed in Day-2.5 | qa-edge-cases reviewer |

None of these are new bugs in the user's eyes — they're trust violations. The orchestrator promised X, then broke X-adjacent.

**The skill encodes this with two rules.**

**Rule 9.6.A — automatic diff briefing for every reviewer at round 2+.** The orchestrator generates a "what shipped since round N-1" summary at consolidation time (read from `git log --since=<round-1-timestamp>` plus the previous round's `What I already fixed tonight` table). This summary goes into every reviewer's prompt as a separate `WHAT WAS SHIPPED SINCE LAST ROUND` block, with the explicit mandate:

> Verify each shipped item still works AND check whether shipping it broke anything adjacent. Adjacent = (a) any code path that calls or is called by the changed file, (b) any UI state that depends on it, (c) any output format that round-trips through it. **Round-2's most damaging finding will almost certainly be a regression you have to look for, not a new bug surfacing in your normal review path.**

**Rule 9.6.B — regressions sort to the top of the punch list, above severity.** A P1 regression caused by an orchestrator fix outranks a P0 new finding, because trust compounds. The user has to see the orchestrator clean up its own messes before they'll trust the next batch. Tag every regression with `REGRESSION FROM ROUND N` so it's unmissable. The "Recommended sequence" block lists regressions as Day 1, every time, regardless of how the rest of the punch list shakes out.

This subsection composes with §9.5 (verify-before-fix): regressions are still verified the same way. The difference is sort order and the "I broke it, I fix it" framing.

---

## 10. Suggested SKILL.md content

Below is the actual SKILL.md to drop at `~/.claude/skills/ux-review/SKILL.md`. Voice matches the gstack ecosystem (direct, file:line specific, opinionated, no em dashes). It assumes the gstack preamble pattern; if the user's machine doesn't have the gstack preamble loader, the standalone version (without `_PROACTIVE` etc.) would just delete the preamble bash block and the gstack-specific tail sections.

```markdown
---
name: ux-review
description: |
  Multi-agent UX review. Dispatches 5 specialist Opus reviewers in parallel against
  a running web app (visual craft, persona workflow, PM feature gaps, IA/navigation,
  edge cases + a11y + security), then auto-consolidates into a single morning punch
  list with file:line citations and a 4-day fix sequence. Ships zero-risk surgical
  fixes immediately. Round 2+ runs in verification mode against the previous round.
  Use when asked to "ux review", "five-agent audit", "morning punch list", "is this
  app good enough", or before sending an app to beta testers.
  Proactively suggest after a major feature ships, before the user shares with their
  first real user, or when iterating on UX after a previous review round. (gstack)
  Voice triggers (speech-to-text aliases): "u x review", "ux audit", "punch list",
  "five agent audit", "panel audit".
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Task
  - AskUserQuestion
  - WebSearch
triggers:
  - ux review
  - five agent review
  - morning punch list
  - panel audit
---

# /ux-review: Multi-Agent UX Review

You are an orchestrator. You will dispatch 5 specialist reviewers in parallel,
collect their reports, consolidate them into a single punch list, ship the
zero-risk fixes, and hand the user a decision-useful morning briefing.

## Setup

### 1. Detect parameters

| Parameter | Default | Override |
|---|---|---|
| URL | auto-detect | `--url <url>` |
| Persona pack | auto-detect from CLAUDE.md / package.json description | `--personas <pack>` |
| Round | auto-detect from `UI-UX/round-*` count | `--round N` |
| Output dir | `UI-UX/` (round 1), `UI-UX/round-N/` (N≥2) | `--out <dir>` |
| Cost guard | auto-scan + ask | `--no-click "..."`, `--cost-guard off` |
| Auth | CDP > cookies > .env.test > ask | `--user`, `--cookies`, `--cdp` |

Auto-detect URL:
\`\`\`bash
PORT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).scripts?.dev?.match(/-p\s+(\d+)/)?.[1] || 3000)" 2>/dev/null || echo 3000)
URL="http://localhost:$PORT"
curl -sI "$URL" >/dev/null 2>&1 || { echo "Dev server not reachable at $URL"; exit 1; }
\`\`\`

If dev server is not running, STOP and ask the user to start it. Do not proceed.

Auto-detect persona pack: read CLAUDE.md and package.json. Match keywords:
- `clinical|NDIS|FCA|patient|clinician|OT|therapy` -> `clinical`
- `developer|API|CLI|SDK|docs` -> `dev-tools`
- `internal|operations|admin|dashboard` -> `b2b-internal` (default)
- `shop|store|cart|checkout|product` -> `ecommerce`
- `marketplace|seller|buyer` -> `marketplace`
- `consumer|landing|signup` -> `consumer`

Detect round number:
\`\`\`bash
N=$(ls -d UI-UX/round-* 2>/dev/null | wc -l | tr -d ' ')
[ -f UI-UX/00-CONSOLIDATED-PUNCH-LIST.md ] && ROUND=$((N + 2)) || ROUND=1
[ "$ROUND" = "1" ] && OUT="UI-UX" || OUT="UI-UX/round-$((ROUND - 1))"
mkdir -p "$OUT/screenshots"
\`\`\`

### 2. Browser tool gate (HARD)

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "BROWSE_READY: $B" || echo "BROWSE_NOT_READY"
\`\`\`

If `BROWSE_NOT_READY`: STOP. Use AskUserQuestion (see §6.2 of the research doc).
Do NOT dispatch agents source-only without explicit user opt-in. Round 1 of
TheraNotes lost most of the visual reviewer's value because it fell back to
source-only silently.

### 3. Cost guard scan

\`\`\`bash
grep -rEn '(<Button|<button|onClick)[^>]*(Generate|Send|Pay|Submit|Charge|Publish|Notify|Invite|Email|SMS|Run|Refine|Regenerate|Revise|Review)' \\
  app/ components/ src/ 2>/dev/null | head -50 > /tmp/ux-review-paid-actions.txt
\`\`\`

Read the file, classify each match as safe/side-effect/paid, and present the
paid + side-effect list to the user via AskUserQuestion (see §3 of research doc).
Get explicit confirmation before proceeding. This question always asks — never
auto-decide, even if `QUESTION_TUNING: true`. Cost guard is a one-way door.

### 4. Allocate agent profiles

\`\`\`bash
for i in 1 2 3 4 5; do
  $B profile create "ux-review-$i" 2>/dev/null || true
done
\`\`\`

## Persona pack loading

Read \`references/personas/<pack>.md\` for the chosen pack. If the user has a
custom \`UI-UX/personas.md\`, prefer that. Validate it has 5 entries each with
\`role\`, \`character\`, \`lens\`, \`output_filename\`, \`must_test\`,
\`must_not_click\`. If validation fails, fall back to default and warn.

## Dispatch (parallel)

Use the Task tool to launch all 5 agents in a single message. Each agent gets:

1. The persona block (role / character / lens)
2. The cost guard block (verbatim, with --no-click list interpolated)
3. The verification mode block (round N≥2 only) + previous round's report for
   that persona + git log since previous round
4. The output schema (§7.2 of research doc)
5. Profile name to use (\`ux-review-N\`)
6. Output path: \`$OUT/{output_filename}\`
7. The browser binary path (\`$B\`)
8. Target URL

DO NOT dispatch agents serially. The point of this skill is parallel synthesis.

## Wait, then consolidate

After all 5 reports land, run the consolidation algorithm (§8.1 of research doc):

1. Read all 5 reports + any \`personas.md\` for context
2. Extract findings into a normalized list
3. Cluster duplicates by file:line range / root cause
4. Convergence-weight each cluster
5. Re-rank within severity buckets
6. Identify zero-risk surgical fixes (≥2 reviewers, mechanical, no design call)
7. Identify "needs design decision" clusters
8. Build recommended day-batch sequence

Write \`$OUT/00-CONSOLIDATED-PUNCH-LIST.md\` using the template in §8.2 of the
research doc.

For round N≥2, also write \`$OUT/00-VERIFICATION-MATRIX.md\` (§9.3).

## Verify each candidate fix (THE LOAD-BEARING GATE — see §9.5 of research doc)

**No edit ships without verification. Zero exceptions.** Subagent reports —
even Opus, even with file:line citations, even with confident prose — are
wrong often enough to ship broken "fixes" if you trust them blindly. Round 1
of TheraNotes had 5 documented false claims (gitignored secrets called
"committed", safe HTML escaping called "XSS", working code called "broken").

For each candidate in the surgical-fix queue, classify and verify:

| Class | Verify with | Pass criterion |
|---|---|---|
| **Code claim** | \`Read\` the cited file:line | The line literally shows the symptom. If line is stale, \`Grep\` for symbol and re-locate. |
| **Runtime claim** | \`$B\` probe / \`curl -sI\` / minimal test | Runtime fingerprint reproduces the symptom. Screenshots in the source report are not enough. |
| **Config claim** | Cannot verify in-code | Auto-escalate to \`manual-fix-only\` — surface to user. NEVER attempt an in-code workaround for an infra/config gap. |

For each candidate:

- **Verified** -> queue for edit. Record the verification command/file:line in
  the \`Verified by:\` line on the punch-list entry.
- **Rejected** (verification disproves claim) -> write to the \`Rejected —
  evidence does not match claim\` table at the bottom of the punch list with
  the negative evidence. Do not edit. Do not silently drop.
- **Partial** (subset of claim is true) -> queue ONLY the verified subset for
  edit. Do not wholesale-change based on a partially-true finding.
- **Escalate** (claim true but fix has design tradeoffs / shared-schema risk
  / config dependency) -> move to "needs design decision" or
  "manual-fix-only" section.

If verifying would require triggering a paid/side-effect action, mark
\`Verification blocked by cost guard — needs manual confirmation\` and
escalate. Cost guard always wins.

In source-only mode (no browser available), ALL runtime-class candidates
auto-escalate to manual-fix-only and the auto-ship batch is code-class only.

## Ship the verified surgical fixes

For each verified fix in the queue:

1. Make the smallest possible edit (partial-fix candidates: edit only the
   verified subset)
2. Run \`bun typecheck\` (or detected typecheck command)
3. If clean, \`git add <file> && git commit -m "<one-line fix>"\` with a body
   explaining why, citing the reviewer, and including the \`Verified by:\` line
4. If typecheck fails, revert the change and move it from "fixed tonight" to
   "needs design decision" in the punch list

**Cap: 10 verified surgical fixes per round.** If verification rejects 5 of
your top 15 candidates, keep working down the convergence-ranked list until
you hit 10 verified-and-shipped, you exhaust the candidate pool, or no
zero-risk material is left. Do NOT ship below cap just because early
candidates failed.

If fewer than 5 candidates survive verification across the whole list, tell
the user explicitly: that's a signal the reviewer truthfulness rate was low,
not just a thin batch.

## Phase order (literal)

\`\`\`
dispatch (5 agents in parallel)
  -> reports land
  -> consolidate (cluster + convergence-weight + classify each candidate)
  -> verify-each-candidate-fix (Read / $B probe / mark manual-fix-only)
  -> edit (smallest possible diff per verified candidate)
  -> typecheck
  -> commit (one fix per commit, with Verified by line)
  -> next candidate
  -> stop at 10 verified-and-shipped, exhausted pool, or no zero-risk left
  -> write punch list with Fixed / Rejected / Needs-decision sections
  -> report to user
\`\`\`

The verify step is **between** consolidate and edit. It runs on every single
candidate, every single round. It is not a one-time gate at the start.

## Report

Tell the user, in this order:
1. What shipped (table of commits)
2. Top P0 needing decisions (3-5 items)
3. Where the full reports live (\`$OUT/00-CONSOLIDATED-PUNCH-LIST.md\` first)
4. Recommended next action ("Run /ux-review --round 2 after you've shipped a
   batch from the punch list to verify what landed")

## Important rules

1. **NO EDIT SHIPS WITHOUT VERIFICATION. ZERO EXCEPTIONS.** Every candidate
   fix passes through the verify-each-candidate-fix gate above. Reviewers are
   wrong often enough (5 documented false claims in TheraNotes round 1) that
   trusting them blindly ships broken "fixes". Code claims: \`Read\` the
   file:line. Runtime claims: \`$B\` probe or \`curl\`. Config claims: cannot
   verify in-code, escalate to manual-fix-only. Rejected findings get
   negative evidence written to the punch list — never silently dropped.
2. **Never trigger paid actions.** Cost guard is a one-way door. If unclear, do
   not click. This applies to verification probes too — if verifying would
   trigger \`Generate\`, mark blocked and escalate.
3. **Every finding cites file:line or has a screenshot.** No exceptions.
4. **Convergence is the strongest signal.** When 3+ reviewers agree
   independently, that's a real bug — but still verify before shipping.
   Single-reviewer findings only get promoted to P0 for security/PII/data-loss.
5. **Never silently resolve disagreements.** Surface them to the user.
6. **Each agent gets its own browser profile.** No shared state.
7. **Round N≥2 starts with verification, not re-discovery.**
8. **Source-only mode requires explicit opt-in and a banner on every report.**
   Runtime-class findings auto-escalate to manual-fix-only.
9. **Each report is 3,000-5,000 words.** Soft floor and ceiling.
10. **Show screenshots to the user inline.** After each \`$B screenshot\`, Read
    the file so the user can see it.
11. **The cap is self-tuning, not magic.** Ship every fix that is (a) verified,
    (b) mechanical/no-design-call, (c) not undone by another fix already
    shipped this round, (d) re-verifiable by a working type-check + a `$B`
    probe of the affected route. Stop only when (i) the verification budget
    runs out (default 30 min wall-time, override `--verify-budget`), (ii) the
    pool is exhausted, or (iii) the user supplied `--ship-cap N`. If <5
    candidates survive verification across the whole list, surface that as a
    low-truthfulness signal — don't silently ship a thin batch.
12. **Partial-correct findings produce partial fixes.** Edit only the verified
    subset. Wholesale changes from partial findings regress good code.
13. **Regressions caused by previous orchestrator fixes sort to the TOP of
    the punch list.** Tag them `REGRESSION FROM ROUND N`. They jump above
    every new finding regardless of severity, because trust compounds — the
    user must see the orchestrator clean up its own messes before they'll
    trust the next batch. Treat the previous round's `What I already fixed
    tonight` table as a mandatory "still works?" checklist before you read
    any new finding.
14. **One round verdict, not five.** The consolidated punch list opens with a
    single ship verdict (`yes` / `yes-with-caveats` / `no`) computed by the
    most-conservative-vote rule: a `no` from any reviewer = round verdict is
    `no`. Surface each reviewer's vote in one line at the top so the user
    sees the dissent without triangulating across five docs. Only declare
    `yes` when every reviewer who issued a verdict aligns.
15. **Per-class verification minimums.** Code claim: read the cited file:line;
    if the line has shifted, `Grep` for the symbol and re-read — never trust
    a stale line number. Runtime claim: must include at least one of (a)
    `curl` + grep, (b) `$B` screenshot, (c) reproducible script — never
    accept "I observed X" without a probe. Config claim: must specify
    dashboard/file/env target AND mark explicitly as user-action vs
    orchestrator-action.
16. **The user makes taste calls.** You ship mechanical fixes only.
```

### Output template additions (round 2+)

The consolidated punch list now leads with two compact blocks **before** the
"What I already fixed tonight" section:

```markdown
## Round verdict: NO  (most-conservative-vote rule applies)

| Reviewer | Vote | One-line reason |
|---|---|---|
| visual-craft | yes-with-caveats | Brand cohesion grade C+, login submit blue mismatched |
| clinician-workflow | NO | DOCX silently fails for any report with a Header table |
| pm-feature-gaps | yes-with-caveats | Open Supabase sign-up still active, autosave lies on errors |
| ia-navigation | yes | All 7 round-1 IA items shipped |
| qa-edge-cases | NO | Cmd+Z broken in editor, false residency claim still on /login |

## User-action required (skill cannot fix from code)

These are infrastructure/config tasks the orchestrator cannot resolve. They
sit here, not in the regular fix queue, so they don't get silently un-done:

- **Disable open Supabase sign-up.** Dashboard → Authentication → Providers
  → Email → uncheck "Enable email signups". Without this, anyone with the
  URL can `auth.signUp()` from a console and burn OpenAI tokens.
- **Apply pending migration `008_clinician_profile_fields.sql`.** Supabase
  dashboard SQL editor.
- (any other config-class items surfaced this round)
```

Both blocks are mandatory in round 2+. They go above the "Fixed tonight"
table because they answer the user's actual questions ("can I ship?" and
"what do I need to do that you can't?") in 30 seconds of reading.

---

## 11. Suggested folder layout

```
~/.claude/skills/ux-review/
├── SKILL.md                          # the file above
└── references/
    ├── personas/
    │   ├── b2b-internal.md           # default pack
    │   ├── clinical.md               # for TheraNotes-shaped projects
    │   ├── consumer.md
    │   ├── dev-tools.md
    │   ├── ecommerce.md
    │   └── marketplace.md
    ├── output-schema.md              # the per-report schema (§7.2)
    ├── consolidation-algorithm.md    # the clustering + convergence weighting (§8.1)
    ├── verification-mode.md          # round 2+ behavior (§9)
    └── cost-guard-patterns.md        # static scan + per-agent prompt (§5)
```

Total skill size budget: SKILL.md ~5k words, each persona file ~1k words, references ~1-2k each. Skill is well under the 500-line SKILL.md guideline from `skill-creator`.

The `references/personas/<pack>.md` file holds the verbatim agent prompt for each of the five agents. Keeping persona prompts out of SKILL.md is the right progressive-disclosure call: only the chosen pack needs to be read into context.

---

## 12. Open questions

### 12.1 Cost guard for projects without a known free path

Some apps charge on every meaningful action (e.g. a video-generation tool, an LLM playground, an image-gen service). The `--no-click` list would cover everything interactive and the agents would be useless.

**Proposal:** add a `read-only` mode that disables clicks except for explicit allowlist (auth, navigation, expand/collapse, sort, filter, search, scroll, hover). Document the trade-off in the report header. Encourage the user to run `/ux-review --cost-guard read-only` plus `/ux-review --cost-guard off` against a separate mocked-services dev branch as a follow-up.

**Still uncertain:** how to detect "every action is paid" automatically. Probably just ask once at first run and remember per-project in `.gstack/projects/$SLUG/ux-review.json`.

### 12.2 Projects without a running dev server

If `curl localhost:$PORT` fails, the skill currently STOPs and asks the user to run dev. But many projects have a non-trivial dev startup (compose up, seed DB, etc.).

**Options:**
- A) Stop and ask — current spec. Safe but rude.
- B) Attempt to detect and run `bun dev` / `npm run dev` / `pnpm dev` in the background, wait for the port, run the skill, then tear down. Risk: leaves orphaned processes if the skill crashes.
- C) Offer a deployed/staging URL fallback. Skill works against staging if that exists.

**Tentative answer:** A by default, with an opt-in `--auto-dev` flag for B that requires the user to confirm cleanup behaviour. C is implicit since `--url` is already supported.

### 12.3 Convergence consolidation when reviewers disagree

The spec says "never silently resolve disagreements, surface to user." Fine for a 2-way disagreement. What about a 3-way: visual says "delete the chips", PM says "keep them but rewire", clinical says "they're contaminating clinical content"?

**Proposal:** the consolidator writes the cluster with all three positions, picks the position with the most-aligned downstream user-impact (in this case the clinical "they're contaminating" view because it's a correctness concern, not a taste concern), and frames the question to the user as "Three reviewers agree something is wrong; they disagree on the fix. Position X has the strongest user-impact argument. Pick a direction or tell me to dig deeper."

**Still uncertain:** how to weight "correctness concern" vs "taste concern" automatically. May need a per-finding `concern_type` tag in the agent output schema. Worth shipping without and seeing how often it bites in real round 2/3 runs.

### 12.4 What "the orchestrator" is

The skill assumes the parent Claude that ran `/ux-review` does the consolidation. But for very large reports (5 × 5,000 words = 25k words), the parent context may not be ideal. Alternative: dispatch a 6th agent (the consolidator) that reads all five reports and writes the punch list.

**Tentative answer:** start with parent-as-consolidator. It has the conversation context and the cost guard memory. If consolidation quality drops on round 3+, switch to a dedicated consolidator agent.

### 12.5 How to handle apps with auth flows that require email confirmation / 2FA

If signup or login requires a real email, the skill can't auto-auth. CDP mode (real browser already logged in) handles this. Without CDP, the skill should detect the auth complexity early (look for OTP/magic-link patterns in the login route) and ask the user to either: (a) connect their real browser via CDP, (b) provide pre-baked cookies, or (c) do a one-time manual login while the skill watches.

---

## Appendix A: Why this skill instead of `/qa-only` + `/design-review`

`/qa-only` is single-perspective bug hunting. `/design-review` is single-perspective visual polish. Neither dispatches multiple personas in parallel, neither produces convergence-weighted output, neither understands a domain (clinical vs dev-tools vs consumer), and neither auto-ships zero-risk surgical fixes between rounds.

`/ux-review` is the heavy panel pass — once a week or once per major feature. The user's existing `qa` and `design-review` skills remain for tighter loops.

## Appendix B: Estimated cost per run

Round 1 (TheraNotes, 2026-05-09):
- 5 Opus agents in parallel, each ~3,000-5,000 word output, ~150k input context per agent (codebase reads + screenshots).
- Total: roughly 5 × $1.50 = ~$7.50 for the dispatch + ~$2 for consolidation + zero-risk fixes = ~$10/round at current Opus pricing.
- Wall time: ~10-15 min.

Round 2 verification mode is cheaper (less new exploration, more targeted verification): ~$5-7/round.

For a clinical/internal app under active development, running once per major release feels right. Daily would be wasteful; once a sprint is the sweet spot.

## Appendix C: What round 1 of TheraNotes proved works

Looking at `00-CONSOLIDATED-PUNCH-LIST.md` and the five source reports:

- **Convergence really is the signal.** The top 5 P0s in the punch list each had 3-4 independent reviewers, and every one of them was a real shipping issue.
- **File:line citations made the punch list actionable.** Items without citations (the security ones from a single reviewer) needed extra investigation; items with citations were one-shot fixable.
- **The "what I already fixed tonight" section is the dopamine hit.** It's why the user wakes up happy. Don't skip the auto-ship step.
- **The "what's good and worth preserving" section prevents regression.** Round 2 must read it before changing anything.
- **The persona-driven workflow review (clinician) was the most evidence-rich** because it had real screenshots from a real user journey. The other four were strong but more analytical. Persona pack 2 (the workflow walk-through) is the highest-leverage slot.
- **The 4-day batch sequence in the punch list is what made the 18-26 hour estimate believable.** Without it, "here's 33 findings" is overwhelming. With it, "Day 1: 4-6 hours, here's exactly what to do" is shippable.

These are the things the skill must preserve. Everything else is implementation detail.

---

## Changelog

**2026-05-10 — Added §9.5 verify-before-fix gate.** The auto-ship loop now runs an explicit verification step on every individual candidate fix, not a one-time gate at the start of the round. Three verification classes (code / runtime / config) each have a non-negotiable verification tool: Read for code claims, $B-probe-or-curl for runtime claims, manual-fix-only escalation for config claims (no in-code workarounds for infra gaps). Rejected findings get a negative-evidence entry in a dedicated Rejected table at the bottom of the punch list — never silently dropped. The audit trail uses a `Verified by:` line on every fix and a `Negative evidence:` line on every rejection, building a spot-checkable trust loop with the user. Partial-correct findings produce partial fixes targeting only the verified subset, never wholesale changes.

The §10 SKILL.md draft was updated inline to embed the gate in the auto-ship workflow steps so the rule is unmissable: a new "Verify each candidate fix" section runs between consolidate and edit, the "Ship the surgical fixes" section was retitled to "Ship the verified surgical fixes", the cap is restated as "10 verified surgical fixes per round" (not 10 candidates), the literal phase order is written out as a code block, and the Important rules list now opens with the verification rule in caps as rule #1. This is the operational contract that prevents `/ux-review` from shipping the 5 wrong fixes that round 1 of TheraNotes would have produced without it. Cross-references added to §5 (cost guard composition) and §6 (source-only mode auto-escalates runtime findings).

**2026-05-10 — v0.3: dogfood-driven schema enforcement.** After applying the v0.2 SKILL.md to the actual round-2 consolidation of TheraNotes, six pieces of real friction surfaced — all about consolidator-input quality, not orchestrator logic. Six small but consequential additions:

- **Per-report `<PREFIX>-N` finding ids are now mandatory** (`VC` for visual-craft, `WF` for persona-workflow, `PM` for pm-feature-gaps, `IA` for ia-navigation, `QA` for qa-edge-cases). Round 2 had every reviewer using a different scheme (`NEW-N` / `BUG-N` / `Issue N` / bare headers / `P0 - <slug>`) which made cross-referencing painful. Per-report numbering restarts at 1 each round so the consolidator can deterministically cluster across rounds.
- **Per-report `## Vote` block is now mandatory** (`yes` / `yes-with-caveats` / `no` / `abstain` + ≤120-char one-line reason). The orchestrator extracts these verbatim into the round-verdict table at the top of the punch list. v0.2 specified the verdict computation but didn't enforce a parseable vote location in each report.
- **Per-report `## Suspected regressions from round N-1` block is now mandatory at round 2+** (write "None observed in this review path." if empty — never omit). Without this, regression detection requires the orchestrator to infer adjacency from raw prose. With it, the regression queue is half-built at consolidation time.
- **`file:line` first metadata** on every finding when applicable. Clustering by file:line is deterministic; clustering by prose root-cause is laborious. Findings without `file:line` AND without a screenshot path are dropped at consolidation time (unchanged from v0.2 — but now enforced as the FIRST piece of metadata so the consolidator can grep).
- **`Verified by:` is now mandatory on every P0 and P1 finding in the punch list, not just shipped fixes** (rule #16). The user's trust comes from being able to spot-check what the orchestrator checked vs what it trusted blindly. P2/P3 entries can defer verification but must mark themselves `verification deferred` explicitly.
- **Preservation rationale is now required for any change to a "what's good" area** (rule #17). The previous round's "What's good and worth preserving" section becomes a binding contract — any commit that touches a preserved area must include a one-sentence rationale in the commit body explaining why the change doesn't violate the preservation. This is the mechanism that prevents round-N fixes from regressing things round-N-1 explicitly preserved.

The consolidation algorithm in §8.1 grew from 8 steps to 12 to formalise the order: read votes first → compute verdict → read regression sections → extract findings with stable ids → cluster by file:line → convergence-weight → sort regressions to top → identify zero-risk → identify needs-design → read preservation list → write commits with rationale → build day-batch sequence.

What v0.3 deliberately did NOT add: no new persona packs, no new orchestrator phases, no SKILL.md sprawl beyond the schema enforcement and two new rules. Each of the six additions traces directly to a specific moment of friction during the round-2 dogfood. The deletion test passed: removing any of them would make the next consolidation harder.

---

**2026-05-10 — v0.2: round-2 learnings make the skill autonomous and intelligent without bloat.** Six refinements driven by what round 2 of TheraNotes actually surfaced:

- **§9.5.1 transient-failure heuristic.** Config-class probes that fail with 400/406/PGRST/schema-cache signatures retry once after 30s grace before being marked as a real bug. Caught the false "Profile save returns 400" claim that was actually PostgREST's schema cache lagging behind migration 008.
- **§9.5.4 cap is now self-tuning by verification yield.** No magic number. Ship every fix that's verified + mechanical + non-conflicting + re-verifiable, until the verification budget runs out (default 30 min wall-time, override `--verify-budget`) or the pool is exhausted. User can override with `--ship-cap N`. If <5 candidates survive verification across the whole list, surface low-truthfulness as a signal — don't silently ship a thin batch.
- **§9.6 regression-catch is the headline of round 2+.** Round 2 of TheraNotes proved that the most valuable single output of a re-review is catching what the orchestrator broke between rounds — DOCX serializer regression, login-page residency claim, print-CSS hiding the disclaimer, missing user_id filter on the new reports list. Two new rules: (A) every reviewer at round 2+ gets an automatic "what shipped since last round" diff briefing with explicit mandate to check adjacent regressions, and (B) regressions sort to the TOP of the punch list above severity, tagged `REGRESSION FROM ROUND N`.
- **SKILL.md rule #11 self-tuning cap, rule #13 regressions-to-top, rule #14 single round verdict (most-conservative-vote), rule #15 per-class verification minimums.** The verdict rule means the consolidated punch list opens with one ship-or-not call computed by taking the most conservative reviewer vote — no triangulating across five docs.
- **SKILL.md output template additions.** Round 2+ punch lists now lead with two compact blocks before "What I already fixed tonight": (1) the round verdict + per-reviewer one-line vote table, (2) a "User-action required (skill cannot fix from code)" section so config items like Supabase open sign-up don't get buried in the regular fix queue and silently un-done.
- **Per-class verification minimums codified.** Code = read file:line + grep on stale; runtime = curl/screenshot/script (no "I observed" without a probe); config = dashboard/file/env target + explicit user-action-vs-orchestrator-action tag.

What v0.2 deliberately did NOT add: no new persona packs, no new cost-guard rules, no memory layer between runs, no SKILL.md sprawl. The skill stays stateless across runs except for the punch list it writes — that's the right level. Each rule above maps directly to a regression or false-positive that round 2 produced; nothing was added that doesn't change the next run's output.
