# FCA Report Workflow Redesign Brief

Status: designer handoff draft
Date: 2026-05-11
Product area: report creation, first draft generation, report workspace, finalisation, export

## Purpose

This folder documents the intended workflow and screen requirements for
redesigning the report creation experience. It should be treated as the source
brief for full wireframe UI design.

The central product decision is:

> Do not make the Generate screen behave like an admin intake form. It should
> collect only what affects clinical drafting. Header details should be report
> metadata/template work, not part of the clinical generation path.

## Core Workflow

The product should feel like creating a saved clinical workspace, not filling
one large generation form.

```text
Entry page
  -> Start new FCA draft
  -> Create saved draft workspace
  -> Generate A-C + functional impairment summary
  -> OT reviews and edits
  -> Add WHODAS/Sensory when available
  -> Generate Part D + final Part E
  -> Add goals and header/admin details
  -> Final review
  -> Export
```

There are three entry intents:

| User intent | Correct path | Design priority |
|---|---|---|
| OT has clinical notes and wants to start | Start new FCA draft | Primary |
| OT already has a draft and now has WHODAS/Sensory | Open existing report | Secondary |
| OT has notes, assessments, and goals before starting | Generate complete FCA | Advanced |

## Key Principle

Only clinical generation inputs belong on the first creation screen.

| Input type | Best location | Reason |
|---|---|---|
| Participant label | Entry page | Needed to identify the draft workspace. |
| Clinical notes | Entry page/workspace | Needed for Sections A-C and functional impairment summary. |
| Assessment context | Entry page/workspace | Helps describe the assessment process. |
| WHODAS/Sensory PDFs | Workspace finalisation | Needed for Part D and final Part E, not first draft. |
| Participant goals | Workspace finalisation | Needed for recommendations. |
| NDIS number | Header details panel | Required for final document, not for clinical drafting. |
| DOB | Header details panel | Required for final document, not for clinical drafting. |
| Plan dates | Header details panel | Required for final document/template, not for clinical drafting. |
| Address/contact details | Header details panel | Metadata/template content. |
| Clinician credentials | Settings/profile, editable per report | Reusable across reports. |

## Design Goals

1. Make the first action obvious: start a clinical draft.
2. Make saving obvious: the user should know a workspace exists and the draft is safe.
3. Keep admin/header fields out of the first clinical generation step.
4. Separate "finalise existing draft" from "generate complete report from scratch".
5. Make missing final requirements visible as a checklist, not as blockers on first draft.
6. Give the OT clear ownership: generated text is a draft to review and edit.
7. Preserve the staged OT workflow:
   - first: clinical draft
   - later: standardised assessments
   - later: header/admin details and export readiness

## Documents In This Folder

| Document | Use |
|---|---|
| `01-entry-page-wireframe-spec.md` | Designer spec for the initial create/report entry screen. |
| `02-draft-workspace-wireframe-spec.md` | Designer spec for the saved workspace after a draft exists. |
| `03-finalisation-and-export-wireframe-spec.md` | Designer spec for assessment upload, final sections, header details, and export readiness. |
| `04-workflows-states-and-validation.md` | Product workflow, state machine, required fields, validation, and edge cases. |

## Non-Goals

The redesign should not:

- Put every possible report field on the entry page.
- Require NDIS number, DOB, plan dates, address, or contact details before first draft generation.
- Make WHODAS/Sensory look required for first draft generation.
- Hide draft saving behind invisible localStorage behavior.
- Make "finalise existing report" look like it starts a new report.
- Ask the OT to understand implementation details such as Part D skip logic.

## Vocabulary

Use these terms consistently:

| Term | Meaning |
|---|---|
| First OT draft | Initial generated report containing Sections A-C and the functional impairment summary. |
| Complete FCA | A report generated from scratch when clinical notes, standardised assessments, and goals are already available. |
| Finalise existing report | Opening an already-created workspace to add WHODAS/Sensory, goals, and final recommendations. |
| Header details | NDIS number, DOB, plan dates, address, contacts, provider details, report date. |
| Standardised assessments | WHODAS 2.0 and Adolescent/Adult Sensory Profile reports. |
| Functional impairment summary | The first-draft subsection of Part E. |
| Final Part E | NDIS goals, summary of functional impairments, and recommendations. |

