"""
Tool stubs for the Assessment Companion agent.

Each tool reads from Supabase using the shared client.
These are for standalone local testing — the web route uses direct Supabase queries instead.
"""

import json
from agents import function_tool

from agents.shared.db import get_supabase


@function_tool
def get_assessment_data(assessment_id: str) -> str:
    """
    Load a full assessment record including all structured domains,
    standardized scores, and clinical notes.

    Args:
        assessment_id: UUID of the assessment to load.

    Returns:
        JSON string of the full assessment record.
    """
    sb = get_supabase()
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
def get_clinician_profile(user_id: str) -> str:
    """
    Load the clinician's profile including their discipline, credentials,
    and any saved preferences that might influence assessment expectations.

    Args:
        user_id: UUID of the clinician (auth user).

    Returns:
        JSON string of the clinician profile.
    """
    sb = get_supabase()
    result = (
        sb.table("profiles")
        .select("id, full_name, discipline, credentials, preferences")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "Profile not found"})
    return json.dumps(result.data, default=str)


@function_tool
def check_domain_completeness(assessment_id: str) -> str:
    """
    Check the completeness status of each domain in an assessment.
    Returns a mapping of domain keys to their fill status (empty, partial, complete)
    along with the count of filled fields in each domain.

    Args:
        assessment_id: UUID of the assessment to check.

    Returns:
        JSON string with domain completeness details.
    """
    sb = get_supabase()
    result = (
        sb.table("assessments")
        .select(
            "domain_status, primary_diagnosis, social_background, "
            "support_network, home_environment, mental_health, "
            "functional_domains, standardized_scores, clinical_notes"
        )
        .eq("id", assessment_id)
        .single()
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "Assessment not found"})

    data = result.data
    domain_status = data.get("domain_status", {}) or {}

    # Build a detailed completeness report
    completeness = {}
    domain_keys = [
        "primary_diagnosis",
        "social_background",
        "support_network",
        "home_environment",
        "mental_health",
    ]

    for key in domain_keys:
        domain_data = data.get(key, {}) or {}
        filled = [k for k, v in domain_data.items() if v and str(v).strip()]
        total = len(domain_data)
        completeness[key] = {
            "status": domain_status.get(key, "empty"),
            "filled_fields": len(filled),
            "total_fields": total,
            "filled_keys": filled,
        }

    # Functional domains (nested)
    fd = data.get("functional_domains", {}) or {}
    fd_filled = sum(
        1
        for sub in fd.values()
        if isinstance(sub, dict)
        and any(v and str(v).strip() for v in sub.values())
    )
    completeness["functional_domains"] = {
        "status": domain_status.get("functional_domains", "empty"),
        "filled_subdomains": fd_filled,
        "total_subdomains": len(fd),
    }

    # Standardized scores
    scores = data.get("standardized_scores", {}) or {}
    scores_filled = sum(
        1
        for v in scores.values()
        if (isinstance(v, dict) and any(sv and str(sv).strip() for sv in v.values()))
        or (isinstance(v, str) and v.strip())
    )
    completeness["standardized_scores"] = {
        "status": domain_status.get("standardized_scores", "empty"),
        "filled_sections": scores_filled,
    }

    # Clinical notes
    notes = data.get("clinical_notes", "") or ""
    completeness["clinical_notes"] = {
        "status": domain_status.get("clinical_notes", "empty"),
        "has_content": bool(notes.strip()),
        "character_count": len(notes.strip()),
    }

    return json.dumps(completeness, default=str)
