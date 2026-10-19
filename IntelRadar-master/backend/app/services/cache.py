import json
import logging
from typing import List, Dict, Any, Optional

from app.core.config import DATA_DIR

logger = logging.getLogger("cache")
STORAGE_FILE = DATA_DIR / "competitors.json"


def get_all_competitors() -> List[Dict[str, Any]]:
    """
    Returns every competitor that has been captured by a real scan.
    The store starts empty and is only populated by the autonomous
    ingestion pipeline, so no canned/demo profiles are ever surfaced.
    """
    if not STORAGE_FILE.exists():
        return []

    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error reading competitors file: {e}")
        return []


def save_competitor(competitor_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adds or updates a competitor profile in the storage file.
    """
    items = get_all_competitors()

    # Generate an ID if not present
    name = competitor_data.get("competitor_name", "unnamed").lower().replace(" ", "_")
    comp_id = competitor_data.get("id") or name
    competitor_data["id"] = comp_id

    # Check if competitor exists, update it or append
    updated = False
    for i, item in enumerate(items):
        if item.get("id") == comp_id or item.get("competitor_name", "").lower() == competitor_data.get("competitor_name", "").lower():
            items[i] = {**item, **competitor_data}
            updated = True
            break

    if not updated:
        items.insert(0, competitor_data)

    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

    return competitor_data


def get_competitor_by_id(comp_id: str) -> Optional[Dict[str, Any]]:
    items = get_all_competitors()
    for item in items:
        if item.get("id") == comp_id:
            return item
    return None


def delete_competitor(comp_id: str) -> bool:
    items = get_all_competitors()
    initial_len = len(items)
    filtered = [item for item in items if item.get("id") != comp_id]
    if len(filtered) < initial_len:
        with open(STORAGE_FILE, "w", encoding="utf-8") as f:
            json.dump(filtered, f, indent=2)
        return True
    return False
