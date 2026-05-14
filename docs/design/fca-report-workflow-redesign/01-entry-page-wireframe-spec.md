# 01 Entry Page Wireframe Spec

Screen: Create Functional Capacity Assessment
Route concept: `/generate`
Primary user: Occupational Therapist
Primary job: start or resume the correct report workflow

## Design Intent

The entry page should be calm and sparse. It should not look like an intake
form. Its job is to help the clinician pick the correct workflow and, if
starting a new draft, provide only the minimum clinical inputs required to
create a saved workspace.

## Page Hierarchy

```text
Top navigation
Page heading and explanation
Primary create panel
Recent work panel
Finalise existing report panel
Advanced complete-report affordance
Profile/template setup status
```

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ TheraNotes                                         Generate Reports Settings │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Create a Functional Capacity Assessment                                      │
│ Start with the clinical draft. Add header details, assessments, goals, and   │
│ export checks later in the report workspace.                                 │
│                                                                              │
│ ┌───────────────────────────────────────────────┐ ┌────────────────────────┐ │
│ │ Start new FCA draft                           │ │ Continue recent work   │ │
│ │                                               │ │                        │ │
│ │ Participant label                             │ │ Luka B.                │ │
│ │ [ Luka B / Participant A / initials ]         │ │ First draft saved 2h   │ │
│ │                                               │ │ [Open]                 │ │
│ │ Clinical notes                                │ │                        │ │
│ │ ┌───────────────────────────────────────────┐ │ │ Morgan H.             │ │
│ │ │ Paste or dictate OT notes. Include ADLs,  │ │ │ Needs assessments     │ │
│ │ │ IADLs, supports, risks, functional impact │ │ │ [Open]                 │ │
│ │ │ and observations.                         │ │ │                        │ │
│ │ └───────────────────────────────────────────┘ │ │ [View all reports]    │ │
│ │                                               │ └────────────────────────┘ │
│ │ Assessment context                            │                            │
│ │ [In-person] [Telehealth] [Collateral] [File]  │ ┌────────────────────────┐ │
│ │                                               │ │ Finalise existing     │ │
│ │ Save status: autosaved on this device         │ │ report                 │ │
│ │                                               │ │ Open a draft to add   │ │
│ │ [Create draft workspace]                      │ │ WHODAS/Sensory and    │ │
│ └───────────────────────────────────────────────┘ │ generate Part D + E.   │ │
│                                                   │ [Open reports]         │ │
│                                                   └────────────────────────┘ │
│                                                                              │
│ Advanced                                                                     │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Generate complete FCA now                                                │ │
│ │ Use only when OT notes, WHODAS/Sensory evidence, and goals are already    │ │
│ │ available and no draft exists yet. [Start complete report]                │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Wireframe

```text
┌────────────────────────────┐
│ TheraNotes        Menu     │
├────────────────────────────┤
│ Create an FCA              │
│ Start with the clinical    │
│ draft. Add details later.  │
│                            │
│ ┌────────────────────────┐ │
│ │ Start new FCA draft    │ │
│ │ Participant label      │ │
│ │ [                    ] │ │
│ │ Clinical notes         │ │
│ │ ┌────────────────────┐ │ │
│ │ │ Paste OT notes...  │ │ │
│ │ └────────────────────┘ │ │
│ │ Context chips          │ │
│ │ [Create workspace]     │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Continue recent work   │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Finalise existing      │ │
│ └────────────────────────┘ │
│                            │
│ Advanced: Complete FCA     │
└────────────────────────────┘
```

## Entry Page Sections

### 1. Top Navigation

| Element | Behavior |
|---|---|
| Logo/name | Links to default authenticated landing page. |
| Generate | Current page. |
| Reports | Opens report list/workspaces. |
| Settings | Opens profile/template settings. |
| User menu | Account/logout. |

### 2. Page Heading

Suggested copy:

```text
Create a Functional Capacity Assessment
Start with the clinical draft. Add header details, assessments, goals, and export checks later in the report workspace.
```

Requirements:

- The heading should signal that this is a staged workflow.
- Supporting text should explicitly say admin/header details come later.
- Do not mention "Part D skip" or internal generation logic.

### 3. Start New FCA Draft Panel

This is the primary panel and should visually dominate the page.

