# TheraNotes-AI Design Spec

**Date:** 2026-04-23
**Status:** Approved
**Repo:** `ceazzar/TheraNotes-AI` (new repo)

---

## Problem Statement

Clinicians writing NDIS Functional Capacity Assessment (FCA) reports spend hours on documentation. The existing fca-agent has a proven generation pipeline (prompts, RAG, exemplars, section-by-section generation) but is wrapped in a structured form-based UI that requires significant frontend infrastructure.

TheraNotes-AI replaces all of that with a single chat interface. The user pastes clinical notes, the AI asks follow-up questions, and generates a full FCA report — all through conversation. A side panel shows the report as it's built, with direct editing and section-level revision.

## Architecture

Single repo, single deploy. No separate backend service.

```
┌─────────────────────────────────────────────────┐
│              Vercel (TheraNotes-AI)              │
│              Next.js + prompt-kit                │
│                                                  │
│  Pages:                                          │
│  ├─ /login          (Supabase Auth)              │
│  ├─ /chat           (sessions + side panel)      │
│  └─ /settings       (upload exemplars)           │
│                                                  │
│  API Routes:                                     │
│  ├─ /api/chat       (conversational, gpt-5.4)    │
│  ├─ /api/generate   (report gen, gpt-5.4-pro)             │
│  ├─ /api/revise     (section revision, gpt-5.4-pro)       │
│  └─ /api/ingest     (parse + embed uploads)      │
│                                                  │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              Supabase                            │
│                                                  │
│  Auth:     email/password + magic links          │
│  Database: PostgreSQL + pgvector                 │
│  ├─ sessions, messages (chat history)            │
│  ├─ exemplar_chunks (foundational + per-user)    │
│  └─ reports (generated sections as JSONB)        │
│  Storage:  exemplar uploads (PDF/DOCX originals) │
│                                                  │
└───────────────────┬─────────────────────────────┘
                    │
              OpenAI API
         gpt-5.4-pro (generation) + gpt-5.4 (chat)
```

### Tech Stack

- **Frontend:** Next.js (App Router) + React + Tailwind CSS + shadcn/ui + prompt-kit
- **Backend:** Next.js API Routes (Vercel serverless)
- **Database:** Supabase PostgreSQL + pgvector extension (Pro plan — free tier auto-pauses after 7 days inactivity)
- **Auth:** Supabase Auth (email/password + magic links)
- **Storage:** Supabase Storage (raw uploaded files)
- **AI:** OpenAI — gpt-5.4 for chat (highest available), gpt-5.4-pro for report generation/revision
- **Deployment:** Vercel (single project)

---

## Two AI Layers

### Chat Agent (gpt-5.4)

The conversational layer. Handles all user interaction:

- Greets the user, understands their intent
- Asks follow-up questions about the client
- Recognizes when enough information exists to generate
- Routes to the generation pipeline as a tool call
- Routes to the revision pipeline when the user gives section feedback
- Responds to general questions about the report

The chat agent is a **router, not the generator**. It never writes report content directly. When generation or revision is needed, it calls the proven fca-agent pipeline.

### Generation Engine (gpt-5.4-pro)

The generation layer. Called by the chat agent as a tool:

- Section-by-section report generation with RAG context
- Uses ported fca-agent prompts (`prompts.py` → `prompts.ts`)
- Follows `canonical_template.json` for section structure and ordering
- Retrieves relevant exemplar chunks from both RAG layers
- Runs coherence check after full report generation
- Flags sections with insufficient data
- Handles section-level revision with context-aware feedback routing

This pipeline is deterministic and predictable. The same clinical notes + exemplar context produces consistent output regardless of the chat conversation.

---

## Two RAG Layers

Both layers are stored in the same `exemplar_chunks` table, differentiated by `user_id`.

### Foundational Layer (`user_id = NULL`)

- The 20 FCA exemplar reports from the fca-agent repo (`exemplars/*.md`)
- Pre-chunked by report section, embedded, and loaded into pgvector
- Provides clinical structure, NDIS-compliant language, and FCA-specific knowledge
- Shared across all users (visible to all via RLS policy)
- Managed by admin (not user-facing)

### Per-User Layer (`user_id = owner`)

- User's uploaded exemplar reports (from Settings page)
- Chunked and embedded the same way as foundational exemplars
- Captures the user's writing style, tone, clinical language preferences
- Isolated per user via RLS — no cross-user data leakage
- User can add, remove, and re-upload exemplars at any time

### RAG Query at Generation Time

When generating a report section:

1. Embed the clinical notes + current section context
2. Query foundational layer: `WHERE user_id IS NULL ORDER BY embedding <=> $input LIMIT 5`
3. Query user layer: `WHERE user_id = $current_user ORDER BY embedding <=> $input LIMIT 3`
4. Both sets of chunks are included in the generation prompt
5. Foundational chunks teach clinical structure; user chunks teach writing voice

