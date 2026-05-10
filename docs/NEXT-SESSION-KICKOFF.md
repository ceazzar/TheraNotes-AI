# Next Session — Kickoff Prompt

**Copy-paste the prompt below into a fresh Claude Code session in the TheraNotes-AI project directory.** It's self-contained: it tells you what to read, what to do, in what order, with what guardrails.

---

## The prompt

```
You are picking up a TheraNotes-AI session that hit context limits.
Yesterday's session shipped a major UX overhaul plus a `/ux-review`
skill, then deployed everything to production at theranotes.com.au.
The previous session deliberately did NOT do the final step: a
multi-agent UX review against the LIVE production URL.

That's your primary job. Plus a local-tree cleanup pass and an
optional v0.4 skill refinement. In that order.

═══════════════════════════════════════════════════════════════════
PHASE 0 — Context load (first 5 minutes, before anything else)
═══════════════════════════════════════════════════════════════════

Read these in this exact order:

1. docs/SESSION-LOG-2026-05-10.md     — yesterday's full arc + outcomes
2. docs/STRATEGY-2026-05-09.md        — the framing decision (why this app exists in this shape)
3. UI-UX/round-2/00-CONSOLIDATED-PUNCH-LIST.md   — the v0.2 format for what good looks like
4. ~/.claude/skills/ux-review/SKILL.md  — the operational contract you'll execute

Then take stock:
- Run `git log --oneline -8` to see the last few commits
- Run `git status -s` to see uncommitted state
- Run `lsof -i :3001 :3000 2>/dev/null` to see if dev server is running
- Run `vercel ls --prod 2>&1 | head -5` to confirm prod is healthy
- Run `curl -sI https://www.theranotes.com.au/login | head -1` to confirm 200

If any of those show red flags (dev server crashed, prod failing, uncommitted
work mid-flight), TELL THE USER before proceeding. Don't push fixes blind.

═══════════════════════════════════════════════════════════════════
PHASE 1 — Local tree cleanup (15-30 minutes)
═══════════════════════════════════════════════════════════════════

The user reported "I've got files everywhere they shouldn't be" in the
local tree. Audit and clean up. This is housekeeping, not a feature.

Specifically check for:

1. Stray files in repo root that don't belong
   (yesterday I noticed an `x` file (177KB) that got gitignored — there
   may be more)

2. `tests/e2e/output/` — gitignored from yesterday but still ~50 files
   on disk; safe to delete locally to free space, but ASK first
   (those are AI-generated test outputs)

3. `/tmp/upstream-main` worktree — yesterday I created and removed it,
   but check `git worktree list` to confirm

4. Any `.env.local.bak` or similar backup files

5. Stray markdown files at root that were probably session scratchpads

6. Logs at /tmp/theranotes-dev.log etc — fine to leave but document
   where they live if relevant

7. `node_modules/` is fine (gitignored). `.next/` is fine (gitignored).

Don't delete anything destructively. For each candidate:
- Show the user what it is + why it looks unwanted
- Ask before `rm`
- For obvious junk (Mac `.DS_Store`, `*.log` at root, etc.), batch with
  one confirmation

