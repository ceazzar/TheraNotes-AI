# TheraNotes-AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chat-based FCA report generation app — single repo, single deploy — that ports the proven fca-agent pipeline into a Next.js + Supabase + OpenAI architecture with a prompt-kit chat UI and side panel report editor.

**Architecture:** One Next.js app deployed on Vercel. Supabase handles auth, database (PostgreSQL + pgvector), and file storage. OpenAI gpt-5.4 powers the chat agent; gpt-5.4-pro powers report generation/revision. The chat agent acts as a router — it never writes report content directly, instead calling the generation pipeline as a tool.

**Tech Stack:** Next.js 16 (App Router) / React 19 / Tailwind CSS / shadcn/ui / prompt-kit / Supabase (Auth + PostgreSQL + pgvector + Storage) / OpenAI (gpt-5.4, gpt-5.4-pro) / Vercel AI SDK

**Spec:** `docs/superpowers/specs/2026-04-23-theranotes-ai-design.md`

**Repos:**
- New: `ceazzar/TheraNotes-AI`
- Reference: `ceazzar/fca-agent` (Python source to port)

---

## File Structure

```
TheraNotes-AI/
├── app/
│   ├── layout.tsx                    # Root layout with Supabase provider
│   ├── page.tsx                      # Redirect to /chat or /login
│   ├── login/
│   │   └── page.tsx                  # Supabase Auth UI
│   ├── chat/
│   │   ├── layout.tsx                # Chat layout (sidebar + main area)
│   │   └── page.tsx                  # Chat + side panel split view
│   ├── settings/
│   │   └── page.tsx                  # Exemplar upload + management
│   └── api/
│       ├── chat/
│       │   └── route.ts              # Conversational endpoint (gpt-5.4 + tools)
│       ├── generate/
│       │   └── route.ts              # Per-section generation (gpt-5.4-pro)
│       ├── revise/
│       │   └── route.ts              # Section revision (gpt-5.4-pro)
│       └── ingest/
│           └── route.ts              # Parse + embed uploaded exemplars
├── components/
│   ├── chat/
│   │   ├── chat-container.tsx        # Main chat message list + input
│   │   ├── message-list.tsx          # Scrollable message stream
│   │   ├── session-sidebar.tsx       # Session list sidebar
│   │   └── chat-input.tsx            # Prompt input with attachment
│   ├── report/
│   │   ├── report-panel.tsx          # Side panel container
│   │   ├── report-section.tsx        # Individual section (view/edit/revise)
│   │   └── export-button.tsx         # DOCX/PDF export trigger
│   ├── settings/
│   │   ├── exemplar-upload.tsx       # Drag-and-drop upload area
│   │   └── exemplar-list.tsx         # List of uploaded exemplars
│   ├── auth/
│   │   └── auth-guard.tsx            # Redirect unauthenticated users
│   └── ui/                           # shadcn/ui + prompt-kit components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server-side Supabase client
│   │   └── middleware.ts             # Auth middleware for API routes
│   ├── ai/
│   │   ├── prompts.ts                # Ported from fca-agent src/prompts.py
│   │   ├── generate.ts               # Ported from fca-agent src/generate.py
│   │   ├── revise.ts                 # Ported from fca-agent src/revise.py
│   │   ├── rag.ts                    # pgvector RAG queries (two-layer)
│   │   ├── chat-tools.ts             # Tool definitions for the chat agent
│   │   └── system-prompt.ts          # Chat agent system prompt
│   ├── ingest/
│   │   ├── parser.ts                 # Ported from fca-agent src/parser.py
│   │   ├── chunker.ts                # Ported from fca-agent src/ingest.py
│   │   └── embedder.ts               # OpenAI embedding calls
│   ├── export/
│   │   └── docx.ts                   # DOCX generation from report sections
│   └── template.json                 # Ported from fca-agent schemas/canonical_template.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # All tables, indexes, RLS policies
├── scripts/
│   └── seed-foundational.ts          # Ingest fca-agent exemplars into pgvector
├── middleware.ts                      # Next.js middleware for auth redirects
├── .env.local.example                # Environment variable template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Task Dependency Order

Tasks 1-3 are foundational (scaffold, database, auth). Tasks 4-6 are the engine (port fca-agent pipeline). Tasks 7-10 are the API layer. Tasks 11-14 are the UI. Task 15 is seeding. Task 16 is export. Task 17 is integration testing.

```
Task 1 (scaffold) → Task 2 (database) → Task 3 (auth)
                                            ↓
Task 4 (prompts) → Task 5 (RAG) → Task 6 (generate/revise)
                                            ↓
Task 7 (ingest API) → Task 8 (generate API) → Task 9 (revise API) → Task 10 (chat API)
                                                                          ↓
Task 11 (login UI) → Task 12 (chat UI) → Task 13 (report panel) → Task 14 (settings UI)
                                                                          ↓
Task 15 (seed foundational) → Task 16 (export) → Task 17 (integration test)
```

---

## Task 1: Scaffold the Next.js Project

Create the new repo with Next.js, Tailwind, shadcn/ui, and prompt-kit.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.env.local.example`

- [ ] **Step 1: Create the repo and scaffold Next.js**

```bash
mkdir TheraNotes-AI && cd TheraNotes-AI
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
```

- [ ] **Step 2: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables.

- [ ] **Step 3: Install prompt-kit chat components**

```bash
npx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://prompt-kit.com/c/message.json"
npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://prompt-kit.com/c/file-upload.json"
npx shadcn@latest add "https://prompt-kit.com/c/markdown.json"
npx shadcn@latest add "https://prompt-kit.com/c/text-shimmer.json"
npx shadcn@latest add "https://prompt-kit.com/c/loader.json"
```

- [ ] **Step 4: Install dependencies**

