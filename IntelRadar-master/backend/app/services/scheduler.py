"""Continuous monitoring: periodic rescans plus change alerts.

Enabled with ``MONITOR_ENABLED=true``. A single APScheduler job re-runs the
scan pipeline for every tracked competitor, diffs the result and pushes an
alert when something notable changed.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core import config, licensing
from app.services.cache import get_all_competitors
from app.services.notify import is_configured, notify
from app.services.pipeline import run_scan

logger = logging.getLogger("scheduler")

_scheduler = AsyncIOScheduler()


async def run_monitor_pass() -> dict:
    """Rescan every tracked competitor; alert on changes. Safe to call ad hoc."""
    # Scheduled rescans are a paid capability: an unlicensed trial should not
    # burn its scan allowance through the background scheduler.
    if not licensing.status()["licensed"]:
        logger.info("Monitor pass skipped: an active license is required")
        return {"scanned": 0, "changed": 0, "errors": 0, "skipped": "license"}

    results = {"scanned": 0, "changed": 0, "errors": 0}
    for comp in get_all_competitors():
        name = comp.get("competitor_name")
        if not name:
            continue
        try:
            profile = await run_scan(
                name,
                url=comp.get("target_url"),
                video_url=comp.get("target_video_url"),
                engine=comp.get("engine") or "fast",
            )
            results["scanned"] += 1

            changes = profile.get("changes") or []
            if changes:
                results["changed"] += 1
                logger.info("%d change(s) detected for %s", len(changes), name)
                if is_configured():
                    body = "\n".join(f"• [{c['severity']}] {c['summary']}" for c in changes)
                    notify(f"IntelRadar: {name} changed", body)
        except Exception as e:
            results["errors"] += 1
            logger.warning("Monitor rescan failed for %s: %s", name, e)

    logger.info("Monitor pass complete: %s", results)
    return results


def start() -> None:
    if not config.MONITOR_ENABLED:
        logger.info("Monitoring disabled (set MONITOR_ENABLED=true to enable)")
        return
    _scheduler.add_job(
        run_monitor_pass,
        "interval",
        minutes=config.MONITOR_INTERVAL_MINUTES,
        id="monitor",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Monitoring every %d minutes", config.MONITOR_INTERVAL_MINUTES)


def shutdown() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


def reload() -> None:
    """Apply changed monitoring settings.

    APScheduler instances cannot be restarted after shutdown, so a fresh
    scheduler is created for the new configuration.
    """
    global _scheduler
    shutdown()
    _scheduler = AsyncIOScheduler()
    start()


def status() -> dict:
    jobs = (
        [{"id": job.id, "next_run": str(job.next_run_time)} for job in _scheduler.get_jobs()]
        if _scheduler.running
        else []
    )
    return {
        "enabled": config.MONITOR_ENABLED,
        "interval_minutes": config.MONITOR_INTERVAL_MINUTES,
        "running": _scheduler.running,
        "alerts_configured": is_configured(),
        "jobs": jobs,
    }
