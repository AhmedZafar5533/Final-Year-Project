"""Ingestion endpoints: web crawl, live news, video/comments and the full pipeline.

Scan engines (see ``app.api.schemas.EngineName``): ``fast`` (Crawl4AI),
``live`` (Playwright scroll + screenshot) and ``agent`` (LLM browser agent).
The heavy lifting lives in ``app.services.pipeline`` so the scheduler can reuse
exactly the same flow.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.core import licensing
from app.api.schemas import (
    AutonomousScanRequest,
    CommentsScanRequest,
    NewsScanRequest,
    UrlScanRequest,
    VideoScanRequest,
)
from app.services.browser_agent import run_browser_task
from app.services.media import process_youtube_video
from app.services.news import fetch_recent_news
from app.services.pipeline import run_scan
from app.services.scraper import capture_browser_agent, crawl_url
from app.services.youtube_comments import fetch_recent_comments

logger = logging.getLogger("scans")

router = APIRouter(prefix="/api/scan", tags=["scans"])


@router.post("/url")
async def scan_url(req: UrlScanRequest):
    """Scrape one URL with the requested engine."""
    try:
        if req.engine == "agent":
            return {"source": "browser_agent", "url": req.url, "report": await run_browser_task(req.url)}
        if req.engine == "live":
            return {"source": "playwright", **(await capture_browser_agent(req.url))}
        return {"source": "crawl4ai", **(await crawl_url(req.url))}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/video")
async def scan_video(req: VideoScanRequest):
    """Download a YouTube video's audio and transcribe it locally."""
    try:
        return await process_youtube_video(req.video_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/news")
async def scan_news(req: NewsScanRequest):
    """Recent news for a query (Google News RSS, no API key)."""
    try:
        items = fetch_recent_news(req.query, req.max_items, req.lookback_days)
        return {"query": req.query, "count": len(items), "items": items}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/comments")
async def scan_comments(req: CommentsScanRequest):
    """Newest YouTube comments for a video (no API key)."""
    try:
        comments = fetch_recent_comments(req.video_url, req.max_comments)
        return {"video_url": req.video_url, "count": len(comments), "comments": comments}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/autonomous")
async def autonomous_scan(req: AutonomousScanRequest):
    """Full pipeline: web + news + video/comments → analyse → diff → persist."""
    if not licensing.can_scan():
        raise HTTPException(
            status_code=402,
            detail=(
                "Your free trial has ended. Add a license key in Settings to keep scanning."
            ),
        )

    try:
        profile = await run_scan(
            req.competitor_name,
            url=req.url,
            video_url=req.video_url,
            engine=req.engine,
        )
        # Only a successful scan consumes trial credit.
        licensing.record_scan()
        return profile
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Scan failed: {e}")
