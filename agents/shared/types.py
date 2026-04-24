from dataclasses import dataclass
from typing import Literal


@dataclass
class PlannerFlag:
    section_id: str
    severity: Literal["critical", "warning", "suggestion"]
    issue: str
    recommendation: str
    ndis_rationale: str