```bash
pnpm add @supabase/supabase-js @supabase/ssr ai @ai-sdk/openai openai docx file-saver
pnpm add -D @types/file-saver
```

- [ ] **Step 5: Create environment template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

- [ ] **Step 6: Set maxDuration for API routes**

Create `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
```

- [ ] **Step 7: Verify the app starts**

```bash
pnpm dev
```

Expected: Next.js dev server running on http://localhost:3000

- [ ] **Step 8: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + shadcn/ui + prompt-kit project"
```

---

## Task 2: Supabase Database Schema

Set up the 4-table schema with pgvector, indexes, and RLS policies.

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Chat sessions (one per report attempt)
CREATE TABLE public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Chat messages within a session
CREATE TABLE public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Exemplar chunks for RAG (two layers)
CREATE TABLE public.exemplar_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  section     TEXT,
  source_file TEXT,
  embedding   extensions.vector(3072),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Generated reports (side panel content)
CREATE TABLE public.reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sections    JSONB NOT NULL DEFAULT '{}',
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'failed')),
  coherence_result TEXT,
  insufficient_data_flags TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sessions_user ON public.sessions(user_id);
CREATE INDEX idx_messages_session ON public.messages(session_id);
CREATE INDEX idx_messages_created ON public.messages(session_id, created_at);
CREATE INDEX idx_exemplar_chunks_user ON public.exemplar_chunks(user_id);
CREATE INDEX idx_reports_session ON public.reports(session_id);
CREATE INDEX idx_reports_user ON public.reports(user_id);

-- pgvector index (IVFFlat for cosine similarity)
CREATE INDEX idx_exemplar_chunks_embedding ON public.exemplar_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exemplar_chunks ENABLE ROW LEVEL SECURITY;

-- Sessions: users see only their own
CREATE POLICY sessions_select ON public.sessions FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY sessions_insert ON public.sessions FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY sessions_update ON public.sessions FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY sessions_delete ON public.sessions FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Messages: users see messages in their sessions
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  session_id IN (SELECT id FROM public.sessions WHERE user_id = (SELECT auth.uid()))
);
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  session_id IN (SELECT id FROM public.sessions WHERE user_id = (SELECT auth.uid()))
);

-- Reports: users see only their own
CREATE POLICY reports_select ON public.reports FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY reports_insert ON public.reports FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY reports_update ON public.reports FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Exemplar chunks: foundational (NULL user_id) readable by all authenticated users
CREATE POLICY exemplar_foundational_select ON public.exemplar_chunks
  FOR SELECT USING (user_id IS NULL);

-- Exemplar chunks: user's own chunks
CREATE POLICY exemplar_user_select ON public.exemplar_chunks
  FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY exemplar_user_insert ON public.exemplar_chunks
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY exemplar_user_delete ON public.exemplar_chunks
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for exemplar uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('exemplars', 'exemplars', false);

-- Storage RLS: users can only access their own uploads
CREATE POLICY exemplar_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'exemplars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY exemplar_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exemplars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY exemplar_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'exemplars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
```

- [ ] **Step 2: Apply the migration to Supabase**

Run this SQL in the Supabase Dashboard → SQL Editor. Or if using the Supabase CLI:

```bash
supabase db push
```

- [ ] **Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm these tables exist: `sessions`, `messages`, `exemplar_chunks`, `reports`.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with pgvector, RLS, and storage"
```

---

## Task 3: Supabase Auth + Middleware

Set up Supabase client helpers and Next.js middleware for auth.

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}
```

- [ ] **Step 3: Create auth middleware helper**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/chat'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 4: Create Next.js middleware**

Create `middleware.ts` (project root):

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

- [ ] **Step 5: Create API route auth helper**

Create `lib/supabase/api-auth.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''

  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

- [ ] **Step 6: Verify middleware compiles**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/supabase/ middleware.ts
git commit -m "feat: add Supabase auth clients and middleware"
```

---

## Task 4: Port Prompt Templates

Port `src/prompts.py` from fca-agent to TypeScript. Also port `canonical_template.json`.

**Files:**
- Create: `lib/ai/prompts.ts`, `lib/ai/system-prompt.ts`, `lib/template.json`

- [ ] **Step 1: Clone fca-agent to read the source**

```bash
git clone --depth 1 git@github.com:ceazzar/fca-agent.git /tmp/fca-agent-source
```

- [ ] **Step 2: Read and port prompts.py**

Read `/tmp/fca-agent-source/src/prompts.py` and create `lib/ai/prompts.ts`. This file must contain every prompt template from the Python source, converted to TypeScript template literals. The structure:

```typescript
export function sectionGenerationPrompt(params: {
  sectionName: string
  sectionDescription: string
  clinicalNotes: string
  foundationalExemplars: string[]
  userStyleExemplars: string[]
  previousSections: Record<string, string>
  template: SectionTemplate
}): string {
  // Port the exact prompt from prompts.py
  // Preserve all clinical language instructions, NDIS compliance rules,
  // evidence-based writing guidelines
  return `...`
}

export function coherenceCheckPrompt(params: {
  fullReport: string
  clinicalNotes: string
}): string {
  // Port from prompts.py
  return `...`
}

export function revisionPrompt(params: {
  sectionName: string
  currentContent: string
  feedback: string
  fullReportContext: string
  exemplars: string[]
}): string {
  // Port from prompts.py
  return `...`
}

export function insufficientDataPrompt(params: {
  sectionName: string
  clinicalNotes: string
}): string {
  // Port from prompts.py
  return `...`
}
```

**IMPORTANT:** Read the actual Python source and port every prompt verbatim. Do not summarize or simplify the clinical instructions. The prompt quality is the core value of fca-agent.

- [ ] **Step 3: Create the chat agent system prompt**

