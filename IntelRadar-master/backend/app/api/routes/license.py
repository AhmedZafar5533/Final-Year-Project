"""Trial status and license activation."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core import licensing

router = APIRouter(prefix="/api/license", tags=["license"])


class ActivateRequest(BaseModel):
    license_key: str


@router.get("")
async def get_license() -> dict:
    """Current trial/license state (the key itself is never returned)."""
    return licensing.status()


@router.post("/activate")
async def activate(req: ActivateRequest) -> dict:
    """Validate and store a license key."""
    try:
        return licensing.activate(req.license_key)
    except licensing.LicenseError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/refresh")
async def refresh_license() -> dict:
    """Re-check the stored key (used after the offline grace period)."""
    try:
        return licensing.revalidate()
    except licensing.LicenseError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("")
async def remove_license() -> dict:
    """Forget the stored key. Trial usage is retained."""
    return licensing.deactivate()
