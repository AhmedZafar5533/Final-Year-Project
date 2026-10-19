"""Analysis endpoint: run the agent swarm over supplied raw text."""

from fastapi import APIRouter, HTTPException

from app.api.schemas import AnalyzeRequest
from app.core import licensing
from app.services.analyzer import analyze_competitor_intel

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """Analyse raw content and return a competitor intelligence profile."""
    if not licensing.can_scan():
        raise HTTPException(
            status_code=402,
            detail=(
                "Your free trial has ended. Add a license key in Settings to keep scanning."
            ),
        )

    try:
        profile = await analyze_competitor_intel(
            raw_content=req.raw_content,
            competitor_hint=req.competitor_name,
            source_type=req.source_type,
        )
        licensing.record_scan()
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
