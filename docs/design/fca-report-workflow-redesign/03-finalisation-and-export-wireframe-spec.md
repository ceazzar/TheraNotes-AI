# 03 Finalisation And Export Wireframe Spec

Screen area: workspace finalisation, assessments, goals, header details, export
Primary user: Occupational Therapist
Primary job: complete a clinically reviewed draft using standardised evidence
and final metadata

## Design Intent

Finalisation is not a new report creation flow. It happens inside an existing
report workspace.

The OT should see a clear path:

```text
Reviewed first draft
  -> Add WHODAS/Sensory
  -> Review extracted assessment findings
  -> Add participant goals
  -> Generate Part D + final Part E
  -> Complete header details
  -> Export
```

## Assessments Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Assessments                                                                  │
│ Add standardised assessment reports to complete Part D and final Part E.      │
│                                                                              │
│ ┌──────────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Upload assessment PDFs               │ │ Parsed evidence                 │ │
│ │                                      │ │                                 │ │
│ │ [Upload WHODAS / Sensory PDFs]       │ │ WHODAS 2.0                      │ │
│ │                                      │ │ Status: Not uploaded            │ │
│ │ Supported: PDF                       │ │                                 │ │
│ │                                      │ │ Sensory Profile                 │ │
│ │                                      │ │ Status: Not uploaded            │ │
│ └──────────────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                              │
│ Extracted findings                                                            │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Empty until PDFs are uploaded.                                           │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ [Generate Part D + Final Recommendations] disabled until evidence exists      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Assessments Tab After Upload

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Assessments                                                                  │
│                                                                              │
│ Uploads                                                                      │
│ ✓ Luka_WHODAS-self_2026-04-14.pdf                                            │
│ ✓ Luka_Sensory-Profile-2-Summary-Report.pdf                                  │
│                                                                              │
│ Extracted findings                                                            │
│ ┌──────────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ WHODAS 2.0                           │ │ Sensory Profile                 │ │
│ │                                      │ │                                 │ │
│ │ Overall disability: Severe           │ │ Low Registration: More Than     │ │
│ │ Cognition: Severe                    │ │ Most People                     │ │
│ │ Mobility: Moderate                   │ │ Sensation Seeking: Much Less    │ │
│ │ Self-care: Moderate                  │ │ Than Most People                │ │
│ │ Getting along: Severe                │ │ Sensory Sensitivity: Much More  │ │
│ │ Life activities: Extreme             │ │ Than Most People                │ │
│ │ Participation: Moderate              │ │ Sensation Avoiding: Much More   │ │
│ │                                      │ │ Than Most People                │ │
│ └──────────────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                              │
│ Review status                                                                 │
│ [ ] I have reviewed the extracted assessment findings                         │
│                                                                              │
│ [Generate Part D + Final Recommendations]                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Assessment Upload Requirements

| Requirement | Design implication |
|---|---|
| Multiple PDFs can be uploaded | Upload control should support multi-file and show each file. |
| WHODAS and Sensory can both exist | Parsed evidence should display both side by side on desktop. |
| Sensory is optional unless completed | Do not mark missing Sensory as an error if not applicable. |
| PDF parsing can fail | Show file-level error and allow retry/reupload. |
| Scores can be manually corrected | Provide an edit/review mode for extracted scores. |
| Full source context is used by generation | Designer does not need to expose raw text by default, but should allow "view source excerpts" if desired. |

## Goals Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Goals And Recommendations                                                    │
│ Add participant-stated goals before generating final recommendations.         │
│                                                                              │
│ Participant-stated NDIS goals                                                 │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Goal 1                                                                   │ │
│ │ [ Quote goal verbatim where available ]                                  │ │
│ │                                                                          │ │
│ │ Goal 2                                                                   │ │
│ │ [ Optional ]                                                             │ │
│ │                                                                          │ │
│ │ Goal 3                                                                   │ │
│ │ [ Optional ]                                                             │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Recommendation focus                                                          │
│ [Capacity building] [Core supports] [Assistive technology] [Home mods]        │
│                                                                              │
│ [Save goals]                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Header Details Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header Details                                                               │
│ These populate the final report template. They do not affect clinical         │
│ drafting unless referenced in the report body.                                │
│                                                                              │
│ Participant details                                                           │
│ Full name                  [                                      ]           │
│ NDIS number                [                                      ]           │
│ Date of birth              [                                      ]           │
│ Address                    [                                      ]           │
│                                                                              │
│ Plan details                                                                  │
│ Plan start                 [                                      ]           │
│ Plan end                   [                                      ]           │
│                                                                              │
│ Contacts                                                                       │
│ Primary contact name       [                                      ]           │
│ Primary contact phone      [                                      ]           │
│                                                                              │
│ Assessor/provider                                                            │
│ Pulled from Settings: Dr Test Reviewer, Test Clinic Pty Ltd                   │
│ [Edit for this report] [Open Settings]                                        │
│                                                                              │
│ [Save header details]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Header Detail Rules

| Field | Required before first draft | Required before export | Source |
|---|---:|---:|---|
| Participant label | Yes | Yes | Entry/workspace |
| Participant full name | No | Yes | Header details |
| NDIS number | No | Yes | Header details |
| Date of birth | No | Yes | Header details |
| Plan dates | No | Usually yes | Header details |
| Address | No | Usually yes | Header details |
| Primary contact | No | Optional/if applicable | Header details |
| Assessor name | No if profile exists | Yes | Settings/profile |
| Credentials | No if profile exists | Yes | Settings/profile |
| Provider/company | No if profile exists | Yes | Settings/profile |
| Report date | No | Yes | Auto-default, editable |

## Review And Export Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Review And Export                                                            │
│                                                                              │
│ Export readiness                                                              │
│ ┌──────────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Clinical content                     │ │ Admin/template details          │ │
│ │ ✓ A-C generated                      │ │ ✓ Participant name              │ │
│ │ ✓ OT reviewed                        │ │ ○ NDIS number                   │ │
│ │ ✓ Part D generated                   │ │ ○ Plan dates                    │ │
│ │ ✓ Final E generated                  │ │ ✓ Assessor profile              │ │
│ └──────────────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                              │
│ Final checks                                                                  │
│ [ ] I have reviewed the generated content for clinical accuracy               │
│ [ ] Header details are complete                                               │
│ [ ] Recommendations align with participant goals                              │
│                                                                              │
│ [Export DOCX] [Export PDF]                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Export Readiness Logic

| Item | Blocks export? | Reason |
|---|---:|---|
| Clinical draft generated | Yes | No report exists without it. |
| OT review checkbox | Yes | Clinical accountability. |
| Final Part D/E generated or explicitly skipped | Yes | Prevents accidental incomplete final report. |
| Header details complete | Yes for final export | Required for NDIS-ready document. |
| Goals added | Yes for final recommendations | Recommendations should map to goals. |
| WHODAS/Sensory missing | Blocks only if final report requires Part D | Not needed for first draft. |

## Finalisation Button Labels

| Context | Button |
|---|---|
| Draft exists, no assessments | `Add assessments` |
| Assessments uploaded, not reviewed | `Review extracted findings` |
| Findings reviewed, goals missing | `Add participant goals` |
| Findings and goals ready | `Generate Part D + Final Recommendations` |
| Header missing before export | `Complete header details` |
| All checks complete | `Export` |

## Designer Notes

- Finalisation should feel like progressing an existing report, not restarting.
- Keep assessment evidence and header details distinct.
- Use clear checklist statuses rather than blocking modals where possible.
- Let the OT correct extracted scores before generation.

