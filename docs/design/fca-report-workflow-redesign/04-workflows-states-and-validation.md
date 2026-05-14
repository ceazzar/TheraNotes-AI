# 04 Workflows, States, And Validation

This document defines the user flows and product states the redesigned UI must
support. Designers should use it to pressure-test wireframes.

## User Roles

| Role | Goal |
|---|---|
| Occupational Therapist | Draft, review, finalise, and export FCA reports. |
| Admin/clinic owner | Configure profile, templates, and reusable provider details. |

The primary wireframes should optimise for the OT.

## Workflow A: Start First OT Draft

```text
1. OT opens Generate.
2. OT chooses Start new FCA draft.
3. OT enters participant label.
4. OT pastes or dictates clinical notes.
5. OT optionally selects assessment context chips.
6. OT clicks Create draft workspace.
7. App saves a workspace immediately.
8. App lands OT in Clinical Draft tab.
9. OT clicks Generate first OT draft.
10. App generates Overview, Assessment Process, Sections A-C, and functional impairment summary.
11. OT reviews and edits.
12. App prompts next action: Add assessments when ready.
```

### Required Before Workspace Creation

| Field | Required | Why |
|---|---:|---|
| Participant label | Yes | Needed to find the draft later. |
| Clinical notes | Yes | Needed for generation. |
| Assessment context | No | Improves process wording but can be added later. |

### Not Required Before Workspace Creation

| Field | Why not required |
|---|---|
| NDIS number | Header/template detail. |
| Date of birth | Header/template detail. |
| Plan dates | Header/template detail. |
| Address | Header/template detail unless clinically relevant in notes. |
| WHODAS/Sensory | Later finalisation evidence. |
| Goals | Later recommendations input. |

## Workflow B: Finalise Existing Draft

```text
1. OT opens Generate or Reports.
2. OT chooses Finalise existing report.
3. OT opens the relevant saved workspace.
4. OT opens Assessments tab.
5. OT uploads WHODAS and/or Sensory PDFs.
6. App parses and displays extracted findings.
7. OT reviews/corrects findings.
8. OT opens Goals tab and adds participant-stated goals.
9. OT clicks Generate Part D + Final Recommendations.
10. App updates Part D and final Part E.
11. OT reviews/edits final report.
12. OT completes Header Details.
13. OT completes Review and Export checklist.
14. OT exports.
```

## Workflow C: Generate Complete FCA From Scratch

```text
1. OT opens Generate.
2. OT chooses Generate complete FCA now.
3. OT enters participant label.
4. OT enters clinical notes.
5. OT uploads WHODAS/Sensory PDFs.
6. OT adds participant goals.
7. App creates workspace.
8. App generates full report.
9. OT reviews/edits.
10. OT completes header/admin details.
11. OT exports.
```

This flow is advanced and should not visually dominate the entry page.

## Report Status Model

| Status | Meaning | Primary next action |
|---|---|---|
| Autosaved intake | Local pre-workspace draft exists. | Create draft workspace. |
| Draft setup | Workspace exists, clinical draft not generated. | Generate first OT draft. |
| First draft | A-C and impairment summary exist. | Review/edit. |
| Needs assessments | Draft reviewed, Part D/final E pending. | Add assessments. |
| Assessment review | PDFs parsed, extracted data needs review. | Review findings. |
| Needs goals | Assessment findings ready, goals missing. | Add goals. |
| Ready for final generation | Evidence and goals ready. | Generate Part D + final E. |
| Final review | Final content generated. | Complete header/export checks. |
| Ready to export | Required checks complete. | Export. |
| Exported | Report exported. | View/download/export again. |

## Screen State Matrix

| State | Entry page | Workspace |
|---|---|---|
| No drafts | Show primary start panel, empty recent work. | Not applicable. |
| Local autosave exists | Show restore banner and prefilled start panel. | Not applicable until workspace is created. |
| Saved workspace exists | Recent work card appears. | Open workspace. |
| First draft generated | Recent work status: First draft. | Editor-first view. |
| Needs assessments | Recent work status: Needs assessments. | Assessment tab promoted. |
| Ready to export | Recent work status: Ready to export. | Export tab promoted. |

