# Sample FCAs - Anonymized

## Data Notice

**All data in this directory is entirely fictitious.**

These 20 Functional Capacity Assessment (FCA) reports were anonymized by replacing all
personally identifiable information (PII) with fake but realistic data. Specifically:

- **Names** are fabricated (no real individuals)
- **NDIS numbers** are randomly generated (not linked to any real participant)
- **Addresses** are fictitious (real suburb names may appear for realism, but street
  addresses and unit numbers are invented)
- **Phone numbers and emails** are fake
- **Dates of birth** are randomized
- **Clinician details** are fabricated

The clinical content (diagnoses, functional descriptions, assessment findings) has been
preserved to maintain usefulness as exemplar training data, but all identifying details
have been replaced.

These files are used by the TheraNotes exemplar system (Plan 063) to distill writing
style guides and provide section-level reference examples during AI-assisted report
generation.

## Usage

- Uploaded to `exemplar_reports` table via the Admin UI
- Parsed into sections by the `parse-exemplar` Edge Function
- Used for anchor report selection and style guide distillation
- See `docs/plans/plan-063-exemplar-system-v2.md` for full architecture
