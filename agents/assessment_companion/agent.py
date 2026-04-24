"""
Assessment Companion Agent

Reviews structured assessment data in real-time as clinicians fill in the form,
identifying cross-domain inconsistencies, missing observations, completeness
gaps, and documentation suggestions.

Uses the OpenAI Agents SDK pattern for standalone local testing.
"""

import os
import json
from agents import Agent, Runner

from agents.assessment_companion.tools import (
    get_assessment_data,
    get_clinician_profile,
    check_domain_completeness,
)

SYSTEM_PROMPT = """\
You are an experienced clinical assessment companion for allied health professionals
completing Functional Capacity Assessments (FCAs) for NDIS participants. Your role is
to review the structured assessment data as it is being filled in and provide helpful,
non-intrusive advisory feedback.

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

Return ONLY a JSON array of suggestion objects. No markdown, no explanation outside the JSON.
Each suggestion must have:
- domain: the domain key this relates to (e.g., "primary_diagnosis", "home_environment", "functional_domains")
- severity: "info" | "warning"
  - warning: a cross-domain inconsistency or critical gap that could weaken the report
  - info: a helpful suggestion or minor completeness note
- message: clear, concise description of what was noticed (1-2 sentences)
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

## Important

- Be respectful of the clinician's expertise — frame as suggestions, not corrections
- Focus on what would strengthen the NDIS submission
- Do not flag domains that are clearly not yet started (the clinician may be working through them)
- Only flag empty domains as warnings if they are directly relevant to the primary diagnosis
- Keep suggestions actionable and specific
- Limit output to the most impactful suggestions (max 8-10 items)
"""

LIGHTWEIGHT_PROMPT = """\
You are a clinical assessment companion reviewing an FCA being completed for an NDIS participant.
A domain has just been saved. Do a quick check for critical issues only.

Look for:
1. Cross-domain contradictions with previously saved domains
2. Obviously missing critical data given the primary diagnosis
3. Internal inconsistencies within the saved domain

Return ONLY a JSON array of suggestion objects. Only include WARNING-level items — skip minor suggestions.
Each object: { "domain": string, "severity": "warning", "message": string, "recommendation": string }

If nothing critical is found, return an empty array: []
Keep it to 3 items maximum. Be concise.
"""


def create_companion_agent(lightweight: bool = False) -> Agent:
    """Create and return the Assessment Companion agent.

    Args:
        lightweight: If True, uses a shorter prompt for quick domain-saved checks.
    """
    return Agent(
        name="Assessment Companion",
        instructions=LIGHTWEIGHT_PROMPT if lightweight else SYSTEM_PROMPT,
        model=os.environ.get("CHAT_MODEL", "gpt-5.4"),
        tools=[
            get_assessment_data,
            get_clinician_profile,
            check_domain_completeness,
        ],
    )


async def run_companion_check(
    assessment_id: str, lightweight: bool = False
) -> list[dict]:
    """
    Run the Assessment Companion against an assessment.

    Args:
        assessment_id: UUID of the assessment to review.
        lightweight: If True, performs a quick critical-only check.

    Returns:
        List of suggestion dictionaries.
    """
    agent = create_companion_agent(lightweight=lightweight)

    mode = "quick critical check" if lightweight else "full readiness review"
    result = await Runner.run(
        agent,
        input=f"Perform a {mode} on the assessment with ID: {assessment_id}. "
        "Use the available tools to load the assessment data and domain completeness, "
        "then review the data and return your suggestions as a JSON array.",
        max_turns=10,
    )

    # Parse the JSON output from the agent's response
    response_text = result.final_output
    suggestions = _parse_json_output(response_text, fallback=[])

    return suggestions


def _parse_json_output(text: str, fallback=None):
    """Robustly extract JSON from an LLM response that may contain markdown fences."""
    if fallback is None:
        fallback = []

    # Try direct parse first (fastest path)
    try:
        parsed = json.loads(text.strip())
        return parsed if isinstance(parsed, list) else parsed.get("suggestions", fallback)
    except (json.JSONDecodeError, AttributeError):
        pass

    # Try extracting from markdown code fences
    for fence in ("```json", "```"):
        if fence in text:
            try:
                json_str = text.split(fence, 1)[1].split("```", 1)[0].strip()
                parsed = json.loads(json_str)
                return parsed if isinstance(parsed, list) else parsed.get("suggestions", fallback)
            except (json.JSONDecodeError, IndexError, AttributeError):
                continue

    return fallback


if __name__ == "__main__":
    import asyncio
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m agents.assessment_companion.agent <assessment_id> [--lightweight]")
        sys.exit(1)

    assessment_id = sys.argv[1]
    lightweight = "--lightweight" in sys.argv
    suggestions = asyncio.run(run_companion_check(assessment_id, lightweight=lightweight))
    print(json.dumps(suggestions, indent=2))
