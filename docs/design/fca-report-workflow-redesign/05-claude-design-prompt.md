# 05 Claude Design Prompt

Use this file as the main prompt for `claude.ai/design`.

## What To Attach To Claude Design

Attach these documents as project context:

1. `README.md`
2. `01-entry-page-wireframe-spec.md`
3. `02-draft-workspace-wireframe-spec.md`
4. `03-finalisation-and-export-wireframe-spec.md`
5. `04-workflows-states-and-validation.md`

Optional code context if Claude Design allows repo/folder import:

| Attach | Why |
|---|---|
| `app/globals.css` | Existing tokens, colors, spacing, and app style. |
| `components/ui/` | Current buttons, inputs, textarea, select, file upload primitives. |
| `components/layout/topbar.tsx` | Navigation/header pattern. |
| `components/report/` | Existing report display components. |
| `components/workspace/` | Existing workspace behavior context. |

Do not attach `node_modules`, `.next`, `.git`, or the whole repository unless
needed. Claude Design performs better with focused context.

## Main Prompt To Paste

```text
Create a high-fidelity responsive product design prototype for TheraNotes, an allied-health web app used by Occupational Therapists to create NDIS Functional Capacity Assessment reports.

Audience:
- Primary user is an Occupational Therapist.
- They are time-poor, clinically focused, and need confidence that drafts are saved.
- They should not feel like they are filling a large admin intake form before they can start clinical work.

Core product principle:
Do not make the Generate screen behave like an admin intake form. It should collect only what affects clinical drafting. Header details should be metadata/template work, not part of the clinical generation path.

Clinical workflow:
1. OT starts a new FCA draft with only participant label + clinical notes.
2. App creates a saved report workspace immediately.
3. OT generates the first clinical draft: Overview, Assessment Process, Sections A-C, and only the functional impairment summary from Part E.
4. OT reviews and edits the draft.
5. Later, OT adds WHODAS/Sensory PDFs in the existing report workspace.
6. OT reviews extracted standardised assessment findings.
7. OT adds participant-stated NDIS goals.
8. App generates Part D and final Part E recommendations.
9. OT completes header/admin details before export.
10. OT performs final review and exports.

Design task:
Design the full end-to-end UI for this workflow, not just one screen. Produce a polished clickable prototype or screen set with responsive desktop and mobile layouts.

Screens to design:
1. Entry page: Create Functional Capacity Assessment.
2. Start new FCA draft form state.
3. Continue recent work state.
4. Saved draft workspace before generation.
5. Workspace after first draft generation.
6. Assessments tab before upload.
7. Assessments tab after WHODAS + Sensory upload and extraction.
8. Goals and recommendations tab.
9. Header details tab.
10. Review and export tab.
11. Empty/loading/error states where relevant.

Entry page requirements:
- Primary panel: Start new FCA draft.
- Required fields only:
  - Participant label.
  - Clinical notes.
- Optional assessment context chips:
  - In-person.
  - Telehealth.
  - Home visit.
  - Clinic.
  - Collateral.
  - File review.
  - Standardised assessments pending.
- Secondary panel: Continue recent work.
- Secondary panel: Finalise existing report, which should route to Reports/workspace. It must not look like starting a new report.
- Advanced panel: Generate complete FCA now, only for cases where notes + WHODAS/Sensory + goals already exist.
- Show visible save/autosave status.
- Do not show NDIS number, DOB, plan dates, address, or primary contact fields on the entry page.

Workspace requirements:
- Workspace header with participant label, status, save state, and contextual primary action.
- Persistent report checklist showing progress and next action.
- Main report editor area.
- Tabs or clearly separated areas:
  - Clinical Draft.
  - Header Details.
  - Assessments.
  - Goals and Recommendations.
  - Review and Export.
- Header/admin fields live in Header Details, not on the entry page.
- Standardised assessment upload lives in Assessments, not on the first draft entry screen.
- Export readiness is checklist-driven.

Clinical Draft tab:
- Shows original clinical notes.
- Shows first-draft generation scope:
  - Overview.
  - Assessment process.
  - Sections A-C.
  - Functional impairment summary only.
- Makes Part D and full recommendations visibly pending until assessments/goals are added.

Assessments tab:
- Upload WHODAS/Sensory PDFs.
- Show uploaded files.
- Show parsed WHODAS findings:
  - Overall disability.
  - Cognition.
  - Mobility.
  - Self-care.
  - Getting along.
  - Life activities.
  - Participation.
- Show parsed Sensory Profile quadrants:
  - Low Registration.
  - Sensation Seeking.
  - Sensory Sensitivity.
  - Sensation Avoiding.
- Include review/correction state before these findings are used for final generation.

Header Details tab:
- Include:
  - Participant full name.
  - NDIS number.
  - DOB.
  - Plan start.
  - Plan end.
  - Address.
  - Primary contact.
  - Assessor/provider details pulled from profile, editable per report.
- Clearly state these populate the final report template and do not affect clinical drafting unless referenced in the report body.

Review and Export tab:
- Show export readiness checklist:
  - First draft generated.
  - OT reviewed clinical content.
  - Assessments reviewed or intentionally not used.
  - Goals added.
  - Header details complete.
  - Final Part D/E generated.
- Export buttons should be disabled until required final checks are complete.

Visual direction:
- Quiet, professional, clinical SaaS.
- Work-focused and dense enough for repeated clinician use.
- Avoid marketing hero style.
- Avoid decorative orbs, gradients, oversized cards, and vague AI visuals.
- Use restrained color, clear hierarchy, readable spacing.
- Cards are acceptable for discrete workflow choices and panels, but do not nest cards inside cards.
- The UI should feel like a clinical report workspace, not a chatbot or landing page.

Interaction requirements:
- Clearly indicate autosave: Saving, Saved just now, Draft restored.
- User can leave and return to recent drafts.
- User can start first draft without admin/header details.
- User can finalise an existing draft without accidentally creating a duplicate report.
- User can generate a complete report from scratch only via the advanced path.
- User can review extracted assessment findings before final generation.
- User can see missing export requirements without being blocked during first draft.

Output requirements:
- Produce a complete responsive wireframe/prototype.
- Include desktop and mobile versions.
- Include realistic clinical sample content, but keep names anonymised.
- Include at least one recent-work card in the entry page.
- Include empty states and error states for PDF upload/parsing.
- Name major components and screens clearly for engineering handoff.
- At the end, provide a concise design rationale and implementation handoff notes.

Important:
The current /generate UI is not the desired design direction. Use the workflow specs as the source of truth. If you connect to the codebase, use existing components/tokens for feasibility, but redesign the information architecture from scratch.
```

## Follow-Up Prompts For Iteration

Use these after Claude generates the first pass.

### Ask For Alternatives

```text
Show me two alternative layouts for the entry page:
1. A split workbench layout with the Start New Draft form dominant.
2. A three-choice workflow selection layout before showing any form fields.

Keep the clinical workflow and field requirements unchanged.
```

### Ask For State Coverage

```text
Now generate state variants for the chosen design:
- no drafts yet
- autosaved intake restored
- recent work exists
- first draft generated
- assessments missing
- assessments uploaded but not reviewed
- ready for export
- PDF parse error
```

### Ask For Mobile

```text
Create mobile wireframes for the same workflow. Prioritise one clear next action per screen and avoid hiding critical status behind menus.
```

### Ask For Engineering Handoff

```text
Prepare an engineering handoff from this design. Include component names, props/data needed per component, responsive behavior, and validation states.
```

### Ask For Design Review

```text
Review this prototype for workflow breakage. Identify any place where an OT could:
- start a duplicate report by mistake
- think WHODAS/Sensory is required for first draft
- lose unsaved clinical notes
- miss required export details
- confuse complete-report generation with finalising an existing report
Then propose fixes.
```

