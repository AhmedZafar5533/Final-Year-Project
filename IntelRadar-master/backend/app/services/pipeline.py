"""The autonomous scan pipeline, shared by the API route and the scheduler."""

import datetime
import logging
from typing import Any, Dict, List, Optional

from app.services.analyzer import analyze_competitor_intel
from app.services.browser_agent import run_browser_task
from app.services.cache import get_all_competitors, get_competitor_by_id, save_competitor
from app.services.media import process_youtube_video
from app.services.monitor import diff_profiles
from app.services.news import fetch_recent_news, format_news_for_prompt
from app.services.scraper import capture_browser_agent, crawl_url
from app.services.segments import normalize, segment_key
from app.services.youtube_comments import (
    fetch_recent_comments,
    format_comments_for_prompt,
)

logger = logging.getLogger("pipeline")


def competitor_id(name: str) -> str:
    return name.lower().replace(" ", "_")


async def _gather_website(
    url: Optional[str],
    engine: str,
    raw_sections: List[str],
) -> Optional[str]:
    """Collect website intelligence for the requested engine."""
    if not url:
        return None

    if engine == "agent":
        try:
            report = await run_browser_task(url)
            raw_sections.append(
                f"=== AUTONOMOUS BROWSER AGENT REPORT ({url}) ===\n{report[:12000]}"
            )
            return None
        except Exception as e:
            logger.warning("Browser agent failed for %s: %s", url, e)
            raw_sections.append(f"Browser agent notice: {e}")

    try:
        crawl = await crawl_url(url)
        raw_sections.append(
            f"=== OFFICIAL WEBSITE ({url}) ===\n{crawl.get('markdown', '')[:12000]}"
        )
    except Exception as e:
        raw_sections.append(f"Web crawl notice: {e}")

    if engine == "live":
        try:
            browser = await capture_browser_agent(url)
            if browser.get("full_text"):
                raw_sections.append(
                    f"=== BROWSER AGENT EXTRACTED DOM ===\n{browser['full_text'][:6000]}"
                )
            return browser.get("screenshot_url")
        except Exception:
            pass

    return None


async def run_scan(
    competitor_name: str,
    url: Optional[str] = None,
    video_url: Optional[str] = None,
    engine: str = "live",
) -> Dict[str, Any]:
    """Gather web + news + video/comments, analyse, diff and persist.

    Returns the saved profile. Raises whatever the analyzer raises (the caller
    maps that to an HTTP status).
    """
    raw_sections: List[str] = []

    # 1. Website.
    screenshot_url = await _gather_website(url, engine, raw_sections)

    # 2. Live news signals (always, keyed on the competitor name).
    news_items: List[Dict[str, Any]] = []
    try:
        news_items = fetch_recent_news(competitor_name)
        if news_items:
            raw_sections.append(
                f"=== RECENT NEWS ({len(news_items)} items, newest first) ===\n"
                f"{format_news_for_prompt(news_items)}"
            )
    except Exception as e:
        logger.warning("News fetch failed for %r: %s", competitor_name, e)

    # 3. YouTube transcript + newest comments.
    if video_url:
        try:
            video = await process_youtube_video(video_url)
            raw_sections.append(
                f"=== YOUTUBE VIDEO REVIEW TRANSCRIPT ({video.get('title')}) ===\n"
                f"Duration: {video.get('duration')}s\n"
                f"Transcript:\n{video.get('transcript', '')[:10000]}"
            )
        except Exception as e:
            raw_sections.append(f"Video transcription notice: {e}")

        try:
            comments = fetch_recent_comments(video_url)
            if comments:
                raw_sections.append(
                    f"=== YOUTUBE COMMENTS — newest first ({len(comments)}) ===\n"
                    f"{format_comments_for_prompt(comments)}"
                )
        except Exception as e:
            logger.warning("Comments fetch failed: %s", e)

    if not raw_sections:
        raw_sections.append(
            f"Competitor intelligence request for target company: {competitor_name}"
        )

    # 4. Multi-agent analysis. Existing segments are passed so the model reuses
    #    this taxonomy instead of inventing near-duplicate labels.
    known_segments = sorted(
        {segment_key(profile) for profile in get_all_competitors() if segment_key(profile)}
    )
    analysis = await analyze_competitor_intel(
        raw_content="\n\n".join(raw_sections),
        competitor_hint=competitor_name,
        source_type="autonomous_multimodal_ingestion",
        known_segments=known_segments,
    )

    # 5. Attach metadata.
    comp_id = competitor_id(competitor_name)
    analysis["id"] = comp_id
    analysis["last_scanned_at"] = datetime.datetime.utcnow().isoformat()
    analysis["engine"] = engine
    analysis["segment"] = normalize(analysis.get("segment")) or normalize(analysis.get("category"))
    analysis["recent_news"] = news_items
    if screenshot_url:
        analysis["live_screenshot_url"] = screenshot_url
    if url:
        analysis["target_url"] = url
    if video_url:
        analysis["target_video_url"] = video_url

    # 6. Diff against the previous snapshot so the UI/alerts can show what moved.
    previous = get_competitor_by_id(comp_id)
    analysis["changes"] = diff_profiles(previous, analysis) if previous else []

    return save_competitor(analysis)
