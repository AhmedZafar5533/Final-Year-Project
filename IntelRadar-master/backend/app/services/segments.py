"""Market-segment grouping.

Only competitors that serve the same buyers should be compared. Each profile
carries a canonical, kebab-case ``segment``; when a profile predates that field
we fall back to its free-text ``category``.
"""

import re
from typing import Any, Dict, Optional

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normalize(value: Optional[str]) -> str:
    """Lowercase, hyphenate and trim a label into a stable key."""
    if not value:
        return ""
    return _NON_ALNUM.sub("-", value.strip().lower()).strip("-")


def segment_key(profile: Dict[str, Any]) -> str:
    """Canonical grouping key for a profile (``segment`` preferred)."""
    return normalize(profile.get("segment")) or normalize(profile.get("category"))
