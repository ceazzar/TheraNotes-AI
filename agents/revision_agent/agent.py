"""
Revision Agent

Handles section revision with cross-section impact analysis and correction
recording. When a clinician revises one section, this agent checks whether
the change introduces inconsistencies with other sections and records the
correction for future learning.

Uses the OpenAI Agents SDK pattern for standalone local testing.
"""

import json
from agents import Agent, Runner, function_tool

from agents.shared.db import get_supabase


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@function_tool
def get_report_sections(report_id: str) -> str:
    """
    Load all sections of an FCA report by report ID.

    Args:
        report_id: UUID of the report to load.

    Returns:
        JSON string of report sections keyed by section ID.
    """
    sb = get_supabase()
    result = (
        sb.table("reports")
        .select("sections, status")
        .eq("id", report_id)
        .single()
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "Report not found"})
    return json.dumps(result.data)


@function_tool
def get_past_corrections(user_id: str, section: str | None = None) -> str:
    """
    Load past corrections for a clinician to identify recurring patterns.

    Args:
        user_id: UUID of the clinician.
        section: Optional section filter.

    Returns:
        JSON string of past corrections.
    """
    sb = get_supabase()
    query = (
        sb.table("corrections")
        .select("section, original_text, revised_text, feedback, correction_type")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(10)
    )
    if section:
        query = query.eq("section", section)
    result = query.execute()
    return json.dumps(result.data or [], default=str)


@function_tool
def record_correction(
    user_id: str,
    section: str,
    original_text: str,
    revised_text: str,
    feedback: str,
) -> str:
    """
    Record a clinician correction for future learning.

    Args:
        user_id: UUID of the clinician.
        section: The section that was revised.
        original_text: The text before revision.
        revised_text: The text after revision.
        feedback: The clinician feedback that prompted the change.

    Returns:
        JSON confirmation or error.
    """
    sb = get_supabase()
    result = (
        sb.table("corrections")
        .insert(
            {
                "user_id": user_id,
                "section": section,
                "original_text": original_text,
                "revised_text": revised_text,
                "feedback": feedback,
                "correction_type": "revision",
            }
        )
        .execute()
    )
    if result.data:
        return json.dumps({"success": True, "message": "Correction recorded."})
    return json.dumps({"success": False, "error": "Failed to insert correction."})


@function_tool
def check_cross_section_impact(report_id: str, revised_section: str, revised_content: str) -> str:
    """
    Check whether a section revision introduces inconsistencies with other
    sections of the report.

    Args:
        report_id: UUID of the report.
        revised_section: The section that was revised.
        revised_content: The new content of the revised section.

    Returns:
        JSON string listing any cross-section impacts detected.
    """
    sb = get_supabase()
    result = (
        sb.table("reports")
        .select("sections")
        .eq("id", report_id)
        .single()
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "Report not found"})

    sections = result.data.get("sections", {})
    other_sections = {
        k: v for k, v in sections.items() if k != revised_section
    }

    # Return the other sections so the LLM can perform the consistency check
    return json.dumps(
        {
            "revised_section": revised_section,
            "other_sections": {
                k: v.get("content", "")[:500] for k, v in other_sections.items()
            },
        },
        default=str,
    )


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are a Revision Agent for TheraNotes AI, specialising in revising individual sections
of NDIS Functional Capacity Assessment (FCA) reports based on clinician feedback.

## Your Responsibilities

### 1. Apply the Revision
When a clinician provides feedback on a section, revise the section to incorporate
their feedback while maintaining:
- Clinical accuracy and NDIS compliance
- Consistency with the rest of the report
- The clinician's preferred writing style (informed by past corrections)

### 2. Cross-Section Impact Analysis
After revising a section, check whether the change introduces inconsistencies with
other sections of the report. Common cross-section impacts include:
- Changing severity language in one section that contradicts another
- Adding a new functional impairment that should be referenced in recommendations
- Modifying assessment scores that are cited elsewhere in the report
- Removing a finding that is referenced in the summary/recommendations

If impacts are detected, flag them and suggest corresponding updates to affected sections.

### 3. Correction Recording
After completing a revision, ALWAYS record the correction using the record_correction
tool. This builds the clinician's learning profile so future reports proactively avoid
the same issues.

### 4. Pattern Recognition
Before revising, check the clinician's past corrections using get_past_corrections.
If you see recurring patterns (e.g., always strengthening advocacy language, always
adding functional impact statements), apply those patterns proactively.

## Output Format

Return a JSON object with:
- revised_content: the full revised section text
- changes_made: array of strings describing each change
- cross_section_impacts: array of objects with { section, issue, suggested_fix }
- patterns_applied: array of strings describing any patterns from past corrections
  that were proactively applied

## Rules
- Preserve clinical accuracy above all else
- Use NDIS advocacy language (definitive, evidence-based, not aspirational)
- Never invent clinical findings not supported by the source material
- Always record the correction after revision
- Flag cross-section impacts rather than silently ignoring them
"""


# ---------------------------------------------------------------------------
# Agent factory and runner
# ---------------------------------------------------------------------------


def create_revision_agent() -> Agent:
    """Create and return the Revision Agent."""
    return Agent(
        name="Revision Agent",
        instructions=SYSTEM_PROMPT,
        model="gpt-4o",
        tools=[
            get_report_sections,
            get_past_corrections,
            record_correction,
            check_cross_section_impact,
        ],
    )


async def run_revision(
    report_id: str,
    section_id: str,
    feedback: str,
    user_id: str,
) -> dict:
    """
    Run the Revision Agent to revise a report section.

    Args:
        report_id: UUID of the report.
        section_id: The section to revise.
        feedback: Clinician feedback describing what to change.
        user_id: UUID of the clinician (for correction recording).

    Returns:
        Dict with revised_content, changes_made, and cross_section_impacts.
    """
    agent = create_revision_agent()

    result = await Runner.run(
        agent,
        input=(
            f"Revise section '{section_id}' of report '{report_id}' based on this feedback:\n\n"
            f"\"{feedback}\"\n\n"
            f"Clinician user_id: {user_id}\n\n"
            "Steps:\n"
            "1. Load the report sections to see the current content\n"
            "2. Check past corrections for this clinician and section\n"
            "3. Revise the section incorporating the feedback and any recurring patterns\n"
            "4. Check cross-section impact of the revision\n"
            "5. Record the correction for future learning\n"
            "6. Return the result as JSON"
        ),
    )

    response_text = result.final_output
    try:
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip()
        output = json.loads(json_str)
    except (json.JSONDecodeError, IndexError):
        output = {
            "revised_content": response_text,
            "changes_made": [],
            "cross_section_impacts": [],
            "patterns_applied": [],
        }

    return output


if __name__ == "__main__":
    import asyncio
    import sys

    if len(sys.argv) < 4:
        print(
            "Usage: python -m agents.revision_agent.agent "
            "<report_id> <section_id> <user_id> <feedback>"
        )
        sys.exit(1)

    report_id = sys.argv[1]
    section_id = sys.argv[2]
    user_id = sys.argv[3]
    feedback = " ".join(sys.argv[4:])
    result = asyncio.run(run_revision(report_id, section_id, feedback, user_id))
    print(json.dumps(result, indent=2))