| Field/control | Required | Type | Purpose |
|---|---:|---|---|
| Participant label | Yes | Single-line text | Names the workspace. Can be full name, initials, or internal label. |
| Clinical notes | Yes | Large textarea | Core clinical source for first draft. |
| Assessment context chips | Optional | Multi-select chips | Helps describe assessment process. |
| Create draft workspace | Enabled when label + notes exist | Primary button | Creates saved workspace before generation. |
| Save status | Automatic | Text/status | Reassures user input is preserved. |

Recommended placeholders:

| Field | Placeholder |
|---|---|
| Participant label | `e.g. Luka B, Participant A, or internal reference` |
| Clinical notes | `Paste or dictate OT notes. Include ADLs, IADLs, mobility, cognition, sensory presentation, mental health, current supports, risks, and functional impact examples.` |

Assessment context chips:

| Chip | Meaning |
|---|---|
| In-person | OT observed participant in person. |
| Telehealth | Assessment occurred by video/phone. |
| Home visit | Environment observed directly. |
| Clinic | Assessment completed in clinic. |
| Collateral | Support coordinator, family, carer, or provider contributed information. |
| File review | Prior documents or reports reviewed. |
| Standardised assessments pending | Makes it explicit that WHODAS/Sensory will come later. |

### 4. Continue Recent Work Panel

This panel prevents duplicate reports and reinforces persistence.

| Item content | Requirement |
|---|---|
| Participant label | Required. |
| Status | Example: `First draft`, `Needs assessments`, `Ready for export`. |
| Last saved time | Example: `Saved 2 hours ago`. |
| Primary action | `Open`. |
| Overflow action | Optional: rename/archive/delete if already supported. |

Empty state:

```text
No active drafts yet.
Start a new FCA draft to create a saved workspace.
```

### 5. Finalise Existing Report Panel

Purpose: route the OT to the existing workspace, not to a new generation form.

Suggested copy:

```text
Finalise existing report
Open a draft to upload WHODAS/Sensory, add goals, and generate Part D plus final recommendations.
```

Primary action:

```text
Open reports
```

### 6. Advanced Complete FCA Panel

This should be visually secondary. It is not the normal workflow.

Suggested copy:

```text
Generate complete FCA now
Use only when OT notes, WHODAS/Sensory evidence, and participant goals are already available and no draft exists yet.
```

Button:

```text
Start complete report
```

When selected, route to a complete-report workspace setup that includes:

- participant label
- clinical notes
- assessment context
- WHODAS/Sensory upload
- goals

Do not combine this with the default first-draft form unless the design clearly
labels it as the advanced path.

### 7. Profile/Template Setup Status

This should be a small status block, not a form.

Examples:

| Status | Copy | Action |
|---|---|---|
| Profile complete | `Clinician profile ready` | `Edit settings` |
| Missing credentials | `Clinician credentials missing` | `Complete profile` |
| Template selected | `Default FCA template selected` | `Change template` |
| Header defaults missing | `Header details can be added later` | No blocker |

## Validation

| Condition | User-facing response |
|---|---|
| Missing participant label | Inline message: `Add a label so this draft is easy to find later.` |
| Missing clinical notes | Inline message: `Add OT notes before creating the draft workspace.` |
| Notes very short | Non-blocking warning: `Short notes may produce a generic draft. You can continue and edit later.` |
| User clicks complete-report path without assessments | Explain: `Complete reports need standardised evidence now. Start a first draft instead if assessments will come later.` |

## Save Behavior

The entry page should autosave local in-progress text, but the stronger design is:

1. User enters label + notes.
2. User clicks `Create draft workspace`.
3. App creates a saved report record immediately.
4. The user lands in the workspace before or during generation.

Autosave status text:

| State | Copy |
|---|---|
| Before any input | `Autosaves on this device for 24 hours` |
| Saving | `Saving...` |
| Saved | `Saved just now` |
| Restored after refresh | `Draft restored` |
| Save unavailable | `Autosave unavailable. Create a workspace before leaving.` |

## Designer Notes

- Avoid a dashboard-heavy feel. This is a clinical work surface.
- Make the primary action visually obvious without using a marketing hero.
- Cards can be used here because these are discrete workflow choices.
- Do not use decorative illustrations or large empty hero space.
- Keep language clinical and direct.

