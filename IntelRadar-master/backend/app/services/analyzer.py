import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.core import config

logger = logging.getLogger("analyzer")

# Retries per model before rolling over to the next model in the fallback chain.
MAX_ATTEMPTS_PER_MODEL = 2

# Substrings that mark a retryable overload error rather than a bad request.
_TRANSIENT_MARKERS = (
    "429",
    "500",
    "502",
    "503",
    "504",
    "unavailable",
    "overloaded",
    "high demand",
    "resource exhausted",
    "rate limit",
    "quota",
    "deadline",
    "timed out",
    "timeout",
    "temporarily",
)


class EmptyProfileError(RuntimeError):
    """The provider responded, but produced no usable intelligence."""


def _is_transient(err: Exception) -> bool:
    text = str(err).lower()
    return any(marker in text for marker in _TRANSIENT_MARKERS)

class PricingTier(BaseModel):
    plan: str
    price: str
    billing_period: str = "monthly/annual"
    highlights: List[str] = Field(default_factory=list)

class FeatureItem(BaseModel):
    feature: str
    category: str
    maturity: str = "Established"  # "Established" | "New" | "Beta"
    strategic_edge: str = ""

class ComplaintItem(BaseModel):
    issue: str
    severity: str = "Medium"  # "High" | "Medium" | "Low"
    source: str = "User Review / Video / Social"

class SwotAnalysis(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    opportunities: List[str]
    threats: List[str]

class RadarMetrics(BaseModel):
    feature_depth: int = Field(ge=0, le=100)
    pricing_pressure: int = Field(ge=0, le=100)
    user_sentiment: int = Field(ge=0, le=100)
    execution_velocity: int = Field(ge=0, le=100)
    retention_risk: int = Field(ge=0, le=100)

class MovementItem(BaseModel):
    date: str
    type: str  # "Pricing" | "Feature" | "Complaint" | "Marketing"
    headline: str
    impact: str

class CompetitorIntelligence(BaseModel):
    competitor_name: str
    tagline: str
    category: str
    segment: str  # canonical kebab-case market segment (see prompt)
    threat_level: str  # "CRITICAL" | "HIGH" | "MODERATE" | "LOW"
    threat_score: int  # 0 to 100
    pricing_tiers: List[PricingTier]
    key_features: List[FeatureItem]
    customer_complaints: List[ComplaintItem]
    swot_analysis: SwotAnalysis
    radar_metrics: RadarMetrics
    strategic_summary: str
    recent_movements: List[MovementItem]
    vulnerabilities_to_exploit: List[str]


def get_gemini_client():
    if not config.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured. Add it in Settings or backend/.env."
        )
    return genai.Client(api_key=config.GEMINI_API_KEY)


def _is_empty_profile(data: Dict[str, Any]) -> bool:
    """True when the model produced no usable intelligence at all."""
    lists_empty = not any(
        [
            data.get("pricing_tiers"),
            data.get("key_features"),
            data.get("customer_complaints"),
            data.get("recent_movements"),
            data.get("vulnerabilities_to_exploit"),
        ]
    )
    return lists_empty and not data.get("threat_score")


