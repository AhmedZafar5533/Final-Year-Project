"""Fresh viewer sentiment from YouTube comments — no API key required.

The newest comments are pulled for a review video so the sentiment layer sees
current reactions, not just the (older) video narration.
"""

import logging
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

from youtube_comment_downloader import SORT_BY_RECENT, YoutubeCommentDownloader

from app.core.config import COMMENTS_MAX

logger = logging.getLogger("youtube_comments")


def extract_video_id(value: str) -> str:
    """Accept a full YouTube URL, a short link, a shorts link, or a bare id."""
    value = (value or "").strip()
    if not value:
        return ""
    if "youtube.com" not in value and "youtu.be" not in value:
        return value

    parsed = urlparse(value)
    host = parsed.hostname or ""
    if "youtu.be" in host:
        return parsed.path.lstrip("/").split("/")[0]
    if parsed.path.startswith("/shorts/"):
        parts = parsed.path.split("/")
        return parts[2] if len(parts) > 2 else ""
    query = parse_qs(parsed.query)
    if "v" in query:
        return query["v"][0]
    return ""


def fetch_recent_comments(
    video_url_or_id: str,
    max_comments: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return the newest comments for a video (empty list on failure)."""
    limit = max_comments or COMMENTS_MAX
    video_id = extract_video_id(video_url_or_id)
    if not video_id:
        return []

    comments: List[Dict[str, Any]] = []
    try:
        downloader = YoutubeCommentDownloader()
        for comment in downloader.get_comments(video_id, sort_by=SORT_BY_RECENT):
            comments.append(
                {
                    "text": (comment.get("text") or "").strip()[:1000],
                    "author": comment.get("author", ""),
                    "votes": comment.get("votes", ""),
                    "time": comment.get("time", ""),
                }
            )
            if len(comments) >= limit:
                break
    except Exception as e:
        logger.warning("Failed to fetch comments for %s: %s", video_id, e)

    return comments


def format_comments_for_prompt(comments: List[Dict[str, Any]], max_chars: int = 6000) -> str:
    lines = [
        f"- ({c.get('time', '')}, {c.get('votes', '')} votes) {c.get('text', '')}"
        for c in comments
    ]
    return "\n".join(lines)[:max_chars]