If you find things that should be added to .gitignore but never were,
do that as a small commit ("chore: gitignore additions for local dev
artifacts"). Push it.

═══════════════════════════════════════════════════════════════════
PHASE 2 — The actual job: round-3 UX review against PRODUCTION
═══════════════════════════════════════════════════════════════════

Invoke /ux-review with these parameters:

  --url https://www.theranotes.com.au
  --round 3
  --personas clinical                    (matches the existing pack)
  --no-click "Generate, Run NDIS Review, Refine, Apply fix"

The skill at ~/.claude/skills/ux-review/SKILL.md will dispatch 5
specialist Opus reviewers in parallel against the LIVE production URL
in verification mode (it auto-detects round 3 from the existing
UI-UX/round-* directories). Each reviewer gets:

  - Round 2's report for their persona (in UI-UX/round-2/)
  - Round 2's "What I already fixed tonight" diff briefing
  - The git log since the round-2 commit so they know what shipped
  - Explicit mandate: "verify each shipped item still works on PROD,
    AND check whether shipping it broke anything adjacent. Catching a
    regression is the headline of round 2+."

CRITICAL CONTEXT FOR THE REVIEWERS:

  This is a PRODUCTION URL, not localhost. Different risk surface:

  • Vercel build optimisation may have inlined/minified differently
    than dev (CSS, JS bundling, tree-shaking). Bugs that were latent
    locally might surface in prod.
  • Vercel Edge middleware (proxy.ts) runs in real edge runtime, not
    Node dev runtime — auth-gate behaviour can differ subtly.
  • Real auth cookies, real RLS, real network conditions, real CDN
    caching of old vs new bundle. A returning user might be on the
    old JS bundle for hours.
  • DOCX export with the REG-1 fix (Plate-table serializer) was never
    actually clicked on prod. Reviewers should download a real DOCX and
    open it.
  • The 3 upstream-extracted fixes (backslash regex, ghost-code-block
    filter, [data-slate-editor] typography) need rendering verification
    in a real prod browser.
  • Cost-guard is HARD: do NOT click "Generate" on prod (real $$).
    Reviewers should test every other interaction.

═══════════════════════════════════════════════════════════════════
PHASE 3 — Consolidate round-3, ship verified surgical fixes
═══════════════════════════════════════════════════════════════════

When all 5 reviewers land, follow the v0.3 SKILL.md auto-consolidation
algorithm exactly. Specifically:

1. Read each report's mandatory ## Vote block FIRST.
   Compute round verdict by most-conservative-vote.

2. Read each report's mandatory ## Suspected regressions from round 2
   block. Promote anything plausible to a regression queue.

3. Cluster findings by file:line. Convergence-weight. Re-rank within
   severity buckets.

4. Sort regressions caused by round-2 fixes to the TOP of the queue
   (tag REGRESSION FROM ROUND 2). They precede every new finding
   regardless of severity.

5. Write UI-UX/round-3/00-CONSOLIDATED-PUNCH-LIST.md using the v0.2
   format from round 2 as the template:
   - Round verdict block
   - User-action-required block (config items skill cannot fix)
   - Regressions-orchestrator-caused-this-session block
   - Verified-fixes block (each with `Verified by:` line)
   - Escalated-to-design-decision block
   - Rejected-with-evidence block
   - Recommended fix sequence
   - What's good and worth preserving (binding for round 4+)

6. Apply the verify-before-fix gate to every candidate:
   - Code claim → Read the cited file:line
   - Runtime claim → curl probe / browse screenshot / minimal repro
   - Config claim → mark manual-fix-only, surface to user

7. Ship verified surgical fixes per the self-tuning cap rule (rule
   #11 in SKILL.md). Each commit body includes `Verified by:` line.

8. After fixes shipped: push to main, watch Vercel deploy succeed,
   smoke-test prod, REPORT to user.

═══════════════════════════════════════════════════════════════════
PHASE 4 (OPTIONAL — only if time permits) — v0.4 skill refinement
═══════════════════════════════════════════════════════════════════

Yesterday's session surfaced one specific lesson worth baking into the
skill:

  When extracting fixes from another tree (e.g. an upstream-extraction
  pass), verify-before-fix probes must run against THE TARGET TREE
  (the one being modified), not THE SOURCE TREE (upstream's). I
  dismissed the playwright removal because upstream's package.json no
  longer had it — completely missing that mine still did. The Vercel
  deploy failed for it.

If round-3 produced new patterns worth adding, batch them into a v0.4
changelog entry on the skill research doc + a small SKILL.md edit.
But only if there's a real new lesson — don't add rules for rule
volume's sake (the v0.3 changelog explicitly disallows that).

═══════════════════════════════════════════════════════════════════
GUARDRAILS FOR THE WHOLE SESSION
═══════════════════════════════════════════════════════════════════

1. NEVER click Generate / Run NDIS Review / Refine / Apply fix on prod
   or local without explicit user confirmation. Each costs real $$.
   Cost-guard is a one-way door (rule #2 in SKILL.md).

2. NEVER force-push to main. Yesterday's session did one and it was
   the right call given a divergent abandoned-experiment branch — but
   from here, all main pushes should be via normal merge or
   fast-forward. If you want to do something hairy, branch first.

3. NEVER add a fix without verification. Round 1 had 5 documented
   false claims — the verify-before-fix gate exists for a reason.
   Rejected findings get a row in the punch list with negative
   evidence (rule #1 in SKILL.md, also "the load-bearing rule").

4. The user has ADHD. Surface decisions to them as
   AskUserQuestion-style choices with a recommendation, not as walls
   of options. Show them progress markers so they can spot-check
   without re-reading the whole conversation. Use TaskCreate /
   TaskUpdate liberally.

5. Production = theranotes.com.au, Supabase project ref =
   iyjlbybgxdecruzgydll, Vercel project = ceazar/theranotes-ai. Both
   migrations 007 + 008 are applied to prod. Open Supabase sign-up is
   disabled (verified yesterday via signUp probe). Don't re-verify
   these unless something else suggests they regressed.

6. Compact early if context grows. Yesterday's session ran out of
   room — don't repeat that. Better to compact at the end of Phase 1
   than to lose the round-3 context mid-consolidation.

7. The Peter Parker E2E test (tests/e2e/peter-parker-e2e.mjs) is the
   canonical "did the FCA pipeline regress" check. Run it once after
   any round-3 fixes that touched generate/revise/refine/header/intake
   to confirm clinical output quality didn't regress.

═══════════════════════════════════════════════════════════════════
REPORT BACK FORMAT
═══════════════════════════════════════════════════════════════════

When you finish (or hit a decision point), tell the user in this order:

1. Phase 0/1/2/3 status (which phase, what landed)
2. Round-3 round verdict (yes / yes-with-caveats / no)
3. What shipped tonight (table of commits with Verified by lines)
4. User-action-required items (config the skill couldn't fix)
5. Top P0s needing decisions (3-5 items, no more)
6. Where the round-3 punch list lives
7. Recommended next action

═══════════════════════════════════════════════════════════════════

Greet me with "Greetings boss" + Japanese word of the day per the
global instructions, then begin Phase 0.
```

---

## Why this prompt is shaped the way it is

A few things worth knowing as the next-session orchestrator picks this up:

1. **Phase 0 is not optional.** Yesterday's session worked because every meaningful action started with `Read` of the relevant artifact. A new session that skips this and starts editing will produce inconsistencies with the SKILL.md operational contract.

2. **Phase 1 (cleanup) is intentionally early** — it's quick, the user explicitly asked for it, and getting it done first means the round-3 review runs against a tidy tree.

3. **Phase 2 dispatches the skill, not 5 manual Agent calls.** The skill has the full operational contract baked in (verify-before-fix gate, regression-detection mandate, single-verdict rule, per-class minimums, etc.). Re-implementing that pattern manually in a new session would re-introduce the v0.2 issues the v0.3 dogfood found.

4. **Phase 3 explicitly references the v0.2 format from round 2.** The next-session orchestrator should open `UI-UX/round-2/00-CONSOLIDATED-PUNCH-LIST.md`, see the format, and replicate it for round-3 in a `UI-UX/round-3/` directory.

5. **Phase 4 is gated on actually-new lessons.** The user's ADHD profile + the v0.3 changelog's explicit "no rules for rule volume's sake" mandate means new SKILL.md rules need to be earned, not added defensively.

6. **The guardrails repeat things the SKILL.md already says** because a fresh session may not Read the SKILL.md before its first action. Belt-and-braces.

7. **Cost-guard is in the prompt FOUR TIMES** because Generate is a $1+ action and a single misclick by an over-eager reviewer can rack up serious bills before the orchestrator catches it.