Create `lib/ai/system-prompt.ts`:

```typescript
export const SYSTEM_PROMPT = `You are TheraNotes AI, a clinical assistant that helps allied health professionals write NDIS Functional Capacity Assessment (FCA) reports.

Your role:
- You help clinicians generate FCA reports from their clinical notes
- You ask clarifying questions to fill gaps in the clinical information
- When enough information is gathered, you call the generate_report tool to produce the report
- You can revise individual sections based on feedback using the revise_section tool
- You match the clinician's writing style based on their uploaded exemplar reports

Workflow:
1. The user will paste their clinical notes about a client
2. Review the notes and ask any necessary follow-up questions
3. When you have enough information, call generate_report to start section-by-section generation
4. After generation, help the user refine specific sections via revise_section

Rules:
- Never write report content directly — always use the generation/revision tools
- Be concise in your conversational responses
- Use clinical language appropriate for NDIS documentation
- If the user clicks a section in the report panel, they want to discuss/revise that specific section
- When the user provides feedback on a section, call revise_section with their feedback`
```

- [ ] **Step 4: Copy canonical_template.json**

```bash
cp /tmp/fca-agent-source/schemas/canonical_template.json lib/template.json
```

- [ ] **Step 5: Verify imports compile**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/prompts.ts lib/ai/system-prompt.ts lib/template.json
git commit -m "feat: port prompt templates and report structure from fca-agent"
```

---

## Task 5: RAG Query Layer

Build the two-layer pgvector RAG query system.

**Files:**
- Create: `lib/ai/rag.ts`, `lib/ingest/embedder.ts`

- [ ] **Step 1: Create the embedding helper**

Create `lib/ingest/embedder.ts`:

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  })
  return response.data[0].embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts,
  })
  return response.data.map(d => d.embedding)
}
```

- [ ] **Step 2: Create the two-layer RAG query**

Create `lib/ai/rag.ts`:

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ingest/embedder'

export interface RagChunk {
  id: string
  content: string
  section: string | null
  sourceFile: string | null
  similarity: number
}

export async function queryRag(params: {
  queryText: string
  userId: string
  sectionFilter?: string
  foundationalLimit?: number
  userLimit?: number
}): Promise<{ foundational: RagChunk[]; userStyle: RagChunk[] }> {
  const {
    queryText,
    userId,
    sectionFilter,
    foundationalLimit = 5,
    userLimit = 3,
  } = params

  const embedding = await embedText(queryText)
  const supabase = await createServiceClient()
  const embeddingStr = `[${embedding.join(',')}]`

  const foundationalQuery = supabase.rpc('match_exemplar_chunks', {
    query_embedding: embeddingStr,
    match_count: foundationalLimit,
    filter_user_id: null,
    filter_section: sectionFilter ?? null,
  })

  const userQuery = supabase.rpc('match_exemplar_chunks', {
    query_embedding: embeddingStr,
    match_count: userLimit,
    filter_user_id: userId,
    filter_section: sectionFilter ?? null,
  })

  const [foundationalResult, userResult] = await Promise.all([
    foundationalQuery,
    userQuery,
  ])

  return {
    foundational: (foundationalResult.data ?? []).map(mapChunk),
    userStyle: (userResult.data ?? []).map(mapChunk),
  }
}

