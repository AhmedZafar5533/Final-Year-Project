"""Monitoring endpoint: schedule status and an on-demand monitor pass."""

from fastapi import APIRouter

from app.services import scheduler as monitoring

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@router.get("/status")
async def monitor_status():
    """Whether scheduled monitoring is running, plus interval and alert state."""
    return monitoring.status()


@router.post("/run")
async def monitor_run():
    """Rescan every tracked competitor immediately and report what changed."""
    return await monitoring.run_monitor_pass()
