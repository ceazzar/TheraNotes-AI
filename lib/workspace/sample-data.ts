/**
 * Sample workspace data for development.
 * Mirrors the design reference data.jsx — will be replaced by Supabase queries.
 */

export interface ReportSection {
  id: string;
  title: string;
  duration: number;
}

export interface Flag {
  id: string;
  sev: "critical" | "warning" | "suggestion";
  section: string;
  title: string;
  desc: string;
  fix: string;
  rationale: string;
  refined: string;
  originalText: string;
  resolved: boolean;
}

export interface FlagPreview {
  state: "preview" | "accepted";
  text: string;
}

export interface Participant {
  name: string;
  ndisNumber: string;
  dob: string;
  address: string;
  assessor: string;
  ahpra: string;
  assessmentDate: string;
  reportDate: string;
  diagnoses: string;
}

export const REPORT_SECTIONS: ReportSection[] = [
  { id: "a", title: "Part A — About the Participant", duration: 1600 },
  {
    id: "b",
    title: "Part B — Mental Health & Psychosocial",
    duration: 1800,
  },
  { id: "c", title: "Part C — Functional Impairments", duration: 2400 },
  { id: "d", title: "Part D — Assessment Findings", duration: 2000 },
  {
    id: "e",
    title: "Part E — Summary & Recommendations",
    duration: 1400,
  },
];

export const FLAGS: Omit<Flag, "resolved">[] = [
  {
    id: "f1",
    sev: "critical",
    section: "a",
    title: "Vague functional descriptor",
    desc: 'The phrase "generally manages" is non-specific and does not meet NDIS evidentiary standards for functional capacity.',
    fix: 'Replace with a concrete frequency and degree of support — e.g. "requires supervision for 3 of 7 days per week, with prompting for sequencing."',
    rationale:
      "NDIS planners require measurable functional descriptors tied to frequency, duration, and level of assistance (AT 2024 Operational Guidelines §5.2).",
    refined:
      "requires supervision 3 of 7 days per week, with verbal prompting to sequence morning routines",
    originalText: "generally manages",
  },
  {
    id: "f2",
    sev: "critical",
    section: "c",
    title: "Missing evidence for stated limitation",
    desc: 'Claim of "limited community access" is not linked to a standardised measure or observed evidence in the assessment record.',
    fix: "Cite the specific WHODAS 2.0 domain score and the dated observation that supports this limitation.",
    rationale:
      "Planners require traceable evidence for every functional claim. Unsupported statements are routinely removed from plans at review.",
    refined:
      "WHODAS 2.0 Domain 5 (Participation) score of 68 indicating severe restriction, corroborated by observation on 14 Apr 2026 where the participant required 1:1 support to access a community pharmacy",
    originalText:
      "The participant demonstrates limited community access across multiple settings",
  },
  {
    id: "f3",
    sev: "warning",
    section: "b",
    title: "Mental health domain under-reported",
    desc: "Only one sentence covers psychological functioning. NDIS expects a paragraph per domain where a diagnosis is listed.",
    fix: "Expand to describe impact on daily routine, triggers, coping strategies, and any treating clinician involvement.",
    rationale:
      "Under-reported domains weaken the case for psychosocial supports at plan review.",
    refined:
      "Psychological functioning is significantly impacted by chronic anxiety and low mood, affecting initiation of daily routines on most days. Triggers include unstructured time and unexpected social demands. The participant engages fortnightly with a clinical psychologist and uses grounding strategies with variable success.",
    originalText:
      "The participant experiences ongoing psychological distress related to their acquired brain injury.",
  },
  {
    id: "f4",
    sev: "warning",
    section: "c",
    title: "Score contradicts narrative",
    desc: 'Narrative describes "independent meal preparation" but FIM self-care score is 3 (moderate assistance).',
    fix: "Reconcile the discrepancy — either qualify the narrative or correct the score with justification.",
    rationale:
      "Contradictions between narrative and scores trigger planner clarification requests and delay approvals.",
    refined:
      "independent with simple meal preparation (sandwiches, reheating) but requires moderate assistance for multi-step hot meals, consistent with FIM self-care score of 3",
    originalText: "manages meal preparation independently for most meals",
  },
  {
    id: "f5",
    sev: "warning",
    section: "c",
    title: "Undefined abbreviation",
    desc: '"ADL" appears without being defined on first use.',
    fix: 'Expand on first occurrence: "Activities of Daily Living (ADLs)".',
    rationale:
      "Planners come from varied backgrounds; defining terminology on first use is a formatting standard.",
    refined: "Activities of Daily Living (ADLs)",
    originalText: "ADLs",
  },
  {
    id: "f6",
    sev: "warning",
    section: "d",
    title: "Support recommendation lacks hours",
    desc: 'Recommendation for "ongoing support worker assistance" does not specify hours or frequency.',
    fix: "State the weekly hours and breakdown (e.g. 8 hrs/week, split across community access and domestic tasks).",
    rationale:
      "Plans are funded in hours, not descriptions. Unquantified recommendations cannot be costed.",
    refined:
      "support worker assistance totalling 8 hours per week, comprising 5 hours for community access and 3 hours for domestic tasks",
    originalText: "ongoing support worker assistance",
  },
  {
    id: "f7",
    sev: "suggestion",
    section: "e",
    title: "Consider adding goal-linked outcomes",
    desc: "Recommendations are strong but not explicitly linked to the participant's stated goals.",
    fix: "Tie each recommendation to one of the participant's three stated goals for clearer plan alignment.",
    rationale:
      "Goal-linked recommendations align with NDIS plan architecture and are easier for planners to approve.",
    refined:
      "Each recommendation is linked to the participant's stated goals of (1) increasing community participation, (2) returning to part-time work, and (3) sustaining independent living in their current tenancy.",
    originalText:
      "The above recommendations are informed by the assessment findings and are consistent with the participant's stated goals and NDIS plan objectives.",
  },
];

export const PARTICIPANT: Participant = {
  name: "Participant A",
  ndisNumber: "430 812 617",
  dob: "14 March 1986 (40 yrs)",
  address: "Sunshine North, VIC 3020",
  assessor: "Assessor B, OT",
  ahpra: "OCC0001234567",
  assessmentDate: "17 April 2026",
  reportDate: "24 April 2026",
  diagnoses:
    "Acquired brain injury (2018); generalised anxiety disorder; chronic lower back pain",
};
