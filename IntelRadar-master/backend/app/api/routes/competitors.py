"""CRUD for stored competitor profiles."""

from fastapi import APIRouter, HTTPException

from app.services.cache import (
    delete_competitor,
    get_all_competitors,
    get_competitor_by_id,
)

router = APIRouter(prefix="/api/competitors", tags=["competitors"])


@router.get("")
async def list_competitors():
    """Every competitor captured by a real scan."""
    return get_all_competitors()


@router.get("/{comp_id}")
async def get_competitor(comp_id: str):
    item = get_competitor_by_id(comp_id)
    if not item:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return item


@router.delete("/{comp_id}")
async def remove_competitor(comp_id: str):
    if not delete_competitor(comp_id):
        raise HTTPException(status_code=404, detail="Competitor not found")
    return {"status": "deleted", "id": comp_id}
