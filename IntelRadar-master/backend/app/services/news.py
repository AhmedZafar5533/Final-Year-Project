"""Live news signals via Google News RSS — no API key required.

Used to keep analyses current: search results are filtered to a recent window
and dated, so the model reasons over what is happening *now* rather than its
training cutoff.
"""

import html
import logging
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import feedparser
import trafilatura

from app.core.config import (
    NEWS_LANGUAGE,
    NEWS_LOOKBACK_DAYS,
    NEWS_MAX_ITEMS,
    NEWS_REGION,
)

logger = logging.getLogger("news")

_TAG_RE = re.compile(r"<[^>]+>")


def _clean(text: str) -> str:
    return html.unescape(_TAG_RE.sub(" ", text or "")).strip()


def _to_iso(published: str) -> Optional[str]:
    try:
        return parsedate_to_datetime(published).astimezone(timezone.utc).isoformat()
    except Exception:
        return None


def fetch_recent_news(
    query: str,
    max_items: Optional[int] = None,
    lookback_days: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return the most recent news items for ``query``, newest first."""
    if not query.strip():
        return []

    max_items = max_items or NEWS_MAX_ITEMS
    lookback_days = lookback_days or NEWS_LOOKBACK_DAYS
    lang2 = NEWS_LANGUAGE.split("-")[0]
    url = (
        "https://news.google.com/rss/search"
        f"?q={quote_plus(query)}&hl={NEWS_LANGUAGE}&gl={NEWS_REGION}&ceid={NEWS_REGION}:{lang2}"
    )

    feed = feedparser.parse(url)
    if getattr(feed, "bozo", 0) and not feed.entries:
        logger.warning("News feed error for %r: %s", query, getattr(feed, "bozo_exception", "?"))

    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    items: List[Dict[str, Any]] = []

    for entry in feed.entries:
        published = _to_iso(entry.get("published", ""))
        if published:
            try:
                if datetime.fromisoformat(published) < cutoff:
                    continue
            except Exception:
                pass

        source = ""
        raw_source = entry.get("source")
        if isinstance(raw_source, dict):
            source = raw_source.get("title", "")
        elif isinstance(raw_source, str):
            source = raw_source

        items.append(
            {
                "title": _clean(entry.get("title", "")),
                "url": entry.get("link", ""),
                "source": source,
                "published": published or "",
                "summary": _clean(entry.get("summary", ""))[:400],
            }
        )
        if len(items) >= max_items:
            break

    return items


def fetch_article_text(url: str, max_chars: int = 4000) -> str:
    """Extract the readable body of an article (best effort)."""
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return ""
        return (trafilatura.extract(downloaded, include_comments=False) or "")[:max_chars]
    except Exception as e:
        logger.debug("Article extraction failed for %s: %s", url, e)
        return ""


def format_news_for_prompt(items: List[Dict[str, Any]], max_chars: int = 6000) -> str:
    """Render news items as a dated block for the analysis prompt."""
    lines: List[str] = []
    for item in items:
        when = (item.get("published") or "")[:10]
        lines.append(
            f"- [{when}] {item.get('title', '')} ({item.get('source', '')}) {item.get('url', '')}"
        )
        if item.get("summary"):
            lines.append(f"  {item['summary']}")
    return "\n".join(lines)[:max_chars]
