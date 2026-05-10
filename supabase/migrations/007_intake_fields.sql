-- 007_intake_fields.sql
-- Adds structured intake fields to assessments so the generator can:
--   1) populate the Header section directly from data (no LLM inference)
--   2) skip Parts D/E gracefully when scores or goals are not yet entered
--   3) consume WHODAS / Sensory Profile / goals as structured inputs
--
-- Design decision: rather than sprawl 10+ admin columns, use a single intake_metadata JSONB
-- for everything that doesn't already have a typed column. Goals get their own TEXT[] for
-- easy quoting in Part E.

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS intake_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS ndis_goals TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.assessments.intake_metadata IS
  'Admin/identity fields not covered by typed columns. Expected shape: {
    client: { address, plan_start, plan_end, nok_name, nok_phone },
    assessor: { email, company },
    assessment: { report_date, mode, collateral_informants }
  }';

COMMENT ON COLUMN public.assessments.ndis_goals IS
  'Verbatim participant-stated NDIS goals. Quoted directly in Part E.';