function mapChunk(row: Record<string, unknown>): RagChunk {
  return {
    id: row.id as string,
    content: row.content as string,
    section: row.section as string | null,
    sourceFile: row.source_file as string | null,
    similarity: row.similarity as number,
  }
}
```

- [ ] **Step 3: Add the pgvector match function to the migration**

Create `supabase/migrations/002_match_function.sql`:

```sql
CREATE OR REPLACE FUNCTION public.match_exemplar_chunks(
  query_embedding extensions.vector(3072),
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_section TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  section TEXT,
  source_file TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.content,
    ec.section,
    ec.source_file,
    1 - (ec.embedding <=> query_embedding) AS similarity
  FROM public.exemplar_chunks ec
  WHERE
    (filter_user_id IS NULL AND ec.user_id IS NULL)
    OR (filter_user_id IS NOT NULL AND ec.user_id = filter_user_id)
  AND
    (filter_section IS NULL OR ec.section = filter_section)
  ORDER BY ec.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

- [ ] **Step 4: Apply the migration**

Run the SQL in Supabase Dashboard → SQL Editor.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/rag.ts lib/ingest/embedder.ts supabase/migrations/002_match_function.sql
git commit -m "feat: add two-layer RAG query system with pgvector"
```

---

## Task 6: Port Generation and Revision Pipelines

Port `src/generate.py` and `src/revise.py` from fca-agent.

**Files:**
- Create: `lib/ai/generate.ts`, `lib/ai/revise.ts`

- [ ] **Step 1: Read the fca-agent source**

```bash
cat /tmp/fca-agent-source/src/generate.py
cat /tmp/fca-agent-source/src/revise.py
```

Understand the pipeline: section iteration, RAG retrieval per section, prompt assembly, OpenAI call, coherence check, insufficient data flagging.

- [ ] **Step 2: Port generate.py**

Create `lib/ai/generate.ts`:

```typescript
import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import { sectionGenerationPrompt, coherenceCheckPrompt, insufficientDataPrompt } from '@/lib/ai/prompts'
import template from '@/lib/template.json'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface GenerateSectionParams {
  sectionId: string
  clinicalNotes: string
  userId: string
  previousSections: Record<string, string>
  questionnaireData?: string
}

export interface GenerateSectionResult {
  sectionId: string
  title: string
  content: string
  insufficientData: boolean
}

export async function generateSection(
  params: GenerateSectionParams
): Promise<GenerateSectionResult> {
  const { sectionId, clinicalNotes, userId, previousSections, questionnaireData } = params

  const sectionTemplate = template.sections.find(
    (s: { id: string }) => s.id === sectionId
  )
  if (!sectionTemplate) {
    throw new Error(`Section ${sectionId} not found in template`)
  }

  const ragResults = await queryRag({
    queryText: `${sectionTemplate.name}: ${clinicalNotes.slice(0, 500)}`,
    userId,
    sectionFilter: sectionTemplate.name,
  })

  const prompt = sectionGenerationPrompt({
    sectionName: sectionTemplate.name,
    sectionDescription: sectionTemplate.description ?? '',
    clinicalNotes,
    foundationalExemplars: ragResults.foundational.map(c => c.content),
    userStyleExemplars: ragResults.userStyle.map(c => c.content),
    previousSections,
    template: sectionTemplate,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-pro',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  })

  const content = response.choices[0].message.content ?? ''

  const insufficientCheck = await openai.chat.completions.create({
    model: 'gpt-5.4-pro',
    messages: [{
      role: 'user',
      content: insufficientDataPrompt({
        sectionName: sectionTemplate.name,
        clinicalNotes,
      }),
    }],
    temperature: 0,
  })

  const insufficientData = (insufficientCheck.choices[0].message.content ?? '')
    .toLowerCase().includes('insufficient')

  return {
    sectionId,
    title: sectionTemplate.name,
    content,
    insufficientData,
  }
}

export async function runCoherenceCheck(params: {
  fullReport: string
  clinicalNotes: string
}): Promise<string> {
  const prompt = coherenceCheckPrompt(params)

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-pro',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  })

  return response.choices[0].message.content ?? ''
}
```

- [ ] **Step 3: Port revise.py**

Create `lib/ai/revise.ts`:

```typescript
import OpenAI from 'openai'
import { queryRag } from '@/lib/ai/rag'
import { revisionPrompt } from '@/lib/ai/prompts'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ReviseSectionParams {
  sectionId: string
  sectionName: string
  currentContent: string
  feedback: string
  fullReportContext: string
  userId: string
  clinicalNotes: string
}

export interface ReviseSectionResult {
  sectionId: string
  revisedContent: string
}

export async function reviseSection(
  params: ReviseSectionParams
): Promise<ReviseSectionResult> {
  const {
    sectionId, sectionName, currentContent,
    feedback, fullReportContext, userId, clinicalNotes,
  } = params

  const ragResults = await queryRag({
    queryText: `${sectionName}: ${feedback}`,
    userId,
    sectionFilter: sectionName,
  })

  const prompt = revisionPrompt({
    sectionName,
    currentContent,
    feedback,
    fullReportContext,
    exemplars: [
      ...ragResults.foundational.map(c => c.content),
      ...ragResults.userStyle.map(c => c.content),
    ],
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-pro',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  })

  return {
    sectionId,
    revisedContent: response.choices[0].message.content ?? '',
  }
}
```

- [ ] **Step 4: Verify imports compile**

```bash
pnpm build
```

Expected: Build succeeds (some warnings about unused imports are OK at this stage).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/generate.ts lib/ai/revise.ts
git commit -m "feat: port generation and revision pipelines from fca-agent"
```

---

## Task 7: Ingest API Route

Port document parsing and chunking, wire up the `/api/ingest` endpoint.

**Files:**
- Create: `lib/ingest/parser.ts`, `lib/ingest/chunker.ts`, `app/api/ingest/route.ts`

- [ ] **Step 1: Read fca-agent parser and ingest source**

```bash
cat /tmp/fca-agent-source/src/parser.py
cat /tmp/fca-agent-source/src/ingest.py
```

- [ ] **Step 2: Port parser.py**

Create `lib/ingest/parser.ts`:

```typescript
import mammoth from 'mammoth'

export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'md' || ext === 'txt') {
    return buffer.toString('utf-8')
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }

  throw new Error(`Unsupported file type: ${ext}`)
}
```

- [ ] **Step 3: Install parser dependencies**

```bash
pnpm add mammoth pdf-parse
pnpm add -D @types/pdf-parse
```

- [ ] **Step 4: Port ingest.py chunking logic**

Create `lib/ingest/chunker.ts`:

```typescript
import template from '@/lib/template.json'

export interface Chunk {
  content: string
  section: string | null
}

export function chunkBySection(text: string): Chunk[] {
  const sectionNames = template.sections.map(
    (s: { name: string }) => s.name
  )
  const chunks: Chunk[] = []
  const lines = text.split('\n')
  let currentSection: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    const matchedSection = sectionNames.find(name =>
      line.toLowerCase().includes(name.toLowerCase())
    )

    if (matchedSection && currentLines.length > 0) {
      const content = currentLines.join('\n').trim()
      if (content.length > 50) {
        chunks.push({ content, section: currentSection })
      }
      currentLines = []
    }

    if (matchedSection) {
      currentSection = matchedSection
    }

    currentLines.push(line)
  }

  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim()
    if (content.length > 50) {
      chunks.push({ content, section: currentSection })
    }
  }

  return chunks
}
```

- [ ] **Step 5: Create the ingest API route**

Create `app/api/ingest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/ingest/parser'
import { chunkBySection } from '@/lib/ingest/chunker'
import { embedBatch } from '@/lib/ingest/embedder'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await parseDocument(buffer, file.name)
  const chunks = chunkBySection(text)

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'No content found in file' }, { status: 400 })
  }

  const embeddings = await embedBatch(chunks.map(c => c.content))

  const rows = chunks.map((chunk, i) => ({
    user_id: user.id,
    content: chunk.content,
    section: chunk.section,
    source_file: file.name,
    embedding: `[${embeddings[i].join(',')}]`,
  }))

  const { error } = await supabase.from('exemplar_chunks').insert(rows)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const storagePath = `${user.id}/${file.name}`
  await supabase.storage.from('exemplars').upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  })

  return NextResponse.json({
    chunksCreated: chunks.length,
    fileName: file.name,
  })
}
```

- [ ] **Step 6: Verify build**

```bash
pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add lib/ingest/ app/api/ingest/
git commit -m "feat: add ingest API for exemplar upload, parsing, and embedding"
```

---

## Task 8: Generate API Route

Wire up per-section generation endpoint.

**Files:**
- Create: `app/api/generate/route.ts`

- [ ] **Step 1: Create the generate route**

Create `app/api/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSection, runCoherenceCheck } from '@/lib/ai/generate'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (body.action === 'coherence_check') {
    const { data: report } = await supabase
      .from('reports')
      .select('sections')
      .eq('id', body.reportId)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const fullReport = Object.entries(report.sections as Record<string, { title: string; content: string }>)
      .map(([, s]) => `## ${s.title}\n\n${s.content}`)
      .join('\n\n')

    const coherenceResult = await runCoherenceCheck({
      fullReport,
      clinicalNotes: body.clinicalNotes ?? '',
    })

    await supabase
      .from('reports')
      .update({
        coherence_result: coherenceResult,
        status: 'ready',
      })
      .eq('id', body.reportId)

    return NextResponse.json({ coherenceResult })
  }

  const { sessionId, reportId, sectionId, clinicalNotes, questionnaireData } = body

  let currentReportId = reportId
  if (!currentReportId) {
    const { data: newReport } = await supabase
      .from('reports')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        status: 'generating',
      })
      .select('id')
      .single()

    currentReportId = newReport!.id
  }

  const { data: report } = await supabase
    .from('reports')
    .select('sections')
    .eq('id', currentReportId)
    .single()

  const existingSections = (report?.sections ?? {}) as Record<string, { title: string; content: string }>
  const previousSections: Record<string, string> = {}
  for (const [key, val] of Object.entries(existingSections)) {
    previousSections[key] = val.content
  }

  const result = await generateSection({
    sectionId,
    clinicalNotes,
    userId: user.id,
    previousSections,
    questionnaireData,
  })

  const updatedSections = {
    ...existingSections,
    [sectionId]: { title: result.title, content: result.content },
  }

  await supabase
    .from('reports')
    .update({ sections: updatedSections })
    .eq('id', currentReportId)

  return NextResponse.json({
    reportId: currentReportId,
    sectionId: result.sectionId,
    content: result.content,
    insufficientData: result.insufficientData,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate/
git commit -m "feat: add per-section generate API route"
```

---

## Task 9: Revise API Route

Wire up section revision endpoint.

**Files:**
- Create: `app/api/revise/route.ts`

- [ ] **Step 1: Create the revise route**

Create `app/api/revise/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reviseSection } from '@/lib/ai/revise'
import { runCoherenceCheck } from '@/lib/ai/generate'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reportId, sectionId, feedback } = await request.json()

  const { data: report } = await supabase
    .from('reports')
    .select('sections')
    .eq('id', reportId)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const sections = report.sections as Record<string, { title: string; content: string }>
  const targetSection = sections[sectionId]

  if (!targetSection) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  const fullReportContext = Object.entries(sections)
    .map(([, s]) => `## ${s.title}\n\n${s.content}`)
    .join('\n\n')

  const result = await reviseSection({
    sectionId,
    sectionName: targetSection.title,
    currentContent: targetSection.content,
    feedback,
    fullReportContext,
    userId: user.id,
    clinicalNotes: '',
  })

  const updatedSections = {
    ...sections,
    [sectionId]: { title: targetSection.title, content: result.revisedContent },
  }

  await supabase
    .from('reports')
    .update({ sections: updatedSections })
    .eq('id', reportId)

  const coherenceResult = await runCoherenceCheck({
    fullReport: Object.entries(updatedSections)
      .map(([, s]) => `## ${s.title}\n\n${s.content}`)
      .join('\n\n'),
    clinicalNotes: '',
  })

  await supabase
    .from('reports')
    .update({ coherence_result: coherenceResult })
    .eq('id', reportId)

  return NextResponse.json({
    sectionId,
    revisedContent: result.revisedContent,
    coherenceResult,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/revise/
git commit -m "feat: add section revision API route"
```

---

## Task 10: Chat API Route

The main conversational endpoint with tool calling. Uses Vercel AI SDK for streaming.

**Files:**
- Create: `lib/ai/chat-tools.ts`, `app/api/chat/route.ts`

- [ ] **Step 1: Define chat agent tools**

Create `lib/ai/chat-tools.ts`:

```typescript
import { z } from 'zod'
import { tool } from 'ai'

export const chatTools = {
  generate_report: tool({
    description: 'Generate an FCA report from the clinical notes gathered in the conversation. Call this when the user has provided enough clinical information to start report generation.',
    parameters: z.object({
      clinicalNotes: z.string().describe('The full clinical notes gathered from the conversation'),
      questionnaireData: z.string().optional().describe('Any questionnaire data (WHODAS, Sensory Profile scores) if provided'),
    }),
  }),

  revise_section: tool({
    description: 'Revise a specific section of the generated report based on user feedback. Call this when the user asks to change, improve, or update a section.',
    parameters: z.object({
      sectionId: z.string().describe('The section ID to revise'),
      feedback: z.string().describe('The user feedback describing what to change'),
    }),
  }),

  get_report_status: tool({
    description: 'Check the current status of the report being generated.',
    parameters: z.object({}),
  }),
}
```

- [ ] **Step 2: Create the chat route**

Create `app/api/chat/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { chatTools } from '@/lib/ai/chat-tools'
import template from '@/lib/template.json'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, sessionId } = await request.json()

  const { data: report } = await supabase
    .from('reports')
    .select('id, sections, status')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sectionList = template.sections
    .filter((s: { auto_generate?: boolean }) => !s.auto_generate)
    .map((s: { id: string; name: string }) => `- ${s.id}: ${s.name}`)
    .join('\n')

  const contextPrompt = `${SYSTEM_PROMPT}

Available report sections:
${sectionList}

${report ? `Current report status: ${report.status}. Sections completed: ${Object.keys(report.sections as object).length}/${template.sections.length}` : 'No report started yet for this session.'}`

  const result = streamText({
    model: openai('gpt-5.4'),
    system: contextPrompt,
    messages,
    tools: chatTools,
    maxSteps: 5,
    onFinish: async ({ text }) => {
      if (text) {
        await supabase.from('messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: text,
        })
      }
    },
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai/chat-tools.ts app/api/chat/
git commit -m "feat: add chat API route with tool calling and streaming"
```

---

## Task 11: Login Page

Simple Supabase Auth UI.

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Install Supabase Auth UI**

```bash
pnpm add @supabase/auth-ui-react @supabase/auth-ui-shared
```

- [ ] **Step 2: Create login page**

Create `app/login/page.tsx`:

```typescript
'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">TheraNotes AI</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to start generating FCA reports
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/chat`}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update root page to redirect**

Create `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/login/ app/page.tsx
git commit -m "feat: add login page with Supabase Auth UI"
```

---

## Task 12: Chat UI

The main chat interface with session sidebar and message stream.

**Files:**
- Create: `app/chat/layout.tsx`, `app/chat/page.tsx`, `components/chat/chat-container.tsx`, `components/chat/message-list.tsx`, `components/chat/session-sidebar.tsx`, `components/chat/chat-input.tsx`

- [ ] **Step 1: Create session sidebar**

Create `components/chat/session-sidebar.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  title: string | null
  status: string
  created_at: string
}

export function SessionSidebar({
  activeSessionId,
  onSelectSession,
  onNewSession,
}: {
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sessions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
      setSessions(data ?? [])
    }
    load()
  }, [activeSessionId])

  return (
    <div className="w-64 border-r border-border flex flex-col h-full bg-muted/30">
      <div className="p-3 border-b border-border">
        <button
          onClick={onNewSession}
          className="w-full px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={cn(
              'w-full text-left px-3 py-2 text-sm rounded-md truncate',
              session.id === activeSessionId
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            {session.title ?? 'New session'}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create chat message list**

Create `components/chat/message-list.tsx`:

```typescript
'use client'

import { Message } from '@/components/ui/message'
import { Markdown } from '@/components/ui/markdown'
import { Loader } from '@/components/ui/loader'
import type { Message as AIMessage } from 'ai'

export function MessageList({
  messages,
  isLoading,
}: {
  messages: AIMessage[]
  isLoading: boolean
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Paste your clinical notes to get started
        </div>
      )}
      {messages.map(message => (
        <div
          key={message.id}
          className={cn(
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-lg px-4 py-3 text-sm',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {message.role === 'assistant' ? (
              <Markdown>{message.content}</Markdown>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg px-4 py-3">
            <Loader />
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
```

- [ ] **Step 3: Create chat input**

Create `components/chat/chat-input.tsx`:

```typescript
'use client'

import { PromptInput, PromptInputTextarea, PromptInputAction } from '@/components/ui/prompt-input'
import { Send } from 'lucide-react'

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
}: {
  input: string
  setInput: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}) {
  return (
    <div className="border-t border-border p-4">
      <PromptInput
        value={input}
        onValueChange={setInput}
        onSubmit={onSubmit}
        isLoading={isLoading}
        className="max-w-full"
      >
        <PromptInputTextarea
          placeholder="Paste clinical notes or describe your client..."
          className="min-h-[60px]"
        />
        <PromptInputAction
          type="submit"
          disabled={!input.trim() || isLoading}
          tooltip="Send"
        >
          <Send className="h-4 w-4" />
        </PromptInputAction>
      </PromptInput>
    </div>
  )
}
```

- [ ] **Step 4: Create chat layout**

Create `app/chat/layout.tsx`:

```typescript
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Create main chat page**

Create `app/chat/page.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useChat } from 'ai/react'
import { createClient } from '@/lib/supabase/client'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ReportPanel } from '@/components/report/report-panel'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const supabase = createClient()

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { sessionId },
    onFinish: () => {
      // Refresh report panel when generation tools are called
    },
  })

  const createSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('sessions')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (data) setSessionId(data.id)
  }, [supabase])

  const onSubmit = useCallback(() => {
    if (!sessionId) {
      createSession().then(() => handleSubmit())
    } else {
      handleSubmit()
    }
  }, [sessionId, createSession, handleSubmit])

  return (
    <>
      <SessionSidebar
        activeSessionId={sessionId}
        onSelectSession={setSessionId}
        onNewSession={createSession}
      />
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col min-w-0">
          <MessageList messages={messages} isLoading={isLoading} />
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        </div>
        {sessionId && (
          <ReportPanel sessionId={sessionId} />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/chat/ components/chat/
git commit -m "feat: add chat UI with session sidebar, messages, and input"
```

---

## Task 13: Report Side Panel

The right-side report editor with section editing and revision.

**Files:**
- Create: `components/report/report-panel.tsx`, `components/report/report-section.tsx`, `components/report/export-button.tsx`

- [ ] **Step 1: Create report section component**

Create `components/report/report-section.tsx`:

```typescript
'use client'

import { useState } from 'react'

interface ReportSectionProps {
  sectionId: string
  title: string
  content: string
  onRevise: (sectionId: string) => void
  onEdit: (sectionId: string, content: string) => void
}

export function ReportSection({
  sectionId, title, content, onRevise, onEdit,
}: ReportSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)

  const handleSave = () => {
    onEdit(sectionId, editContent)
    setIsEditing(false)
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onRevise(sectionId)}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent text-muted-foreground"
          >
            Revise
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent text-muted-foreground"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full min-h-[120px] p-2 text-sm bg-background border border-border rounded-md resize-y"
          />
          <button
            onClick={handleSave}
            className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create report panel**

Create `components/report/report-panel.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportSection } from '@/components/report/report-section'
import { ExportButton } from '@/components/report/export-button'

interface Report {
  id: string
  sections: Record<string, { title: string; content: string }>
  status: string
}

export function ReportPanel({
  sessionId,
  onReviseSection,
}: {
  sessionId: string
  onReviseSection?: (sectionId: string) => void
}) {
  const [report, setReport] = useState<Report | null>(null)
  const supabase = createClient()

  const loadReport = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, sections, status')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) setReport(data as Report)
  }, [sessionId, supabase])

  useEffect(() => {
    loadReport()
    const interval = setInterval(loadReport, 3000)
    return () => clearInterval(interval)
  }, [loadReport])

  if (!report || Object.keys(report.sections).length === 0) {
    return (
      <div className="w-[40%] border-l border-border flex items-center justify-center text-muted-foreground text-sm p-8 text-center">
        Report will appear here once generation starts
      </div>
    )
  }

  const handleEdit = async (sectionId: string, content: string) => {
    const updatedSections = {
      ...report.sections,
      [sectionId]: { ...report.sections[sectionId], content },
    }
    await supabase
      .from('reports')
      .update({ sections: updatedSections })
      .eq('id', report.id)
    setReport({ ...report, sections: updatedSections })
  }

  return (
    <div className="w-[40%] border-l border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Report</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {report.status}
          </span>
        </div>
        <ExportButton sections={report.sections} />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.entries(report.sections).map(([id, section]) => (
          <ReportSection
            key={id}
            sectionId={id}
            title={section.title}
            content={section.content}
            onRevise={onReviseSection ?? (() => {})}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create export button placeholder**

Create `components/report/export-button.tsx`:

```typescript
'use client'

export function ExportButton({
  sections,
}: {
  sections: Record<string, { title: string; content: string }>
}) {
  const handleExport = async () => {
    // Task 16 implements the full DOCX export
    const text = Object.entries(sections)
      .map(([, s]) => `${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground"
    >
      Export
    </button>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/report/
git commit -m "feat: add report side panel with section editing and revision"
```

---

## Task 14: Settings Page

Exemplar upload and management.

**Files:**
- Create: `app/settings/page.tsx`, `components/settings/exemplar-upload.tsx`, `components/settings/exemplar-list.tsx`

- [ ] **Step 1: Create exemplar upload component**

Create `components/settings/exemplar-upload.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/ui/file-upload'

export function ExemplarUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleUpload = async (files: File[]) => {
    setUploading(true)
    setStatus(null)

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/ingest', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok) {
        setStatus(`${file.name}: ${data.chunksCreated} chunks created`)
      } else {
        setStatus(`${file.name}: Error — ${data.error}`)
      }
    }

    setUploading(false)
    onUploadComplete()
  }

  return (
    <div className="space-y-4">
      <FileUpload
        onFilesAdded={handleUpload}
        accept=".docx,.pdf,.md,.txt"
        disabled={uploading}
      />
      {uploading && <p className="text-sm text-muted-foreground">Processing...</p>}
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create exemplar list component**

Create `components/settings/exemplar-list.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ExemplarFile {
  name: string
  chunkCount: number
}

export function ExemplarList({ refreshKey }: { refreshKey: number }) {
  const [files, setFiles] = useState<ExemplarFile[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('exemplar_chunks')
        .select('source_file')

      if (!data) return

      const counts = new Map<string, number>()
      for (const row of data) {
        const name = row.source_file ?? 'Unknown'
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }

      setFiles(
        Array.from(counts.entries()).map(([name, chunkCount]) => ({
          name,
          chunkCount,
        }))
      )
    }
    load()
  }, [refreshKey, supabase])

  const handleDelete = async (fileName: string) => {
    await supabase
      .from('exemplar_chunks')
      .delete()
      .eq('source_file', fileName)

    setFiles(files.filter(f => f.name !== fileName))
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No exemplars uploaded yet. Upload your previous FCA reports to teach the AI your writing style.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {files.map(file => (
        <div
          key={file.name}
          className="flex items-center justify-between px-3 py-2 rounded-md bg-muted"
        >
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{file.chunkCount} chunks</p>
          </div>
          <button
            onClick={() => handleDelete(file.name)}
            className="text-xs px-2 py-1 rounded text-destructive hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create settings page**

Create `app/settings/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ExemplarUpload } from '@/components/settings/exemplar-upload'
import { ExemplarList } from '@/components/settings/exemplar-list'
import Link from 'next/link'

export default function SettingsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link
            href="/chat"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Chat
          </Link>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium">Writing Style Exemplars</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your previous FCA reports. The AI learns your writing style,
              tone, and clinical language from these documents.
            </p>
          </div>
          <ExemplarUpload onUploadComplete={() => setRefreshKey(k => k + 1)} />
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-medium">Uploaded Exemplars</h2>
          <ExemplarList refreshKey={refreshKey} />
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/settings/ components/settings/
git commit -m "feat: add settings page with exemplar upload and management"
```

---

## Task 15: Seed Foundational Exemplars

Script to ingest the 20 fca-agent exemplar reports into pgvector as the foundational layer.

**Files:**
- Create: `scripts/seed-foundational.ts`

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-foundational.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function main() {
  const exemplarsDir = process.argv[2]
  if (!exemplarsDir) {
    console.error('Usage: npx tsx scripts/seed-foundational.ts /path/to/fca-agent/exemplars')
    process.exit(1)
  }

  const files = readdirSync(exemplarsDir).filter(f => f.endsWith('.md'))
  console.log(`Found ${files.length} exemplar files`)

  for (const file of files) {
    const content = readFileSync(join(exemplarsDir, file), 'utf-8')
    const chunks = chunkByHeadings(content)
    console.log(`  ${file}: ${chunks.length} chunks`)

    const embeddings = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: chunks.map(c => c.content),
    })

    const rows = chunks.map((chunk, i) => ({
      user_id: null,
      content: chunk.content,
      section: chunk.section,
      source_file: file,
      embedding: `[${embeddings.data[i].embedding.join(',')}]`,
    }))

    const { error } = await supabase.from('exemplar_chunks').insert(rows)
    if (error) {
      console.error(`  Error inserting ${file}:`, error.message)
    }
  }

  const { count } = await supabase
    .from('exemplar_chunks')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null)

  console.log(`\nDone. ${count} foundational chunks in database.`)
}

function chunkByHeadings(text: string): { content: string; section: string | null }[] {
  const chunks: { content: string; section: string | null }[] = []
  const lines = text.split('\n')
  let currentSection: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch && currentLines.length > 0) {
      const content = currentLines.join('\n').trim()
      if (content.length > 50) {
        chunks.push({ content, section: currentSection })
      }
      currentLines = []
    }
    if (headingMatch) {
      currentSection = headingMatch[1].trim()
    }
    currentLines.push(line)
  }

  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim()
    if (content.length > 50) {
      chunks.push({ content, section: currentSection })
    }
  }

  return chunks
}

main().catch(console.error)
```

- [ ] **Step 2: Install tsx for running TypeScript scripts**

```bash
pnpm add -D tsx
```

- [ ] **Step 3: Run the seed script**

```bash
git clone --depth 1 git@github.com:ceazzar/fca-agent.git /tmp/fca-agent-seed
npx tsx scripts/seed-foundational.ts /tmp/fca-agent-seed/exemplars
```

Expected: `Done. ~200-400 foundational chunks in database.`

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-foundational.ts
git commit -m "feat: add foundational exemplar seeding script"
```

---

## Task 16: DOCX Export

Replace the placeholder text export with proper DOCX generation.

**Files:**
- Create: `lib/export/docx.ts`
- Modify: `components/report/export-button.tsx`

- [ ] **Step 1: Create DOCX generator**

Create `lib/export/docx.ts`:

```typescript
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle,
} from 'docx'

export async function generateDocx(
  sections: Record<string, { title: string; content: string }>
): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      text: 'Functional Capacity Assessment Report',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ]

  for (const [, section] of Object.entries(sections)) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
      })
    )

    const paragraphs = section.content.split('\n\n')
    for (const para of paragraphs) {
      if (!para.trim()) continue
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para.trim(), size: 22 })],
          spacing: { after: 120 },
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return await Packer.toBlob(doc)
}
```

- [ ] **Step 2: Update export button to use DOCX**

Replace `components/report/export-button.tsx`:

```typescript
'use client'

import { generateDocx } from '@/lib/export/docx'
import { saveAs } from 'file-saver'

export function ExportButton({
  sections,
}: {
  sections: Record<string, { title: string; content: string }>
}) {
  const handleExport = async () => {
    const blob = await generateDocx(sections)
    saveAs(blob, 'FCA-Report.docx')
  }

  return (
    <button
      onClick={handleExport}
      className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground"
    >
      Export DOCX
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/export/docx.ts components/report/export-button.tsx
git commit -m "feat: add DOCX export for generated reports"
```

---

## Task 17: Smoke Test and Deploy

End-to-end verification and Vercel deployment.

- [ ] **Step 1: Set up .env.local**

```bash
cp .env.local.example .env.local
# Fill in actual values from Supabase dashboard and OpenAI
```

- [ ] **Step 2: Run the dev server and test login**

```bash
pnpm dev
```

Open http://localhost:3000. Verify:
- Redirects to /login
- Can create account with email
- After login, redirects to /chat

- [ ] **Step 3: Test exemplar upload**

Navigate to /settings. Upload a .docx FCA report. Verify:
- File uploads without error
- Chunk count appears in the list
- Can delete the uploaded file

- [ ] **Step 4: Test chat and generation**

Navigate to /chat. Create a new session. Paste clinical notes. Verify:
- Chat agent responds conversationally
- Chat agent calls generate_report tool when enough info is provided
- Report sections appear in the side panel
- Can click "Revise" on a section and provide feedback
- Can directly edit section content

- [ ] **Step 5: Test DOCX export**

Click "Export DOCX" in the report panel. Verify:
- A .docx file downloads
- File contains all generated sections with proper formatting

- [ ] **Step 6: Push to GitHub**

```bash
git remote add origin git@github.com:ceazzar/TheraNotes-AI.git
git push -u origin main
```

- [ ] **Step 7: Deploy to Vercel**

```bash
vercel
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

- [ ] **Step 8: Verify production deployment**

Open the Vercel URL. Run through the full flow: login → settings → upload exemplar → chat → generate → revise → export.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and deployment verification"
```

---

## Post-Implementation Checklist

- [ ] Verify RLS policies work (user A cannot see user B's sessions, messages, reports, or exemplar chunks)
- [ ] Verify foundational exemplar chunks are readable by all authenticated users
- [ ] Test with 3+ concurrent users to verify data isolation
- [ ] Monitor Vercel function durations — ensure no timeouts on Pro tier
- [ ] Verify `text-embedding-3-large` embeddings are 3072 dimensions in the database
