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
