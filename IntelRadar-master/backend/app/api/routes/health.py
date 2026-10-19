"""Liveness / readiness endpoint."""

import datetime

from fastapi import APIRouter

from app.core import config
from app.services.browser_agent import is_available as browser_agent_available

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    """Liveness probe plus the active model chain, engines and scraper stack."""
    return {
        "status": "active",
        "system": "IntelRadar Autonomous War-Room Engine",
        "model": config.DEFAULT_MODEL,
        "model_chain": config.ANALYSIS_MODELS,
        "gemini_api_key_set": bool(config.GEMINI_API_KEY),
        "engines": ["fast", "live", "agent"],
        "browser_agent_available": browser_agent_available(),
        "scrapers": ["Crawl4AI", "Playwright browser agent", "yt-dlp", "faster-whisper"],
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }
