# 02 Draft Workspace Wireframe Spec

Screen: Saved FCA Draft Workspace
Route concept: `/reports/[id]`
Primary user: Occupational Therapist
Primary job: review, edit, and progress a saved FCA draft through finalisation

## Design Intent

Once the user starts a draft, the system should create a saved workspace. The
workspace is where the OT can safely leave, return, edit, add assessments,
complete header details, and export.

The workspace should make progress visible without forcing final requirements
too early.

## Workspace Information Architecture

```text
Workspace header
Progress/checklist rail
Main report editor
Context/action panel
Tabs or sections:
  - Clinical Draft
  - Header Details
  - Assessments
  - Goals and Recommendations
  - Review and Export
```

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ TheraNotes                                         Reports Settings User     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Luka B. FCA Draft                                  Saved just now            │
│ Status: First OT draft                             [Generate draft]          │
│                                                                              │
│ ┌──────────────────────┐ ┌────────────────────────────────────────────────┐ │
│ │ Report checklist     │ │ Clinical Draft                                 │ │
│ │                      │ │                                                │ │
│ │ ✓ Workspace saved    │ │ Source notes                                   │ │
│ │ ✓ Clinical notes     │ │ ┌────────────────────────────────────────────┐ │ │
│ │ ○ A-C generated      │ │ │ OT clinical notes...                       │ │ │
│ │ ○ OT reviewed        │ │ └────────────────────────────────────────────┘ │ │
│ │ ○ Assessments added  │ │                                                │ │
│ │ ○ Goals added        │ │ Sections to generate now                      │ │
│ │ ○ Header complete    │ │ ✓ Overview                                    │ │
│ │ ○ Ready to export    │ │ ✓ Assessment process                          │ │
│ │                      │ │ ✓ Sections A-C                                │ │
│ │ Quick actions        │ │ ✓ Functional impairment summary               │ │
│ │ [Add assessments]    │ │                                                │ │
│ │ [Header details]     │ │ [Generate first OT draft]                     │ │
│ │ [Add goals]          │ │                                                │ │
│ └──────────────────────┘ └────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Workspace Header

| Element | Purpose |
|---|---|
| Participant/workspace label | Identifies the report. Editable. |
| Status | Shows current stage: `Draft setup`, `First draft`, `Needs assessments`, `Final review`, `Ready to export`. |
| Save state | Reassures edits are safe. |
| Primary action | Contextual button, e.g. `Generate draft`, `Generate Part D + E`, `Export`. |
| Secondary actions | Rename, duplicate, archive, more menu if supported. |

## Checklist Rail

The checklist should communicate progress and missing items.

| Item | First draft stage | Final stage |
|---|---|---|
| Workspace saved | Required | Required |
| Clinical notes added | Required | Required |
| First draft generated | Required | Complete |
| OT reviewed draft | Recommended | Required before export |
| WHODAS/Sensory added | Later | Required if used for Part D |
| Goals added | Later | Required for final recommendations |
| Header details complete | Later | Required before export |
| Final sections generated | Later | Required before export |
| Export ready | Later | Final state |

Status labels:

| Visual state | Meaning |
|---|---|
| Complete | Done and no action needed. |
| Current | This is the recommended next action. |
| Missing | Needed before export/final generation. |
| Optional | Useful but not blocking. |
| Not yet | Later workflow stage. |

## Clinical Draft Tab

This is the first workspace tab after creating a draft.

### Inputs

| Field/control | Required | Notes |
|---|---:|---|
| Source clinical notes | Yes | Editable. This is the clinical prompt input. |
| Assessment context | Optional | Chips or small field. |
| Generate first OT draft | Enabled when notes exist | Creates first draft sections. |

### Generated Outputs

| Section | Generated in first draft? |
|---|---:|
| Header | Only if metadata exists, otherwise placeholder/header panel later. |
| Overview | Yes |
| Assessment process | Yes |
| Section A | Yes |
| Section B | Yes |
| Section C | Yes |
| Part D | No, unless standardised evidence is already present. |
| Part E functional impairment summary | Yes |
| Final recommendations | No |

### Copy

Suggested section heading:

```text
Clinical Draft
Generate the OT narrative first. Header details, assessments, goals, and export checks can be completed later.
```

Button copy:

```text
Generate first OT draft
```

Post-generation message:

```text
First draft generated. Review and edit the clinical narrative before finalising with standardised assessments.
```

## Editable Report View

After generation, the main workspace should shift from input-first to editor-first.

```text
┌──────────────────────┐ ┌────────────────────────────────────────────────┐
│ Report checklist     │ │ Report editor                                  │
│ ✓ A-C drafted        │ │                                                │
│ ○ OT reviewed        │ │ [Header placeholder]                           │
│ ○ Assessments added  │ │                                                │
│ ○ Goals added        │ │ Overview                                       │
│ ○ Header complete    │ │ Generated text...                              │
│                      │ │                                                │
│ [Mark reviewed]      │ │ Section A                                      │
│ [Add assessments]    │ │ Generated text...                              │
│ [Add goals]          │ │                                                │
└──────────────────────┘ └────────────────────────────────────────────────┘
```

Editor requirements:

| Requirement | Reason |
|---|---|
| Direct inline editing | OT owns clinical accuracy. |
| Section-level regenerate/refine | Lets OT update specific parts without rerunning everything. |
| Visible missing-data placeholders | Avoid hiding incomplete final requirements. |
| Save status | Prevents refresh/loss anxiety. |
| Section status | Shows which sections are draft, pending, or finalised. |

## Header Details As Metadata, Not Prompt

Header/admin details should have their own tab/panel.

They should not visually compete with clinical notes on the first draft screen.

If header details are missing, show:

```text
Header details incomplete
These details populate the final report template and can be added before export.
```

## Draft Save Requirements

Workspace must be saved server-side.

| Event | Expected behavior |
|---|---|
| Create draft workspace | Report record exists immediately. |
| Refresh page | All fields and generated sections remain. |
| Navigate away | Returning shows latest saved state. |
| Browser crashes | Server-saved workspace remains. |
| Local autosave exists before workspace creation | Restored on `/generate`. |

## Empty And Loading States

| State | UI |
|---|---|
| Creating workspace | Button disabled, copy: `Creating workspace...` |
| Generating first draft | Progress screen or inline progress with section list. |
| No generated sections yet | Show source notes editor and clear generate action. |
| Generation fails | Error with retry; keep notes and workspace. |
| Draft restored | Banner/status: `Draft restored from autosave`. |

## Designer Notes

- The workspace is the main product surface. It should feel like a live report
  editor with a clinical checklist, not a form wizard.
- Use tabs only if they do not hide critical next actions. A persistent
  checklist rail helps users understand where they are.
- Header/admin details should be easy to find but visually secondary until
  export.

