"""Head-to-head comparison endpoint.

By default only competitors in the *same market segment* are compared, so two
unrelated products are never placed on one radar. Pass ``scope="all"`` to
compare across segments deliberately.
"""

from fastapi import APIRouter

from app.api.schemas import CompareRequest
from app.services.cache import get_all_competitors
from app.services.segments import segment_key

router = APIRouter(prefix="/api", tags=["compare"])

RADAR_METRICS = [
    ("Feature Depth", "feature_depth"),
    ("Pricing Pressure", "pricing_pressure"),
    ("User Sentiment", "user_sentiment"),
    ("Execution Velocity", "execution_velocity"),
    ("Retention Risk", "retention_risk"),
]

MAX_SERIES = 3


@router.post("/compare")
async def compare(req: CompareRequest):
    """Radar data for the target competitor plus same-segment peers."""
    items = get_all_competitors()

    requested_keys = {key.lower() for key in req.competitor_ids if key}
    matched = [
        item
        for item in items
        if (item.get("id") or "").lower() in requested_keys
        or (item.get("competitor_name") or "").lower() in requested_keys
    ]

    if matched:
        target = matched[0]
    elif not req.competitor_ids:
        # No ids supplied: default to the first tracked competitor.
        target = items[0] if items else None
    else:
        # Ids were supplied but matched nothing — return nothing rather than
        # silently comparing the wrong competitor.
        return {"competitors": [], "radar_data": [], "segment": ""}

    if target is None:
        return {"competitors": [], "radar_data": [], "segment": ""}

    target_segment = segment_key(target)

    peers = [item for item in items if item.get("id") != target.get("id")]
    if req.scope == "segment":
        # Never group on an empty key: two profiles with neither a segment nor
        # a category would otherwise match each other and be compared.
        peers = [
            item
            for item in peers
            if target_segment and segment_key(item) == target_segment
        ]

    selected = [target, *peers[: MAX_SERIES - 1]]

    radar_data = [
        {
            "metric": label,
            **{
                comp["competitor_name"]: comp.get("radar_metrics", {}).get(key, 50)
                for comp in selected
            },
        }
        for label, key in RADAR_METRICS
    ]

    return {"competitors": selected, "radar_data": radar_data, "segment": target_segment}