---

## Database Schema

Four tables plus Supabase's built-in `auth.users`.

```sql
-- Chat sessions (one per report attempt)
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  title       TEXT,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Chat messages within a session
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL,  -- 'user', 'assistant', 'system'
  content     TEXT NOT NULL,
  metadata    JSONB,          -- tool calls, section references, model info
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Exemplar chunks for RAG (two layers)
CREATE TABLE exemplar_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
                              -- NULL = foundational layer
                              -- set  = user's personal exemplars
  content     TEXT NOT NULL,
  section     TEXT,           -- which report section this chunk relates to
  source_file TEXT,           -- original filename
  embedding   vector(3072),   -- pgvector (text-embedding-3-large)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Generated reports (side panel content)
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  sections    JSONB NOT NULL DEFAULT '{}',
  status      TEXT DEFAULT 'draft',
  coherence_result TEXT,
  insufficient_data_flags TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exemplar_chunks_embedding ON exemplar_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_exemplar_chunks_user ON exemplar_chunks(user_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_reports_session ON reports(session_id);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplar_chunks ENABLE ROW LEVEL SECURITY;

-- Policies: users see only their own data
CREATE POLICY sessions_user ON sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY messages_user ON messages FOR ALL USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
);
CREATE POLICY reports_user ON reports FOR ALL USING (user_id = auth.uid());

-- Exemplar chunks: foundational (NULL) visible to all, user chunks to owner only
CREATE POLICY exemplar_foundational ON exemplar_chunks FOR SELECT USING (user_id IS NULL);
CREATE POLICY exemplar_user ON exemplar_chunks FOR ALL USING (user_id = auth.uid());
```

---

## UI Design

Three pages. Minimal, clean, prompt-kit components.

### /login

Supabase Auth UI. Email/password + magic links. Redirects to /chat on success.

### /chat

Split layout:
- **Left panel (60%):** Chat interface
  - Session list in a collapsible sidebar or top dropdown
  - Message stream using prompt-kit's Message, Chat Container, Prompt Input components
  - Prompt input at the bottom with file attachment (for pasting notes)
  - Messages show streaming text via prompt-kit's TextShimmer
- **Right panel (40%):** Report editor
  - Appears once generation starts
  - Sections listed vertically, each with:
    - Section title
    - Generated content (editable — click to edit directly)
    - "Revise" button → opens feedback input in the chat, linked to that section
  - Section selection syncs with chat context — clicking a section tells the chat agent to focus there
  - Export button (DOCX/PDF) in the panel header
  - Status indicator: draft / generating / ready

### /settings

- Upload area for exemplar reports (drag-and-drop, .docx/.pdf)
- List of uploaded exemplars with delete option
- Upload triggers `/api/ingest` → parse → chunk → embed → store
- Progress indicator during ingestion
- Count of chunks per uploaded file

---

## API Routes

### POST /api/chat

The conversational endpoint. Streaming response.

- Receives: `{ sessionId, message }`
- Authenticates via Supabase JWT
- Loads chat history from `messages` table
- Calls gpt-5.4 with:
  - System prompt defining the FCA assistant role
  - Chat history
  - Available tools: `generate_report`, `revise_section`, `get_report_status`
- When the model calls `generate_report`:
  - Extracts clinical notes from the conversation
  - Calls the generation pipeline (gpt-5.4-pro)
  - Streams section progress back to the client
  - Writes completed sections to `reports` table
- When the model calls `revise_section`:
  - Calls the revision pipeline (gpt-5.4-pro) for the specific section
  - Writes revised content to `reports` table
- Streams assistant response back to client
- Saves all messages to `messages` table

### POST /api/generate

Section-level generation endpoint (called by the chat agent tool once per section).

**Why per-section, not per-report:** Vercel serverless functions have a hard timeout of 300s on Pro tier. A full report has 12+ sections, each taking 1-3 minutes with gpt-5.4-pro. A single function call generating all sections would exceed the timeout. Instead, the chat agent calls `/api/generate` once per section, and the client orchestrates the sequence.

- Receives: `{ sessionId, reportId, sectionId, clinicalNotes, questionnaireData? }`
- Loads `canonical_template.json` for the target section's structure
- Queries foundational + user exemplar chunks via pgvector for this section
- Builds prompt using ported `prompts.ts` templates
- Calls gpt-5.4-pro for generation (streaming response)
- Writes completed section to `reports.sections` JSONB
- Returns: `{ sectionId, content, insufficientData? }`

