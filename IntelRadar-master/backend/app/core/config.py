"""Environment-driven configuration.

This module is the single place that reads environment variables. Import
settings from here rather than calling ``os.environ`` directly so everything
stays in one reviewable file.
"""

import os
from collections.abc import Callable
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# backend/ root: app/core/config.py -> app/core -> app -> backend
BASE_DIR = Path(__file__).resolve().parents[2]

# Load backend/.env regardless of the current working directory.
load_dotenv(BASE_DIR / ".env")
from app.core.paths import app_dirs, migrate_legacy_data

# --- Storage -------------------------------------------------------------
# Runtime data lives in the OS user-data directory (override with
# INTELRADAR_DATA_DIR), never inside the application bundle. Existing data
# under backend/ is copied over once on first run.
_DIRS = app_dirs()
DATA_DIR = _DIRS["data"]
MEDIA_DIR = _DIRS["media"]
SCREENSHOTS_DIR = _DIRS["screenshots"]

for _directory in (DATA_DIR, MEDIA_DIR, SCREENSHOTS_DIR):
    _directory.mkdir(parents=True, exist_ok=True)

migrate_legacy_data(BASE_DIR, _DIRS)

from app.core.settings import load_persisted

# Settings saved from the app override environment values; the environment
# remains the fallback for scripted/dev deployments.
_PERSISTED = load_persisted()


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: Any) -> int:
    return int(value)  # raises ValueError for bad input; callers fall back


def _as_list(value: Any) -> list[str]:
    if isinstance(value, (list, tuple)):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _setting(key: str, default: Any, cast: Callable[[Any], Any] = str) -> Any:
    """Persisted value first, then the environment, then the default."""
    if key in _PERSISTED and _PERSISTED[key] is not None:
        try:
            return cast(_PERSISTED[key])
        except (TypeError, ValueError):
            pass
    raw = os.environ.get(key)
    if raw is not None and raw != "":
        try:
            return cast(raw)
        except (TypeError, ValueError):
            pass
    return default


# --- LLM (Google Gemini) -------------------------------------------------
GEMINI_API_KEY = str(_setting("GEMINI_API_KEY", "")).strip()

# Primary analysis model.
DEFAULT_MODEL = str(_setting("GEMINI_MODEL", "gemini-2.5-flash"))

# Tried in order when a model is overloaded (503), rate-limited (429), or
# otherwise unavailable. Override with a comma-separated GEMINI_FALLBACK_MODELS.
FALLBACK_MODELS = _as_list(
    _setting(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash-lite,gemini-2.0-flash,gemini-2.0-flash-lite,gemini-2.5-pro",
    )
)

# Ordered, de-duplicated model chain used by the analyzer.
ANALYSIS_MODELS = list(dict.fromkeys([DEFAULT_MODEL, *FALLBACK_MODELS]))

# --- Browser agent (browser-use) -----------------------------------------
# Model used by the optional LLM-driven browser agent engine.
BROWSER_AGENT_MODEL = str(_setting("BROWSER_AGENT_MODEL", DEFAULT_MODEL))
# Upper bound on agent steps; higher means deeper navigation, more time/tokens.
BROWSER_AGENT_MAX_STEPS = int(os.environ.get("BROWSER_AGENT_MAX_STEPS", "25"))
# Hard wall-clock limit (seconds) for a single agent run.
BROWSER_AGENT_TIMEOUT = int(os.environ.get("BROWSER_AGENT_TIMEOUT", "300"))

# --- Live signals (news + YouTube comments) ------------------------------
NEWS_MAX_ITEMS = int(os.environ.get("NEWS_MAX_ITEMS", "8"))
NEWS_LOOKBACK_DAYS = int(os.environ.get("NEWS_LOOKBACK_DAYS", "120"))
NEWS_REGION = os.environ.get("NEWS_REGION", "US")
NEWS_LANGUAGE = os.environ.get("NEWS_LANGUAGE", "en-US")
COMMENTS_MAX = int(os.environ.get("COMMENTS_MAX", "40"))

# --- Continuous monitoring & alerts --------------------------------------
# Opt-in: periodically re-scan tracked competitors and diff the results.
MONITOR_ENABLED = _setting("MONITOR_ENABLED", False, _as_bool)
MONITOR_INTERVAL_MINUTES = int(_setting("MONITOR_INTERVAL_MINUTES", 360, _as_int))
# Comma-separated Apprise URLs (e.g. discord://, slack://, mailto://).
ALERT_URLS = _as_list(_setting("ALERT_URLS", ""))

# --- HTTP ----------------------------------------------------------------
# Comma-separated allowed origins. The desktop backend only ever serves the
# bundled app, so the default is loopback rather than "*". Set CORS_ORIGINS="*"
# (or a custom list) for other setups.
DEFAULT_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001"
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

# Optional shared secret for the local API. When set, every /api request except
# the health probe must send ``X-IntelRadar-Token`` (or a Bearer token). The
# desktop shell generates one per launch so other local apps and websites
# cannot drive the engine while it runs.
API_TOKEN = os.environ.get("API_TOKEN", "")


def apply_settings(values: dict) -> None:
    """Apply saved settings in-process, without restarting the backend."""
    global GEMINI_API_KEY, DEFAULT_MODEL, ANALYSIS_MODELS, BROWSER_AGENT_MODEL
    global MONITOR_ENABLED, MONITOR_INTERVAL_MINUTES, ALERT_URLS

    if "GEMINI_API_KEY" in values:
        GEMINI_API_KEY = str(values["GEMINI_API_KEY"] or "").strip()

    if "GEMINI_MODEL" in values and str(values["GEMINI_MODEL"] or "").strip():
        DEFAULT_MODEL = str(values["GEMINI_MODEL"]).strip()

    ANALYSIS_MODELS = list(dict.fromkeys([DEFAULT_MODEL, *FALLBACK_MODELS]))
    BROWSER_AGENT_MODEL = DEFAULT_MODEL

    if "MONITOR_ENABLED" in values:
        MONITOR_ENABLED = _as_bool(values["MONITOR_ENABLED"])
    if "MONITOR_INTERVAL_MINUTES" in values:
        MONITOR_INTERVAL_MINUTES = max(15, min(10080, _as_int(values["MONITOR_INTERVAL_MINUTES"])))
    if "ALERT_URLS" in values:
        ALERT_URLS = _as_list(values["ALERT_URLS"])
