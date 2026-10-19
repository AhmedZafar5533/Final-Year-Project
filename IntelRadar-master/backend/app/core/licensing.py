"""Trial and license activation.

The desktop product ships with a fixed number of free full scans. A license
key from the store (Lemon Squeezy-compatible) unlocks unlimited scans.

Validation happens online at activation and whenever the user re-checks; the
result is cached for ``OFFLINE_GRACE_DAYS`` so the app keeps working offline.

This is honest-buyer enforcement, not DRM: the app runs locally and its source
is open, so a determined user can bypass it. Keep it frictionless.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import httpx

from app.core.paths import app_dirs

logger = logging.getLogger("licensing")

LICENSE_FILE = app_dirs()["root"] / "license.json"
VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate"

# Free full scans before a license is required.
TRIAL_SCANS = int(os.environ.get("INTELRADAR_TRIAL_SCANS", "5"))
# How long an already-validated license keeps working offline.
OFFLINE_GRACE_DAYS = int(os.environ.get("INTELRADAR_LICENSE_GRACE_DAYS", "14"))
# Development escape hatch (also used by the test suite).
BYPASS = os.environ.get("INTELRADAR_LICENSE_BYPASS", "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}


class LicenseError(Exception):
    """Raised when activation cannot be completed."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def load_state() -> Dict[str, Any]:
    try:
        data = json.loads(LICENSE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except FileNotFoundError:
        return {}
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read %s: %s", LICENSE_FILE, exc)
        return {}


def save_state(state: Dict[str, Any]) -> None:
    LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
    LICENSE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    try:
        os.chmod(LICENSE_FILE, 0o600)
    except OSError:
        # Not supported on all filesystems (Windows); not fatal.
        pass


def _is_licensed(state: Dict[str, Any]) -> bool:
    """True when a validated key exists and is still inside the offline grace."""
    if BYPASS:
        return True
    if not state.get("license_key") or not state.get("valid"):
        return False

    last = state.get("last_validated_at")
    if not last:
        return False
    try:
        last_dt = datetime.fromisoformat(last)
    except ValueError:
        return False
    if last_dt.tzinfo is None:
        last_dt = last_dt.replace(tzinfo=timezone.utc)

    return _now() - last_dt <= timedelta(days=OFFLINE_GRACE_DAYS)


def status() -> Dict[str, Any]:
    """License/trial state for the UI. Never returns the full key."""
    state = load_state()
    licensed = _is_licensed(state)
    used = max(0, int(state.get("trial_scans_used") or 0))
    remaining = max(0, TRIAL_SCANS - used)
    key = str(state.get("license_key") or "")

    return {
        "licensed": licensed,
        "bypass": BYPASS,
        "trial_limit": TRIAL_SCANS,
        "trial_used": used,
        "trial_remaining": remaining,
        "can_scan": licensed or remaining > 0,
        "license_key_hint": f"…{key[-4:]}" if len(key) >= 4 else ("set" if key else ""),
        "last_validated_at": state.get("last_validated_at"),
        "offline_grace_days": OFFLINE_GRACE_DAYS,
        "store": "lemonsqueezy",
    }


def can_scan() -> bool:
    return bool(status()["can_scan"])


def record_scan() -> Dict[str, Any]:
    """Consume one trial scan after a successful full scan."""
    state = load_state()
    if _is_licensed(state):
        return status()

    state["trial_scans_used"] = max(0, int(state.get("trial_scans_used") or 0)) + 1
    save_state(state)
    logger.info("Trial scan consumed (%s/%s)", state["trial_scans_used"], TRIAL_SCANS)
    return status()


def _validate_remote(license_key: str) -> Dict[str, Any]:
    try:
        response = httpx.post(VALIDATE_URL, data={"license_key": license_key}, timeout=15)
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        logger.warning("License validation failed: %s", exc)
        raise LicenseError(
            "Could not reach the license server. Check your connection and try again."
        ) from exc

    valid = bool(payload.get("valid"))
    key_info = payload.get("license_key") or {}
    key_status = (key_info.get("status") or "").lower()

    if not valid or (key_status and key_status != "active"):
        raise LicenseError(
            "That license key is not active. Check the key, or contact support if this is unexpected."
        )

    return key_info


def activate(license_key: str) -> Dict[str, Any]:
    """Validate a key online and persist it for offline use."""
    key = license_key.strip()
    if not key:
        raise LicenseError("Enter a license key.")

    info = _validate_remote(key)
    state = load_state()
    state.update(
        {
            "license_key": key,
            "valid": True,
            "last_validated_at": _now().isoformat(),
            "product_id": info.get("product_id"),
            "store_id": info.get("store_id"),
        }
    )
    save_state(state)
    logger.info("License activated")
    return status()


def revalidate() -> Dict[str, Any]:
    """Re-check the stored key online (used when the grace period expired)."""
    state = load_state()
    key = str(state.get("license_key") or "")
    if not key:
        raise LicenseError("No license key is saved.")

    info = _validate_remote(key)
    state.update(
        {
            "valid": True,
            "last_validated_at": _now().isoformat(),
            "product_id": info.get("product_id"),
            "store_id": info.get("store_id"),
        }
    )
    save_state(state)
    return status()


def deactivate() -> Dict[str, Any]:
    """Forget the stored key (trial usage is retained)."""
    state = load_state()
    state.pop("license_key", None)
    state["valid"] = False
    state.pop("last_validated_at", None)
    save_state(state)
    return status()
