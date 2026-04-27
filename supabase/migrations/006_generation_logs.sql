-- Generation audit log: captures full context for each LLM call
-- Enables debugging, prompt iteration, and cost tracking
CREATE TABLE public.generation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_id       UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  assessment_id   UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  section_id      TEXT NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('generate', 'revise', 'coherence', 'refine')),

  -- Input context
  system_prompt   TEXT NOT NULL,
  user_prompt     TEXT NOT NULL,
  clinical_notes  TEXT,
  rag_chunks      JSONB DEFAULT '[]',

  -- Model configuration
  model           TEXT NOT NULL,
  temperature     REAL,

  -- Output
  raw_output      TEXT,
  processed_output TEXT,
  insufficient_data BOOLEAN DEFAULT false,

  -- Metrics
  prompt_tokens   INT,
  completion_tokens INT,
  total_tokens    INT,
  latency_ms      INT,

  -- Status
  status          TEXT DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generation_logs_user ON public.generation_logs(user_id);
CREATE INDEX idx_generation_logs_report ON public.generation_logs(report_id);
CREATE INDEX idx_generation_logs_created ON public.generation_logs(created_at DESC);
CREATE INDEX idx_generation_logs_operation ON public.generation_logs(operation);

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY generation_logs_select ON public.generation_logs FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY generation_logs_insert ON public.generation_logs FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
