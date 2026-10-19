"""Alert delivery via Apprise (Discord, Slack, Telegram, email, …).

Alerts are opt-in: nothing is sent unless ``ALERT_URLS`` is configured.
"""

import logging

import apprise

from app.core.config import ALERT_URLS

logger = logging.getLogger("notify")


def is_configured() -> bool:
    return bool(ALERT_URLS)


def notify(title: str, body: str) -> bool:
    """Send ``body`` to every configured target. Never raises."""
    if not ALERT_URLS:
        logger.info("No ALERT_URLS configured; skipping notification")
        return False

    client = apprise.Apprise()
    for url in ALERT_URLS:
        client.add(url)

    try:
        sent = client.notify(title=title, body=body)
        logger.info("Alert '%s' delivered=%s", title, sent)
        return bool(sent)
    except Exception as e:  # pragma: no cover - network/provider dependent
        logger.warning("Alert delivery failed: %s", e)
        return False