## Validation Rules

### Entry Page

| Trigger | Message | Blocking |
|---|---|---:|
| Missing participant label | `Add a label so this draft is easy to find later.` | Yes |
| Missing clinical notes | `Add OT notes before creating the draft workspace.` | Yes |
| Notes under threshold | `Short notes may produce a generic draft. You can continue and edit later.` | No |
| User chooses complete report but no assessments | `Complete reports need standardised evidence now. Start a first draft if assessments will come later.` | Yes for complete path |

### Workspace First Draft

| Trigger | Message | Blocking |
|---|---|---:|
| Generate with short notes | `This may generate a limited draft. You can continue and edit.` | No |
| Generation fails | `Draft generation failed. Your notes are saved. Try again.` | Yes until retry succeeds |
| Header missing | `Header details can be completed before export.` | No |
| Assessments missing | `Part D and final recommendations can be generated after WHODAS/Sensory upload.` | No |

### Finalisation

| Trigger | Message | Blocking |
|---|---|---:|
| No WHODAS/Sensory evidence | `Add standardised assessment evidence before generating Part D.` | Yes |
| Extracted findings not reviewed | `Review extracted findings before final generation.` | Yes |
| Goals missing | `Add participant-stated goals before final recommendations.` | Yes |
| Header details missing before export | `Complete header details before export.` | Yes |
| OT review checkbox unchecked | `Confirm clinical review before export.` | Yes |

## Data Requirements By Stage

| Data | First draft | Final Part D/E | Export |
|---|---:|---:|---:|
| Participant label | Required | Required | Required |
| Clinical notes | Required | Required | Required |
| Assessment context | Recommended | Recommended | Recommended |
| WHODAS PDF/scores | Not required | Required if used | Required if Part D references it |
| Sensory Profile PDF/scores | Not required | Required if completed | Required if referenced |
| NDIS goals | Optional | Required | Required |
| NDIS number | Not required | Not required | Required |
| DOB | Not required | Not required | Required |
| Plan dates | Not required | Not required | Usually required |
| Address | Not required | Not required | Usually required |
| Assessor credentials | Profile/default | Profile/default | Required |
| Provider/company | Profile/default | Profile/default | Required |

## Edge Cases

| Edge case | Expected UX |
|---|---|
| User refreshes before creating workspace | Local autosave restores label and notes. |
| User refreshes after creating workspace | Server workspace restores all data. |
| User starts duplicate draft for same participant label | Suggest recent matching draft before creating a duplicate. |
| User has WHODAS but no Sensory | Allow finalisation with WHODAS only; mark Sensory as not provided. |
| User has Sensory but no WHODAS | Allow if clinically valid, but warn Part D may be limited. |
| PDF parsing fails | Keep uploaded file in error state; allow reupload and manual entry. |
| Extracted score looks wrong | Allow manual correction before generation. |
| OT wants to add header details early | Allow it in Header Details tab, but do not require it on entry. |
| Profile missing credentials | Show setup status and require completion before export, not before first draft. |
| User wants complete report from scratch | Provide advanced path; require assessments and goals before final generation. |

## Designer Acceptance Criteria

A wireframe set is acceptable if it satisfies all of these:

1. A first-time OT can start a draft without seeing NDIS number, DOB, plan
   dates, address, or primary contact fields.
2. The user can tell where to go when they already have a draft and need to add
   WHODAS/Sensory.
3. The user can see that input is saved.
4. The user can distinguish first draft generation from complete report
   generation.
5. The workspace clearly shows what is complete, what is missing, and what is
   needed only before export.
6. Header/admin details are accessible but not part of the clinical drafting
   prompt.
7. Standardised assessment evidence is reviewed before it is used for final
   recommendations.
8. Export requires clinical review and final metadata completion.