async def analyze_competitor_intel(
    raw_content: str,
    competitor_hint: Optional[str] = None,
    source_type: str = "web_and_media",
    known_segments: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Autonomous multi-agent intelligence extraction:
    - Pricing Parser Agent
    - Feature Gap & Maturity Agent
    - Sentiment & Complaint Scorer Agent
    - SWOT & Strategic War-Room Analyst Agent
    - Threat Radar Quantifier Agent
    """
    client = get_gemini_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    known_line = (
        "KNOWN MARKET SEGMENTS already tracked (reuse one EXACTLY if this company "
        "competes in it): " + ", ".join(known_segments)
        if known_segments
        else ""
    )
    
    system_instruction = """You are the Lead Intelligence Officer in the 'IntelRadar Autonomous War-Room'.
Your mission is to perform military-grade competitive reconnaissance on digital products, SaaS, and market players.
Analyze all provided raw data (scraped web markdown, browser element text, YouTube review transcripts, social feedback) and extract structured, actionable intelligence.

Be decisive, rigorous, and quantify metrics on a 0-100 scale:
- feature_depth: breadth and maturity of product features
- pricing_pressure: how aggressively low or flexible their pricing is (100 = intensely aggressive, 0 = exorbitantly expensive)
- user_sentiment: overall public satisfaction and creator love (100 = beloved, 0 = widespread backlash)
- execution_velocity: pace of shipping updates and AI integration
- retention_risk: risk of their users churning out to alternatives (100 = very high churn risk, 0 = lock-in monopoly)
- threat_level: CRITICAL (90-100 score), HIGH (70-89), MODERATE (40-69), LOW (0-39)

DATA QUALITY RULE: The raw data may be thin, may have partly failed to load, or may be missing entirely. When that happens you must STILL deliver a complete, decisive, best-effort profile using your own knowledge of the named company or product: fill every field, infer realistic pricing tiers and features for its category, and score confidently. Never return empty lists, zero scores, or "insufficient data" text unless the target is so obscure it cannot be identified at all.

MARKET SEGMENT: also return `segment` — a short, lowercase, hyphenated market segment (2-3 words) that groups products competing for the same buyers, e.g. "project-management", "llm-platforms", "cloud-databases", "food-delivery". Two products competing for the same customers MUST share the identical segment string. Do not invent a near-duplicate when an obvious existing segment applies.

Output pure JSON matching the requested schema strictly."""

    user_prompt = f"""
TARGET COMPETITOR HINT: {competitor_hint or "Auto-detect from text"}
DATA SOURCE TYPE: {source_type}
{known_line}
RAW COLLECTED DATA (CRAWL4AI / BROWSER DOM / YOUTUBE TRANSCRIPT):
---
{raw_content[:25000]}
---

Extract the full competitor intelligence profile now. If the data above is limited or empty, still produce a complete, decisive best-effort profile from your own knowledge of this company.

CURRENT DATE: {today}
RECENCY RULE: the raw data may contain dated news items and recent viewer comments. Treat those as the freshest signal and weight them heavily; treat undated or older material as historical context. Never describe 2024-or-earlier events as if they were current."""

    generation_config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        response_schema=CompetitorIntelligence,
        temperature=0.2,
    )

    empty_message = (
        "The scan gathered too little usable content to build a profile. "
        "Add the competitor's website URL and try again — Live scan reads dynamic pages best."
    )

    last_error: Optional[Exception] = None
    saw_empty_profile = False

    # Walk the model chain, retrying transient overloads before rolling over to
    # the next model. A single 503 from the primary model no longer fails a scan.
    for model in config.ANALYSIS_MODELS:
        for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=[user_prompt],
                    config=generation_config,
                )
                text = getattr(response, "text", None)
                if not text:
                    raise RuntimeError(f"Empty response from {model}")

                data = json.loads(text)
                if _is_empty_profile(data):
                    raise EmptyProfileError(empty_message)

                if model != config.ANALYSIS_MODELS[0]:
                    logger.info("Analysis recovered on fallback model %s", model)
                return data
            except EmptyProfileError as e:
                saw_empty_profile = True
                last_error = e
                logger.warning("Model %s returned an empty profile; trying next model", model)
                break
            except Exception as e:
                last_error = e
                transient = _is_transient(e)
                logger.warning(
                    "Model %s attempt %d/%d failed (%s): %s",
                    model,
                    attempt,
                    MAX_ATTEMPTS_PER_MODEL,
                    "transient" if transient else "permanent",
                    e,
                )
                if transient and attempt < MAX_ATTEMPTS_PER_MODEL:
                    delay = min(6.0, 0.7 * (2 ** (attempt - 1))) + random.uniform(0, 0.5)
                    await asyncio.sleep(delay)
                    continue
                break

    if saw_empty_profile:
        raise EmptyProfileError(empty_message)
    raise RuntimeError(
        "Every analysis model was unavailable — the provider is overloaded. "
        f"Please retry in a moment. Last error: {last_error}"
    )
