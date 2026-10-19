"""Read and update persisted user settings.

The desktop app edits these from the in-app Settings dialog. Values are stored
in ``settings.json`` inside the OS user-data directory and applied in-process,
so scans, monitoring and alerts pick them up without a restart.
"""

from fastapi import APIRouter

from app.api.schemas import SettingsUpdate, ValidateKeyRequest
from app.core import config, licensing
from app.core.settings import SETTINGS_FILE, save_persisted
from app.services import scheduler

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _payload() -> dict:
    key = config.GEMINI_API_KEY
    return {
        "gemini_api_key_set": bool(key),
        "gemini_api_key_hint": f"…{key[-4:]}" if len(key) >= 4 else ("set" if key else ""),
        "gemini_model": config.DEFAULT_MODEL,
        "monitor_enabled": config.MONITOR_ENABLED,
        "monitor_interval_minutes": config.MONITOR_INTERVAL_MINUTES,
        "alert_urls": config.ALERT_URLS,
        "data_dir": str(config.DATA_DIR),
        "settings_file": str(SETTINGS_FILE),
        "license": licensing.status(),
    }


@router.get("")
async def get_settings() -> dict:
    """Current effective settings. The API key itself is never returned."""
    return _payload()


@router.put("")
async def update_settings(update: SettingsUpdate) -> dict:
    """Persist changed settings and apply them without a restart."""
    values: dict = {}

    if update.gemini_api_key is not None:
        values["GEMINI_API_KEY"] = update.gemini_api_key.strip()
    if update.gemini_model is not None:
        values["GEMINI_MODEL"] = update.gemini_model.strip()
    if update.monitor_enabled is not None:
        values["MONITOR_ENABLED"] = update.monitor_enabled
    if update.monitor_interval_minutes is not None:
        values["MONITOR_INTERVAL_MINUTES"] = update.monitor_interval_minutes
    if update.alert_urls is not None:
        values["ALERT_URLS"] = [url.strip() for url in update.alert_urls if url.strip()]

    save_persisted(values)
    config.apply_settings(values)
    scheduler.reload()

    return _payload()


@router.post("/validate-key")
def validate_key(body: ValidateKeyRequest | None = None) -> dict:
    """Check a Gemini key against Google without consuming tokens.

    The model list endpoint is free and needs no generation quota, which makes
    it a good connectivity/key check for onboarding.
    """
    candidate = ((body.api_key if body else None) or config.GEMINI_API_KEY or "").strip()
    if not candidate:
        return {"valid": False, "detail": "No API key provided."}

    try:
        from google import genai

        client = genai.Client(api_key=candidate)
        next(iter(client.models.list()), None)
        return {"valid": True, "detail": "Key accepted by Google AI."}
    except Exception as exc:  # network, quota or invalid-key errors
        return {"valid": False, "detail": str(exc)[:240]}
