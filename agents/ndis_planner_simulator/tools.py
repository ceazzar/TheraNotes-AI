"""
Tool stubs for the NDIS Planner Simulator agent.

Each tool reads from Supabase using the shared client.
These are for future local testing — the web route uses direct Supabase queries instead.
"""

import json
from agents import function_tool

from shared.db import get_supabase


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
        .select("sections, status, coherence_result, planner_review")
        .eq("id", report_id)
        .single()
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "Report not found"})
    return json.dumps(result.data)


@function_tool
def get_assessment_data(report_id: str) -> str:
    """
    Load the linked assessment data for a report, including structured clinical
    input, standardized scores, and functional domains.

    Args:
        report_id: UUID of the report whose linked assessment to load.

    Returns:
        JSON string of the full assessment record.
    """
    sb = get_supabase()
    # First get the assessment_id from the report
    report = (
        sb.table("reports")
        .select("assessment_id")
        .eq("id", report_id)
        .single()
        .execute()
    )
    if not report.data or not report.data.get("assessment_id"):
        return json.dumps({"error": "No linked assessment found"})

    assessment_id = report.data["assessment_id"]
    result = (
        sb.table("assessments")
        .select("*")
        .eq("id", assessment_id)
        .single()
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "Assessment not found"})
    return json.dumps(result.data, default=str)


@function_tool
def lookup_ndis_support_category(category_name: str) -> str:
    """
    Look up an NDIS support category to check if a recommendation aligns with
    valid NDIS funding categories.

    Args:
        category_name: Name or keyword for the support category to look up.

    Returns:
        JSON string of matching NDIS rules/categories.
    """
    sb = get_supabase()
    result = (
        sb.table("ndis_rules")
        .select("*")
        .eq("rule_type", "support_category")
        .ilike("content->>name", f"%{category_name}%")
        .execute()
    )
    return json.dumps(result.data or [], default=str)


@function_tool
def get_rejection_patterns() -> str:
    """
    Load common NDIS rejection patterns from the knowledge base to compare
    against the report being reviewed.

    Returns:
        JSON string of rejection pattern rules.
    """
    sb = get_supabase()
    result = (
        sb.table("ndis_rules")
        .select("*")
        .eq("rule_type", "rejection_pattern")
        .execute()
    )
    return json.dumps(result.data or [], default=str)


@function_tool
def get_past_corrections(user_id: str, section: str | None = None) -> str:
    """
    Load past corrections/revisions for a clinician to identify recurring
    patterns in their reports.

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
        .limit(20)
    )
    if section:
        query = query.eq("section", section)
    result = query.execute()
    return json.dumps(result.data or [], default=str)
