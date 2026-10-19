"""Pydantic request models for the public API."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

# Scan engines:
#   fast  - Crawl4AI markdown only
#   live  - adds the Playwright browser agent (scroll + screenshot)
#   agent - LLM-driven browser agent (browser-use), best for interactive pages
EngineName = Literal["fast", "live", "agent"]


class UrlScanRequest(BaseModel):
    url: str
    engine: EngineName = "fast"


class VideoScanRequest(BaseModel):
    video_url: str


class NewsScanRequest(BaseModel):
    query: str
    max_items: Optional[int] = None
    lookback_days: Optional[int] = None


class CommentsScanRequest(BaseModel):
    video_url: str
    max_comments: Optional[int] = None


class AnalyzeRequest(BaseModel):
    raw_content: str
    competitor_name: Optional[str] = None
    source_type: str = "web_and_media"


class AutonomousScanRequest(BaseModel):
    competitor_name: str
    url: Optional[str] = None
    video_url: Optional[str] = None
    engine: EngineName = "live"


class CompareRequest(BaseModel):
    competitor_ids: List[str]
    scope: Literal["segment", "all"] = "segment"


class SettingsUpdate(BaseModel):
    """Fields the in-app Settings dialog may change. Omitted = unchanged."""

    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    monitor_enabled: Optional[bool] = None
    monitor_interval_minutes: Optional[int] = Field(None, ge=15, le=10080)
    alert_urls: Optional[List[str]] = None


class ValidateKeyRequest(BaseModel):
    api_key: Optional[str] = None
