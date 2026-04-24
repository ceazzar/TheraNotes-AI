"""FastAPI server for TheraNotes AI agents.

Deployed on Railway. Vercel API routes proxy to this service.
"""

import os
import json
import logging
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

from agents.ndis_planner_simulator.agent import run_planner_review
from agents.assessment_companion.agent import run_companion_check
from agents.revision_agent.agent import run_revision

logging.basicConfig(level=logging.INFO, format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}')
logger = logging.getLogger("theranotes-agents")

app = FastAPI(title="TheraNotes AI Agents", version="1.0.0")

AGENT_API_KEY = os.environ.get("AGENT_API_KEY", "")


def verify_key(authorization: str = Header(None)):
    if not AGENT_API_KEY:
        return
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token != AGENT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


class ReviewRequest(BaseModel):
    report_id: str
    user_id: str | None = None

class CompanionRequest(BaseModel):
    assessment_id: str
    trigger: str = "readiness_check"

class RevisionRequest(BaseModel):
    report_id: str
    section_id: str
    feedback: str
    user_id: str


@app.get("/health")
def health():
    return {"status": "ok", "agents": ["ndis_planner_simulator", "assessment_companion", "revision_agent"]}


@app.post("/review")
async def review(req: ReviewRequest, authorization: str = Header(None)):
    verify_key(authorization)
    logger.info(f"Planner review requested for report {req.report_id}")
    flags = await run_planner_review(req.report_id)
    return {"flags": flags}


@app.post("/companion")
async def companion(req: CompanionRequest, authorization: str = Header(None)):
    verify_key(authorization)
    lightweight = req.trigger == "domain_saved"
    logger.info(f"Companion check for assessment {req.assessment_id} (lightweight={lightweight})")
    suggestions = await run_companion_check(req.assessment_id, lightweight=lightweight)
    return {"suggestions": suggestions}


@app.post("/revise")
async def revise(req: RevisionRequest, authorization: str = Header(None)):
    verify_key(authorization)
    logger.info(f"Revision requested for report {req.report_id}, section {req.section_id}")
    result = await run_revision(req.report_id, req.section_id, req.feedback, req.user_id)
    return result
