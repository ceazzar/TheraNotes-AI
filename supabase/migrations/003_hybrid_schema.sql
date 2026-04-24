-- Migration 003: Hybrid Design Schema
-- Adds assessments table, agent persistence tables, and hybrid FKs

-- 1. Assessments table (structured clinical input form)
CREATE TABLE public.assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title           TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'generating', 'complete')),
  participant_name        TEXT,
  participant_dob         DATE,
  ndis_number             TEXT,
  referral_source         TEXT,
  assessment_dates        TEXT,
  assessment_location     TEXT,
  assessor_name           TEXT,
  assessor_credentials    TEXT,
  primary_diagnosis       JSONB DEFAULT '{}',
  social_background       JSONB DEFAULT '{}',
  support_network         JSONB DEFAULT '{}',
  home_environment        JSONB DEFAULT '{}',
  mental_health           JSONB DEFAULT '{}',
  functional_domains      JSONB DEFAULT '{}',
  standardized_scores     JSONB DEFAULT '{}',
  clinical_notes          TEXT DEFAULT '',
  domain_status           JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Add assessment_id to reports (hybrid FK)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS planner_review JSONB DEFAULT '{}';

-- 3. Add report_id to sessions (for revision chat linking)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS report_id UUID;

-- 4. Clinician profiles (agent Layer 2: per-user patterns)
CREATE TABLE public.clinician_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  common_gaps     TEXT[] DEFAULT '{}',
  language_preferences  JSONB DEFAULT '{}',
  diagnosis_familiarity JSONB DEFAULT '{}',
  documentation_patterns JSONB DEFAULT '{}',
  total_reports_generated INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. NDIS rules (agent Layer 3: domain knowledge)
CREATE TABLE public.ndis_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type       TEXT NOT NULL CHECK (rule_type IN (
    'support_category', 'funding_template', 'rejection_pattern',
    'policy_threshold', 'advocacy_phrase'
  )),
  section         TEXT,
  content         JSONB NOT NULL,
  source          TEXT,
  effective_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. Corrections (agent Layer 4: learning from revisions)
CREATE TABLE public.corrections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_id       UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  section         TEXT NOT NULL,
  original_text   TEXT NOT NULL,
  revised_text    TEXT NOT NULL,
  feedback        TEXT,
  correction_type TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_assessments_user ON public.assessments(user_id);
CREATE INDEX idx_reports_assessment ON public.reports(assessment_id);
CREATE INDEX idx_clinician_profiles_user ON public.clinician_profiles(user_id);
CREATE INDEX idx_corrections_user ON public.corrections(user_id);
CREATE INDEX idx_corrections_section ON public.corrections(section);
CREATE INDEX idx_ndis_rules_type ON public.ndis_rules(rule_type);
CREATE INDEX idx_ndis_rules_section ON public.ndis_rules(section);

-- RLS for new tables
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessments_select ON public.assessments FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY assessments_insert ON public.assessments FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY assessments_update ON public.assessments FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY assessments_delete ON public.assessments FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE public.clinician_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinician_profiles_select ON public.clinician_profiles FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY clinician_profiles_insert ON public.clinician_profiles FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY clinician_profiles_update ON public.clinician_profiles FOR UPDATE USING (user_id = (SELECT auth.uid()));

ALTER TABLE public.ndis_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY ndis_rules_select ON public.ndis_rules FOR SELECT USING (true);

ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY corrections_select ON public.corrections FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY corrections_insert ON public.corrections FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Triggers
CREATE TRIGGER assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER clinician_profiles_updated_at
  BEFORE UPDATE ON public.clinician_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
