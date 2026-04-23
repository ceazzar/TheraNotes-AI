# TheraNotes-AI — Session Log

**Date:** 2026-04-23
**Participants:** David Owoeye + Claude (Opus 4.6)

---

## 1. Starting Point

David has two existing repos:
- **ceazzar/fca-agent** — Python/FastAPI backend on Cloud Run that generates FCA (Functional Capacity Assessment) reports using RAG (ChromaDB + OpenAI). Core value is in prompt engineering, exemplar corpus, and generation pipeline.
- **ceazzar/theranotes-v2.0** — Next.js 16 frontend with Supabase. Full clinical UI with 25 Edge Functions.

A previous design spec existed for wiring these two together (structured integration with proxy routes, database migration, Edge Function replacement). That approach required maintaining two repos, two deploys, and significant plumbing.

## 2. The Pivot — Chat-First

David proposed scrapping the complex integration in favor of something fundamentally simpler:

> "I'm thinking about an entirely new concept, very simple, very straightforward. The interface that I want people to have is just a chat and a different session for each chat. Everything will be powered by AI."

Key concept: **two-layer ingestion**
1. **Foundational layer** — clinical FCA exemplars shared across all users (for report quality)
2. **Per-user layer** — user's uploaded reports (for writing style matching)

The user starts a chat, pastes clinical notes, the AI asks follow-ups, then generates a full FCA report — all conversationally.

## 3. UI Scaffold Decision

Evaluated three options for the chat UI starting point:
- **prompt-kit** (component library, 2.7k stars) — install individual components into a fresh Next.js app
- **Vercel AI Chatbot** (full app template, 20k stars) — fork and strip down
- **Mission Control** (agent orchestration, 4.3k stars) — David's reference, too heavy to fork

**Decision: prompt-kit** — maximum control, no code to delete, install only what you need.

Research was done via live demos:
- https://www.prompt-kit.com/
- https://chatbot.ai-sdk.dev/demo
- https://mc.builderz.dev

Head-to-head comparison showed both paths (prompt-kit vs Vercel chatbot) take similar total effort, but prompt-kit results in an app that's 100% yours without inheriting someone else's architecture.

## 4. Design Decisions (Interactive Q&A)

All decisions made via interactive terminal prompts:

| Question | Decision |
|---|---|
| What does AI know at session start? | Writing style only (from uploaded exemplars) |
| How does user provide client details? | Paste clinical notes |
| What happens with the generated report? | Side panel editor (chat left, report right) |
| How does user upload exemplars? | Settings/profile page |
| What OpenAI model? | gpt-5.4-pro for generation, gpt-5.4 for chat |
| Auth method? | Supabase Auth (email/password + magic links) |
| Where does generation run? | Vercel API routes (single repo, single deploy) |
| Where do embeddings live? | Supabase pgvector (one DB for everything) |
| Reuse from fca-agent? | Port everything (prompts, exemplars, template, pipelines) |
| Side panel features? | Read-only preview, direct editing, section revision, DOCX export, section-chat linking |

### Critical architectural insight
The chat agent (gpt-5.4) is a **router, not the generator**. It handles conversation but never writes report content directly. When generation or revision is needed, it calls the proven fca-agent pipeline (gpt-5.4-pro) as a tool. This keeps output predictable and consistent.

## 5. Cross-Reference Verification

David challenged the accuracy of claims made during design. Six parallel agents were dispatched to verify every fact:

| Area | Result |
|---|---|
| prompt-kit | 6/6 accurate |
| Vercel AI Chatbot | 7/7 accurate |
| OpenAI models | 6/7 accurate (text-embedding-3-small deprecated Oct 2026) |
| Supabase pgvector | 9/9 accurate (free tier auto-pauses after 7 days) |
| Architecture | 5/6 accurate (**Vercel timeout: 300s on Pro — design flaw found**) |
| Mission Control | 6/8 accurate (Radix overstated, 36 panels not 32) |

### Corrections applied to spec:
1. Embedding model changed to `text-embedding-3-large` (3072 dims)
2. Generation split into per-section API calls (respects 300s Vercel timeout)
3. Supabase Pro plan noted as required for production

## 6. Architecture

```
Single repo (TheraNotes-AI) → Vercel

Pages: /login, /chat, /settings
API Routes: /api/chat, /api/generate, /api/revise, /api/ingest

Supabase: Auth + PostgreSQL (pgvector) + Storage
OpenAI: gpt-5.4 (chat) + gpt-5.4-pro (generation)

Database: 4 tables
  - sessions (chat sessions)
  - messages (chat history)
  - exemplar_chunks (pgvector embeddings, two layers)
  - reports (generated sections as JSONB)
```

## 7. Implementation

17 tasks, 88 steps, executed via subagent-driven development:

| # | Task | Status |
|---|---|---|
| 1 | Scaffold Next.js + shadcn/ui + prompt-kit | Done |
| 2 | Supabase database schema (4 tables + pgvector + RLS) | Done |
| 3 | Supabase auth + middleware | Done |
| 4 | Port prompt templates (prompts.py → prompts.ts) | Done |
| 5 | RAG query layer (two-layer pgvector) | Done |
| 6 | Port generation + revision pipelines | Done |
| 7 | Ingest API route (parser + chunker + embedder) | Done |
| 8 | Generate API route (per-section, gpt-5.4-pro) | Done |
| 9 | Revise API route (section revision + coherence check) | Done |
| 10 | Chat API route (streaming + tool calling) | Done |
| 11 | Login page (Supabase Auth UI) | Done |
| 12 | Chat UI (session sidebar + messages + input) | Done |
| 13 | Report side panel (section editing + revision) | Done |
| 14 | Settings page (exemplar upload + management) | Done |
| 15 | Seed foundational exemplars script | Done |
| 16 | DOCX export | Done |
| 17 | Smoke test + deploy | Pending (needs Supabase project + env vars) |

### Key technical adaptations during implementation:
- AI SDK v6 API changes: `useChat` moved to `@ai-sdk/react`, `parameters` → `inputSchema`, `maxSteps` → `stopWhen: stepCountIs(n)`
- pdf-parse v2 uses class-based API instead of function call
- OpenAI client uses lazy initialization to prevent build-time errors
- prompt-kit `message.tsx` needed `delayMs` prop fix for compatibility with shadcn/ui v4

## 8. What's Ported from fca-agent

| Python | TypeScript | Purpose |
|---|---|---|
| `src/prompts.py` | `lib/ai/prompts.ts` | All prompt templates (7 functions) |
| `src/generate.py` | `lib/ai/generate.ts` | Section generation + coherence check |
| `src/revise.py` | `lib/ai/revise.ts` | Feedback routing + section revision |
| `src/ingest.py` | `lib/ingest/chunker.ts` | Section-based chunking |
| `src/parser.py` | `lib/ingest/parser.ts` | .docx/.pdf/.md parsing |
| `schemas/canonical_template.json` | `lib/template.json` | Report structure (9 sections) |
| `exemplars/*.md` | Supabase pgvector | 20 FCA exemplar reports (foundational layer) |

## 9. What's Left

1. Create Supabase project and run migration SQL
2. Set environment variables (.env.local)
3. Run seed script: `npx tsx scripts/seed-foundational.ts /path/to/exemplars`
4. Deploy to Vercel with env vars
5. End-to-end smoke test

## 10. Repository

**GitHub:** https://github.com/ceazzar/TheraNotes-AI
**72 files, 13 commits, build passing**
