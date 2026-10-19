"""Platform-appropriate storage locations.

Packaged desktop builds must never write inside the application bundle:
macOS ``.app`` bundles, Windows ``Program Files`` and read-only Linux installs
will reject it. Runtime data therefore lives in the OS user-data directory and
can be relocated with ``INTELRADAR_DATA_DIR``.

Existing development data under ``backend/`` is copied over once, so switching
to the new location does not lose captured competitors or screenshots.
"""

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List

APP_DIR_NAME = "IntelRadar"


def _default_root() -> Path:
    """Return the base user-data directory for the current platform."""
    override = os.environ.get("INTELRADAR_DATA_DIR")
    if override:
        return Path(override).expanduser().resolve()

    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
        return Path(base or Path.home()) / APP_DIR_NAME

    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_DIR_NAME

    # Linux and other XDG-compliant systems.
    base = os.environ.get("XDG_DATA_HOME") or (Path.home() / ".local" / "share")
    return Path(base) / APP_DIR_NAME


def app_dirs() -> Dict[str, Path]:
    """Resolved runtime directories (created by the caller)."""
    root = _default_root()
    return {
        "root": root,
        "data": root / "data",
        "media": root / "media_storage",
        "screenshots": root / "screenshots",
    }


def _copy_missing(source: Path, target: Path) -> None:
    """Copy files that do not exist yet, never overwriting newer data."""
    if not source.exists():
        return

    if source.is_file():
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        return

    for item in source.rglob("*"):
        if not item.is_file():
            continue
        destination = target / item.relative_to(source)
        if not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, destination)


def _merge_competitor_store(legacy_file: Path, target_file: Path) -> None:
    """Union two JSON stores, keeping the newest scan for duplicate ids.

    This runs on every startup rather than once, so a development backend
    still writing to the old in-repo location never silently loses scans
    during the transition to the user-data directory.
    """
    if not legacy_file.exists():
        return

    try:
        legacy: List[Dict[str, Any]] = json.loads(legacy_file.read_text(encoding="utf-8"))
        target: List[Dict[str, Any]] = (
            json.loads(target_file.read_text(encoding="utf-8"))
            if target_file.exists()
            else []
        )
    except (OSError, json.JSONDecodeError):
        return

    if not isinstance(legacy, list) or not isinstance(target, list):
        return

    def scanned_at(item: Dict[str, Any]) -> str:
        return str(item.get("last_scanned_at") or "")

    by_id = {item.get("id"): item for item in target if item.get("id")}
    changed = False

    for item in legacy:
        item_id = item.get("id")
        if not item_id:
            continue
        current = by_id.get(item_id)
        if current is None:
            target.append(item)
            by_id[item_id] = item
            changed = True
        elif scanned_at(item) > scanned_at(current):
            target[target.index(current)] = item
            by_id[item_id] = item
            changed = True

    if changed:
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(json.dumps(target, indent=2), encoding="utf-8")


def migrate_legacy_data(legacy_root: Path, dirs: Dict[str, Path]) -> None:
    """Non-destructive migration from the old in-repo data directories."""
    if legacy_root.resolve() == dirs["root"].resolve():
        return

    _merge_competitor_store(
        legacy_root / "data" / "competitors.json",
        dirs["data"] / "competitors.json",
    )
    # Screenshot paths are stored in profiles, so existing captures must follow.
    _copy_missing(legacy_root / "screenshots", dirs["screenshots"])
