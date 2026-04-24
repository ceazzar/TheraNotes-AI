import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

const PLANNER_SYSTEM_PROMPT = `\
You are an experienced NDIS planner reviewing a Functional Capacity Assessment (FCA) report.
Your role is to evaluate this report the way an NDIS planner would during a plan review meeting,
identifying issues that would lead to funding rejections, requests for further information, or
a weakened case for the participant's support needs.

## Your Review Criteria

### 1. Vague or Aspirational Language
Flag any language that is vague, aspirational, or uses hedging phrases instead of clinical
specificity. NDIS planners look for definitive clinical language.

Common problematic patterns:
- "would benefit from" → should be "requires X to maintain functional capacity in Y"
- "may need assistance" → should be "requires daily assistance with X due to Y"
- "could help improve" → should be "is clinically indicated to prevent deterioration of X"
- "it is recommended" → should be "clinical assessment indicates necessity for X"
- "appears to struggle" → should be "demonstrates significant impairment in X as evidenced by Y"
- "seems to have difficulty" → should be "presents with documented difficulty in X"

### 2. Recommendation-to-Impairment Linkage
Every recommendation MUST be directly linked to:
- A specific functional impairment documented in the assessment
- Evidence from standardized assessments (WHODAS, sensory profiles, etc.)
- The participant's stated goals
- A clear explanation of what happens WITHOUT the recommended support

Flag any recommendation that:
- Lacks a clear connection to documented impairment
- Does not reference assessment evidence
- Could apply to any participant (generic)
- Does not explain consequences of support absence

### 3. Score-Narrative Consistency
Check that WHODAS scores and other standardized assessment scores are consistent
with the narrative descriptions throughout the report:
- A WHODAS domain score of 3-4 (severe/extreme) should correspond to descriptions of
  significant impairment, not moderate language
- A WHODAS domain score of 0-1 (none/mild) should not have narrative claiming severe
  limitations in that domain
- Sensory profile scores should align with sensory-related descriptions
- If scores suggest moderate impairment but narrative uses severe language (or vice versa),
  flag the inconsistency

### 4. Generic vs. Participant-Specific Content
NDIS planners can spot template language immediately. Flag any content that:
- Uses generic descriptions not specific to this participant
- Could be copy-pasted between reports
- Lacks specific examples, dates, or observed behaviors
- Does not reference the participant by name when discussing their specific situation
- Uses boilerplate recommendations not tailored to the individual's circumstances

### 5. Common NDIS Rejection Patterns
Flag issues matching known rejection patterns:
- Recommendations for supports not within NDIS scope (e.g., clinical treatment vs. functional support)
- Missing evidence of permanence (condition must be permanent or likely permanent)
- Lack of clear functional impact description
- Recommendations that duplicate informal/natural supports without justification
- Missing comparison to age-appropriate functioning
- Failure to demonstrate that supports are "reasonable and necessary"
- Support requests without clear line of sight to participant goals
- Insufficient evidence that mainstream services cannot meet the need
- Missing consideration of current support utilization and effectiveness

## Output Format

Return ONLY a JSON array of flag objects. No markdown, no explanation outside the JSON. Each flag must have:
- sectionId: the section key where the issue was found
- severity: "critical" | "warning" | "suggestion"
  - critical: would likely cause rejection or major request for information
  - warning: weakens the case but may not cause outright rejection
  - suggestion: improvement opportunity for stronger advocacy
- issue: clear description of the problem found
- recommendation: specific rewrite or fix suggestion
- ndisRationale: brief explanation of why an NDIS planner would flag this

## Severity Guidelines

CRITICAL:
- Missing impairment-to-recommendation linkage
- Score-narrative contradictions
- Recommendations outside NDIS scope
- Missing evidence of functional impact
- No demonstration of reasonable and necessary

WARNING:
- Vague/aspirational language in key sections
- Generic content that could apply to any participant
- Missing comparison to age-appropriate functioning
- Insufficient detail on current support effectiveness

SUGGESTION:
- Minor language improvements for stronger advocacy
- Additional evidence that could strengthen the case
- Formatting or structure improvements
- Opportunities to add participant voice/quotes

Be thorough but fair. Focus on issues that would genuinely affect the NDIS plan review outcome.
Do not flag stylistic preferences — only flag issues with clinical or funding implications.
`

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId } = await request.json()
  if (!reportId)
    return NextResponse.json(
      { error: 'reportId is required' },
      { status: 400 }
    )

  // Load report sections
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('sections, assessment_id')
    .eq('id', reportId)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const sections = report.sections as Record<
    string,
    { title: string; content: string }
  >

  // Load linked assessment data if available
  let assessmentData: Record<string, unknown> | null = null
  if (report.assessment_id) {
    const { data: assessment } = await supabase
      .from('assessments')
      .select(
        'participant_name, primary_diagnosis, social_background, support_network, home_environment, mental_health, functional_domains, standardized_scores, clinical_notes'
      )
      .eq('id', report.assessment_id)
      .single()
    assessmentData = assessment
  }

  // Query past corrections for this clinician to inform the review
  const { data: corrections } = await supabase
    .from('corrections')
    .select('section, original_text, revised_text, feedback, correction_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Build the report text for the model
  const reportText = Object.entries(sections)
    .map(
      ([sectionId, section]) =>
        `### Section: ${sectionId}\n#### ${section.title}\n\n${section.content}`
    )
    .join('\n\n---\n\n')

  // Build assessment context
  let assessmentContext = ''
  if (assessmentData) {
    assessmentContext = `\n\n## Assessment Data (for cross-referencing)\n\`\`\`json\n${JSON.stringify(assessmentData, null, 2)}\n\`\`\``
  }

  // Build correction history context
  let correctionContext = ''
  if (corrections && corrections.length > 0) {
    const correctionLines = corrections.map((c, i) =>
      `${i + 1}. Section: "${c.section}" | Type: ${c.correction_type}\n   Feedback: "${c.feedback}"\n   Change: "${c.original_text.slice(0, 150)}..." → "${c.revised_text.slice(0, 150)}..."`
    ).join('\n')
    correctionContext = `\n\n## Clinician Correction History\nThis clinician has received the following corrections in past reports. Flag any recurring patterns that appear in this report:\n${correctionLines}`
  }

  const userMessage = `Please review the following FCA report and return your flags as a JSON array.\n\n## Report Sections\n\n${reportText}${assessmentContext}${correctionContext}`

  // Call the model
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: process.env.REVIEW_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })

  const rawOutput = response.choices[0].message.content ?? '{"flags":[]}'

  // Parse flags from the response
  let flags: unknown[] = []
  try {
    const parsed = JSON.parse(rawOutput)
    // Handle both { flags: [...] } and direct array
    flags = Array.isArray(parsed) ? parsed : (parsed.flags ?? [])
  } catch {
    flags = []
  }

  // Save to reports.planner_review
  await supabase
    .from('reports')
    .update({ planner_review: { flags, reviewed_at: new Date().toISOString() } })
    .eq('id', reportId)

  return NextResponse.json({ flags })
}
