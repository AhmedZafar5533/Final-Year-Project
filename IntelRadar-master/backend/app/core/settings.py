"""Persisted user settings.

Environment variables remain the deployment defaults, but values saved here
(from the in-app Settings dialog) take precedence so the desktop app does not
need a restart or a hand-edited ``.env`` file.

The file lives in the OS user-data directory (see ``app.core.paths``) and is
written with owner-only permissions because it holds the Gemini API key.
"""

import json
import logging
import os
from typing import Any, Dict

from app.core.paths import app_dirs

logger = logging.getLogger("settings")

SETTINGS_FILE = app_dirs()["root"] / "settings.json"

# Settings the UI is allowed to change. Anything else (CORS, API token, agent
# step limits) stays environment-driven.
EDITABLE_KEYS = (
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "MONITOR_ENABLED",
    "MONITOR_INTERVAL_MINUTES",
    "ALERT_URLS",
)


def load_persisted() -> Dict[str, Any]:
    """Read the settings file, returning an empty dict when absent/invalid."""
    try:
        data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except FileNotFoundError:
        return {}
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read %s: %s", SETTINGS_FILE, exc)
        return {}


def save_persisted(values: Dict[str, Any]) -> Dict[str, Any]:
    """Merge ``values`` into the settings file and return the full store."""
    current = load_persisted()
    current.update({key: value for key, value in values.items() if key in EDITABLE_KEYS})

    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(current, indent=2), encoding="utf-8")
    try:
        os.chmod(SETTINGS_FILE, 0o600)
    except OSError:
        # Windows and some filesystems do not support chmod; not fatal.
        pass

    return current
