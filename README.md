# TheraNotes AI

Chat-based clinical platform for generating **NDIS Functional Capacity Assessment (FCA)** reports, built for Australian allied health professionals (occupational therapists).

Clinicians paste clinical session notes into a conversational interface, the AI asks follow-up questions, then generates a multi-section clinical report compliant with NDIS documentation standards. Reports can be edited, revised with AI assistance, and exported as DOCX.

## Background & Lineage

This repo is the **reimagined** version of TheraNotes, consolidating two earlier repos into a single codebase:

| | Original (v2.0) | Reimagined (this repo) |
|---|---|---|
| **Frontend** | [ceazzar/theranotes-v2.0](https://github.com/ceazzar/theranotes-v2.0) — Next.js on Vercel | Single Next.js app (this repo) |
| **Backend** | [ceazzar/fca-agent-v2](https://github.com/ceazzar/fca-agent-v2) — Python/FastAPI on Cloud Run | Generation engine ported to TypeScript in `lib/ai/` |
| **RAG store** | ChromaDB with `all-MiniLM-L6-v2` embeddings, pre-built at Docker build time | Supabase pgvector with OpenAI `text-embedding-3-large` (1536 dims) |
| **UI paradigm** | Form-based assessment editor with ~8 clinical domains, structured field types | Chat-based interface — paste notes, AI conversation, then generate |
| **Generation model** | OpenAI o3 for all LLM calls (~$2-5/report) | GPT-4o (configurable via `GENERATION_MODEL` env var) |
| **Deployment** | Vercel (frontend) + Cloud Run (backend, `australia-southeast1`) | Vercel only (monolith) |
| **Auth** | Supabase Auth with admin approval, JWT custom claims, role-based (admin/practice_manager/clinician) | Supabase Auth with email/password |

The original v2.0 had a much larger feature set (client management, dashboard with charts, admin panel with prompt editing, assessment questionnaire editor, PDF export via DocRaptor, Splose integration, sharing with password-protected links, clinician sign-off workflow). This reimagined version focuses on the core value: **clinical notes → AI conversation → FCA report**.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js (Vercel)                       │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ /chat    │  │ /api/chat    │  │ /api/generate      │ │
│  │ Chat UI  │──│ GPT-4o       │  │ Per-section engine  │ │
│  │ + Report │  │ Streaming    │  │ RAG + prompts       │ │
│  │ Panel    │  │ (AI SDK)     │  │ + coherence check   │ │
│  ├──────────┤  ├──────────────┤  ├────────────────────┤ │
│  │ /login   │  │ /api/ingest  │  │ /api/revise        │ │
│  │ /settings│  │ Parse+Embed  │  │ Feedback routing    │ │
│  └──────────┘  └──────────────┘  └────────────────────┘ │
│                        │                                  │
└────────────────────────┼──────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │    Supabase         │
              │  PostgreSQL + pgvector  │
              │  Auth + Storage     │
              │  (ap-southeast-2)   │
              └─────────────────────┘
```

**Two AI layers** (key design decision):
1. **Chat agent** (GPT-4o via Vercel AI SDK) — Conversational router. Never writes report content directly. Handles follow-up questions, context gathering, and user interaction.
2. **Generation engine** (GPT-4o, configurable) — Writes report content using carefully crafted clinical prompts (ported from the Python fca-agent). Invoked per-section via `/api/generate`.

**Two RAG layers** (both in the same `exemplar_chunks` table, differentiated by `user_id`):
1. **Foundational** (`user_id = NULL`) — 20 pre-seeded de-identified FCA exemplar reports, shared across all users, providing clinical structure and NDIS writing patterns.
2. **Per-user** (`user_id = owner`) — User's own uploaded exemplar reports for writing style matching.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (base-nova style) + Radix UI
- Vercel AI SDK (streaming chat)
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- OpenAI GPT-4o + text-embedding-3-large
- pnpm

## FCA Report Structure

The report template (`lib/template.json`) defines 9 sections, generated in sequence:

| # | Section | Notes |
|---|---------|-------|
| 1 | Report Header / Participant Details | Table format, not narrative |
| 2 | Table of Contents | Auto-generated programmatically (skipped in LLM generation) |
| 3 | Report Overview | Disclaimer, sensitivity, confidentiality (3 paragraphs) |
| 4 | Assessment Process | Methodology outline |
| 5 | **Part A**: About The Participant | Fixed subsections: Primary Diagnosis, Social Background, Formal/Informal Supports, Home Environment |
| 6 | **Part B**: Mental Health & Psychosocial Functioning | Flexible — LLM picks 3-6 subsections tailored to participant's presentation |
| 7 | **Part C**: Functional Impairments | Core: Mobility, Personal Care ADLs, Domestic ADLs, Community Access, Communication |
| 8 | **Part D**: Assessment Findings | Standardized tool scores (WHODAS 2.0, Sensory Profile) |
| 9 | **Part E**: Summary & Recommendations | References the full report from Parts A-D; clinical goals, funding rationale |

Key design decision from the original agent: Parts B/C/D have **flexible subsection names** that adapt to the participant's clinical presentation (20 exemplars showed massive variation by diagnosis). Part A has **fixed** subsections.

## Generation Flow

1. User pastes clinical notes in chat and requests report generation
2. Client-side triggers `triggerGeneration()` which calls `/api/generate` for each of the 9 template sections **sequentially** (to stay within Vercel's 300s serverless timeout)
3. For each section:
   - Query RAG: retrieve top chunks from foundational + user exemplar layers via pgvector cosine similarity
   - Build prompt: system prompt (OT persona + NDIS advocacy rules + anti-hallucination + section description) + user prompt (clinical notes + exemplar chunks)
   - For Part E (Summary): includes the full report-so-far from Parts A-D
   - Call OpenAI → get section content
   - Save to report's JSONB `sections` field in Supabase
4. Report panel polls every 3 seconds, showing sections as they complete
5. Post-generation: coherence check sends the full assembled report to the LLM to check for contradictions and inconsistent terminology

## Prompt Design (ported from Python fca-agent)

The prompts in `lib/ai/prompts.ts` encode clinical domain expertise:
- **Persona**: Expert occupational therapist writing for the Australian NDIS
- **NDIS advocacy language**: Link every observation to functional impact, use phrases like "reduced functional capacity rather than lack of skill", "highlights the ongoing need for..."
- **Anti-hallucination**: Only include findings from clinical notes, use `[INSUFFICIENT DATA: ...]` placeholders when data is missing
- **Anti-repetition**: Don't repeat clinical reasoning from earlier sections, cross-reference instead
- **Structure**: 3-5 sentence paragraphs, proper heading hierarchy, match exemplar depth

## Revision Flow

1. User provides feedback on a specific report section
2. `/api/revise` routes feedback to affected sections (LLM-based routing)
3. For each targeted section: retrieves fresh exemplar chunks, sends current content + feedback + clinical notes to the LLM
4. After revision, a coherence check runs across the full report

## Ingest Pipeline

Upload PDF/DOCX/TXT → parse (mammoth for DOCX, pdf-parse for PDF) → chunk by section headings → embed with `text-embedding-3-large` (1536 dimensions) → store in pgvector. Raw files stored in Supabase Storage.

Foundational exemplars seeded via `scripts/seed-foundational.ts` (20 de-identified FCA reports).

## Project Structure

```
app/
  page.tsx                    Root redirect: auth check → /chat or /login
  api/
    chat/route.ts             Streaming chat with GPT-4o via AI SDK
    generate/route.ts         Per-section report generation + coherence check
    ingest/route.ts           File upload → parse → chunk → embed → store
    revise/route.ts           Section revision + re-coherence
  chat/page.tsx               Main app page — chat + report side panel
  login/page.tsx              Supabase Auth UI (email/password)
  settings/page.tsx           Exemplar upload & management

components/
  chat/                       Chat input, message list, session sidebar
  report/                     Report panel (poll + edit + revise), section viewer, DOCX export
  settings/                   Exemplar upload and list
  ui/                         shadcn/ui + prompt-kit components

lib/
  ai/
    chat-tools.ts             Zod tool schemas (generate_report, revise_section, get_report_status)
    generate.ts               Section generation + coherence check via OpenAI
    prompts.ts                7 prompt builders (ported from Python fca-agent)
    rag.ts                    Two-layer RAG query (foundational + per-user)
    revise.ts                 Feedback routing + section revision
    system-prompt.ts          Chat agent system prompt
  export/docx.ts              DOCX generation via docx library
  ingest/
    chunker.ts                Section-based text chunking
    embedder.ts               OpenAI text-embedding-3-large (1536 dims)
    parser.ts                 PDF/DOCX/MD/TXT file parsing
  supabase/                   Browser, server, and service role clients
  template.json               FCA report template (9 sections with descriptions)

scripts/
  seed-foundational.ts        Seeds 20 FCA exemplar reports as foundational RAG layer

supabase/migrations/
  001_initial_schema.sql      4 tables + pgvector + RLS + storage bucket
  002_match_function.sql      pgvector similarity search function

docs/
  design-spec.md              Full architecture spec
  implementation-plan.md      17 tasks, 88 steps
  session-log.md              Decision log from build session
```

## Database Schema

4 tables with Row-Level Security:

- **sessions** — Chat sessions per user
- **messages** — Chat messages (user + assistant) linked to sessions
- **exemplar_chunks** — RAG chunks with pgvector embeddings. `user_id = NULL` for foundational, `user_id = owner` for per-user
- **reports** — Report drafts with `sections` stored as JSONB

pgvector similarity search via `match_exemplar_chunks` stored function (cosine distance).

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For server-side operations |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `GENERATION_MODEL` | No | Defaults to `gpt-4o` |

## Setup

```bash
pnpm install
# Copy .env.local.example to .env.local and fill in values
# Run Supabase migrations (001 + 002)
# Seed foundational exemplars: pnpm tsx scripts/seed-foundational.ts
pnpm dev
```

## What's Not Built Yet

Per the session log, Task 17 (smoke test + deploy) is pending. The app needs:
1. A Supabase project with migrations run and pgvector enabled
2. Environment variables configured
3. Foundational exemplars seeded
4. Deployment to Vercel

## Known Technical Notes

- `chat-tools.ts` defines Zod tool schemas but they are **not wired** into the `/api/chat` route — the chat route doesn't pass tools to `streamText()`. Report generation is triggered client-side by keyword matching on user input.
- The design spec references gpt-5.4 models, but actual code uses `gpt-4o` (configurable via `GENERATION_MODEL`).
- Embedder uses 1536 dimensions (the design spec called for 3072 from `text-embedding-3-large` but the migration schema uses `vector(1536)`).
- `pnpm-workspace.yaml` exists but this is a single package, not a monorepo.

## Features Removed vs. v2.0

The original v2.0 had many features not (yet) present here:
- Client management (CRUD, NDIS numbers, Splose integration)
- Dashboard with stats, charts, activity feed
- Structured assessment editor (8 clinical domains, field types, autosave)
- Admin panel (prompt editing with version history, user management, exemplar quality scoring)
- PDF export (DocRaptor + client-side react-pdf)
- Report sharing with password-protected links
- Clinician sign-off and client approval workflows
- Role-based access (admin/practice_manager/clinician)
- Signup with admin approval flow
- E2E tests (Playwright)

## NDIS Domain Context

For anyone unfamiliar with the clinical domain:
- **NDIS** = National Disability Insurance Scheme (Australia) — funds disability supports
- **FCA** = Functional Capacity Assessment — clinical report documenting a participant's functional abilities and support needs, used to justify NDIS funding
- **OT** = Occupational Therapist — the clinician who conducts the assessment and writes the report
- **WHODAS 2.0** = WHO Disability Assessment Schedule — standardized 36-item assessment across 6 domains (Cognition, Mobility, Self-care, Getting Along, Life Activities, Participation)
- **ADLs** = Activities of Daily Living — personal care, domestic tasks, community participation
- Reports must use NDIS advocacy language: frame limitations in terms of functional impact and support needs, not deficits

## License

Internal project — TheraNotes.