The chat agent orchestrates the full report by calling this endpoint for each section sequentially. After all sections complete, a final `/api/generate` call with `{ action: 'coherence_check', reportId }` runs the coherence check across the full report.

### POST /api/generate (coherence check mode)

- Receives: `{ reportId, action: 'coherence_check' }`
- Loads all completed sections from `reports.sections`
- Runs coherence check prompt via gpt-5.4-pro
- Updates `reports.coherence_result` and `reports.insufficient_data_flags`
- Returns: `{ coherenceResult, insufficientDataFlags }`

### POST /api/revise

Section revision endpoint (called by the chat agent tool).

- Receives: `{ reportId, sectionId, feedback }`
- Loads current report sections
- Calls revision pipeline (gpt-5.4-pro) with:
  - The section to revise
  - Full report context
  - User feedback
  - Relevant exemplar chunks
- Updates the section in `reports.sections` JSONB
- Re-runs coherence check
- Returns: `{ revisedSections, coherenceResult }`

### POST /api/ingest

Exemplar upload and embedding endpoint.

- Receives: multipart form with file (.docx/.pdf)
- Parses document (ported from fca-agent's `parser.py`)
- Splits into section-based chunks (ported from `ingest.py`)
- Embeds each chunk via OpenAI `text-embedding-3-large`
- Stores chunks in `exemplar_chunks` with `user_id` set
- Stores raw file in Supabase Storage
- Returns: `{ chunksCreated, fileName }`

---

## Ported from fca-agent

Everything from the fca-agent's core engine is ported to TypeScript:

| fca-agent (Python) | TheraNotes-AI (TypeScript) | What it does |
|---|---|---|
| `src/prompts.py` | `lib/prompts.ts` | All prompt templates — section generation, coherence check, revision routing, clinical language rules |
| `src/generate.py` | `lib/generate.ts` | Section-by-section generation pipeline with RAG context and progress tracking |
| `src/revise.py` | `lib/revise.ts` | Feedback routing, context-aware section revision, re-coherence check |
| `src/ingest.py` | `lib/ingest.ts` | Document parsing, section-based chunking, embedding generation |
| `src/parser.py` | `lib/parser.ts` | .docx/.pdf/.md file parsing |
| `schemas/canonical_template.json` | `lib/template.json` | Report section structure, ordering, hierarchy |
| `exemplars/*.md` | Supabase pgvector (foundational layer) | 20 FCA exemplar reports, pre-chunked and embedded |

The core engine logic is preserved exactly. The only change is the execution environment (Python → TypeScript, ChromaDB → pgvector, Cloud Run → Vercel serverless).

---

## User Flow

1. **Sign up / log in** → Supabase Auth (email + magic link)
2. **Settings** → Upload 2-3 previous FCA reports for writing style ingestion
3. **New session** → Click "New Chat" or similar
4. **Paste clinical notes** → User pastes their raw clinical notes into the chat
5. **AI asks follow-ups** → Chat agent (gpt-5.4) asks clarifying questions about the client
6. **Generation** → When enough context exists, chat agent calls the generation pipeline (gpt-5.4-pro)
7. **Report appears** → Side panel populates section by section as generation progresses
8. **Review + revise** → User reads sections, clicks to edit directly or clicks "Revise" to give feedback via chat
9. **Section targeting** → Clicking a section in the side panel links the chat to that section. User says "make this more strengths-based" and the revision pipeline regenerates just that section
10. **Export** → Download as DOCX or PDF

---

## What's New (Not in fca-agent)

- Chat agent layer (conversational UX via gpt-5.4)
- Per-user writing style RAG layer
- Side panel report editor with direct editing
- Section-chat linking (click section → chat focuses on it)
- Session management (multiple reports, chat history)
- Settings page for exemplar upload/management
- DOCX/PDF export from side panel

## What's Removed (Was in fca-agent / TheraNotes)

- Jinja2 web UI (`web.py`, `templates/`, `static/`)
- Firebase Auth
- Cloud SQL / Cloud Run
- 25 Supabase Edge Functions
- Structured form-based assessment editor
- Client management CRUD
- Admin panel
- TipTap rich text editor
- Complex multi-table schema (60+ tables → 4 tables)

---

## Environment Variables

### Vercel

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — for admin operations (ingesting foundational exemplars, bypassing RLS) |
| `OPENAI_API_KEY` | OpenAI API key for gpt-5.4 and gpt-5.4-pro |

---

## Out of Scope

- Multi-tenancy / org-level isolation
- Billing / usage tracking
- Prompt A/B testing
- Rate limiting beyond basic concurrency checks
- Mobile-responsive design (desktop-first)
- Real-time collaboration (single user per session)
- Audit trail / prompt versioning
- Automatic sync between fca-agent exemplars and TheraNotes-AI foundational layer
