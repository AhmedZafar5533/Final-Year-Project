"""Change detection between consecutive scans of the same competitor."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger("monitor")

MAX_CHANGES = 15


def _tiers(profile: Dict[str, Any]) -> Dict[str, str]:
    return {
        tier.get("plan", ""): tier.get("price", "")
        for tier in (profile.get("pricing_tiers") or [])
        if isinstance(tier, dict)
    }


def _names(profile: Dict[str, Any], field: str, key: str) -> set:
    return {
        item.get(key, "")
        for item in (profile.get(field) or [])
        if isinstance(item, dict) and item.get(key)
    }


def diff_profiles(old: Dict[str, Any], new: Dict[str, Any]) -> List[Dict[str, str]]:
    """Return a list of notable changes from ``old`` to ``new``.

    Each change is ``{"kind", "severity", "summary"}``. Returns an empty list
    when nothing meaningful changed.
    """
    changes: List[Dict[str, str]] = []

    # Threat posture.
    old_score = old.get("threat_score") or 0
    new_score = new.get("threat_score") or 0
    if old.get("threat_level") != new.get("threat_level") or abs(new_score - old_score) >= 10:
        direction = "up" if new_score > old_score else "down"
        changes.append(
            {
                "kind": "threat",
                "severity": "high",
                "summary": (
                    f"Threat {direction}: {old.get('threat_level')} ({old_score}) "
                    f"→ {new.get('threat_level')} ({new_score})"
                ),
            }
        )

    # Pricing.
    old_tiers, new_tiers = _tiers(old), _tiers(new)
    for plan in sorted(set(new_tiers) - set(old_tiers)):
        changes.append(
            {"kind": "pricing", "severity": "medium", "summary": f"New plan: {plan} ({new_tiers[plan]})"}
        )
    for plan in sorted(set(old_tiers) - set(new_tiers)):
        changes.append({"kind": "pricing", "severity": "medium", "summary": f"Plan removed: {plan}"})
    for plan in sorted(set(old_tiers) & set(new_tiers)):
        if old_tiers[plan] != new_tiers[plan]:
            changes.append(
                {
                    "kind": "pricing",
                    "severity": "high",
                    "summary": f"{plan} price changed: {old_tiers[plan]} → {new_tiers[plan]}",
                }
            )

    # Features.
    for feature in sorted(_names(new, "key_features", "feature") - _names(old, "key_features", "feature")):
        changes.append({"kind": "feature", "severity": "low", "summary": f"New feature: {feature}"})
    for feature in sorted(_names(old, "key_features", "feature") - _names(new, "key_features", "feature")):
        changes.append({"kind": "feature", "severity": "low", "summary": f"Feature dropped: {feature}"})

    # Complaints.
    for issue in sorted(_names(new, "customer_complaints", "issue") - _names(old, "customer_complaints", "issue")):
        changes.append({"kind": "complaint", "severity": "medium", "summary": f"New complaint: {issue}"})

    # Fresh news coverage.
    old_urls = {item.get("url", "") for item in (old.get("recent_news") or [])}
    for item in new.get("recent_news") or []:
        if item.get("url") and item["url"] not in old_urls:
            changes.append(
                {
                    "kind": "news",
                    "severity": "low",
                    "summary": f"New coverage: {item.get('title', '')[:90]}",
                }
            )

    return changes[:MAX_CHANGES]
