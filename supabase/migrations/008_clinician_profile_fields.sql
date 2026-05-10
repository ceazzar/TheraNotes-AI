-- 008_clinician_profile_fields.sql
-- Adds the per-clinician identity + clinic fields the Header section needs
-- so a clinician doesn't have to re-type their name, AHPRA #, clinic name,
-- and address on every report.
--
-- The Day-1 reviews flagged that Settings is exemplar-uploads-only and the
-- Header section's structured intake gates Header generation entirely on
-- per-report client + assessor data. Storing assessor + clinic identity in
-- the profile lets us pre-fill those fields in /generate and let the
-- deterministic Header builder fall back to profile values when intake
-- omits them.
--
-- All new columns are nullable / default-empty so the existing rows
-- (`total_reports_generated`, `common_gaps`, etc.) keep working unchanged.

ALTER TABLE public.clinician_profiles
  ADD COLUMN IF NOT EXISTS display_name        TEXT,
  ADD COLUMN IF NOT EXISTS credentials         TEXT,
  ADD COLUMN IF NOT EXISTS ahpra_registration  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email       TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone       TEXT,
  ADD COLUMN IF NOT EXISTS clinic_name         TEXT,
  ADD COLUMN IF NOT EXISTS clinic_abn          TEXT,
  ADD COLUMN IF NOT EXISTS ndis_provider_number TEXT,
  ADD COLUMN IF NOT EXISTS clinic_address      TEXT;

COMMENT ON COLUMN public.clinician_profiles.display_name IS
  'Clinician name as it appears in report headers (e.g. "Mary Jane Watson"). Pre-fills /generate Assessor field.';

COMMENT ON COLUMN public.clinician_profiles.credentials IS
  'Post-nominals / role (e.g. "Occupational Therapist"). Pre-fills /generate Credentials field.';

COMMENT ON COLUMN public.clinician_profiles.ahpra_registration IS
  'AHPRA registration number. Optional but surfaces on the report for clinical accountability.';

COMMENT ON COLUMN public.clinician_profiles.clinic_name IS
  'Provider/Company name shown in the report header (e.g. "Horizon Health Australia").';
