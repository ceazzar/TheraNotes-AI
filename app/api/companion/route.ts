import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const FULL_REVIEW_PROMPT = `\
You are an experienced clinical assessment companion for allied health professionals
completing Functional Capacity Assessments (FCAs) for NDIS participants. Your role is
to review the structured assessment data and provide helpful, non-intrusive advisory feedback.

You review assessment data and identify:

## 1. Cross-Domain Inconsistencies

Look for contradictions or gaps between domains:
- Mobility domain mentions assistive devices but Home Environment has no modifications noted
- Primary Diagnosis indicates a condition with known sensory impacts but sensory data is absent
- Social Background mentions isolation but Support Network lists extensive informal supports
- Functional Domains report severe mobility limitations but Home Environment says no safety concerns
- Mental Health notes significant anxiety but Social Functioning shows no impact

## 2. Missing Observations Based on Primary Diagnosis

Flag expected data that is absent given the stated diagnosis:
- ASD: sensory processing data, communication style, routine/transition observations expected
- Psychosocial disability: mental health domain should be substantive, coping strategies documented
- Physical disability: mobility, self-care, and home environment details are critical
- Intellectual disability: functional domains should detail capacity vs. performance
- Neurological conditions: cognitive assessments, fatigue patterns expected

## 3. Completeness Gaps

Identify domains or fields that are unexpectedly empty or sparse:
- A domain that is entirely empty despite relevance to the primary diagnosis
- A domain with only 1-2 fields filled when more detail is expected
- Standardized scores missing when the diagnosis warrants formal measurement
- Clinical notes empty despite complex presentation

## 4. Documentation Suggestions

Suggest what else to document for a stronger assessment:
- Specific examples or observed behaviours that would strengthen the narrative
- Standardized tools that should be administered
- Functional impact statements that connect impairment to daily life
- Risk factors or safety considerations worth documenting
- Participant goals or aspirations that should be captured

## Output Format

Return ONLY a JSON object with a "suggestions" key containing an array. No markdown.
Each suggestion must have:
- domain: the domain key (e.g., "primary_diagnosis", "home_environment", "functional_domains")
- severity: "info" | "warning"
  - warning: cross-domain inconsistency or critical gap that could weaken the report
  - info: helpful suggestion or minor completeness note
- message: clear, concise description (1-2 sentences)
- recommendation: specific action the clinician should take (1-2 sentences)

## Severity Guidelines

WARNING:
- Cross-domain contradictions or inconsistencies
- Domain completely empty despite diagnosis relevance
- Missing standardized scores for a condition that requires them
- Safety-related observations absent when risk factors are present

INFO:
- Suggestions for additional documentation
- Minor completeness improvements
- Recommended standardized tools to administer
- Opportunities to add participant quotes or examples

Be respectful of the clinician's expertise. Focus on what would strengthen the NDIS submission.
Do not flag domains the clinician clearly hasn't started yet — only flag empty domains if directly
relevant to the primary diagnosis. Limit to the most impactful suggestions (max 8-10 items).
`

const LIGHTWEIGHT_PROMPT = `\
You are a clinical assessment companion reviewing an FCA for an NDIS participant.
A domain has just been saved. Do a quick check for critical issues only.

Look for:
1. Cross-domain contradictions with previously saved domains
2. Obviously missing critical data given the primary diagnosis
3. Internal inconsistencies within the saved domain

Return ONLY a JSON object with a "suggestions" key containing an array.
Only include WARNING-level items — skip minor suggestions.
Each object: { "domain": string, "severity": "warning", "message": string, "recommendation": string }

If nothing critical is found, return: { "suggestions": [] }
Keep it to 3 items maximum. Be concise.
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

  const { assessmentId, trigger } = (await request.json()) as {
    assessmentId: string
    trigger: 'domain_saved' | 'readiness_check'
  }

  if (!assessmentId || !trigger) {
    return NextResponse.json(
      { error: 'assessmentId and trigger are required' },
      { status: 400 }
    )
  }

  // Load assessment data
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select(
      'participant_name, primary_diagnosis, social_background, support_network, ' +
      'home_environment, mental_health, functional_domains, standardized_scores, ' +
      'clinical_notes, domain_status'
    )
    .eq('id', assessmentId)
    .single()

  if (assessmentError || !assessment) {
    return NextResponse.json(
      { error: 'Assessment not found' },
      { status: 404 }
    )
  }

  // Select prompt and model params based on trigger
  const isLightweight = trigger === 'domain_saved'
  const systemPrompt = isLightweight ? LIGHTWEIGHT_PROMPT : FULL_REVIEW_PROMPT
  const maxTokens = isLightweight ? 1024 : 4096

  // Build the user message with assessment context
  const assessmentContext = JSON.stringify(assessment, null, 2)
  const userMessage = isLightweight
    ? `A domain was just saved. Here is the current assessment state:\n\n\`\`\`json\n${assessmentContext}\n\`\`\`\n\nCheck for critical issues only.`
    : `The clinician is checking readiness before generating a report. Review the full assessment:\n\n\`\`\`json\n${assessmentContext}\n\`\`\`\n\nProvide a comprehensive review with suggestions for improvement.`

  // Call gpt-5.4 (fast model — advisory only)
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: process.env.COMPANION_MODEL || 'gpt-5.4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  })

  const rawOutput = response.choices[0].message.content ?? '{"suggestions":[]}'

  // Parse suggestions from the response
  let suggestions: unknown[] = []
  try {
    const parsed = JSON.parse(rawOutput)
    suggestions = Array.isArray(parsed)
      ? parsed
      : (parsed.suggestions ?? [])
  } catch {
    suggestions = []
  }

  return NextResponse.json({ suggestions })
}
