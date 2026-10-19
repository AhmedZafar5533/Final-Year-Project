"""Optional LLM-driven browser agent engine (built on ``browser-use``).

The package is imported lazily so the API still boots when the optional
dependency is not installed. This engine drives a real browser with an LLM so
it can click into pricing pages, expand tables and paginate — things the plain
Playwright capture in ``scraper.py`` cannot do.
"""

import asyncio
import importlib.util
import logging
import os
from typing import Optional

from app.core import config

logger = logging.getLogger("browser_agent")

# Opt out of browser-use's anonymized telemetry before it is imported.
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

DEFAULT_TASK = (
    "Collect competitive intelligence from this site: every pricing tier with its "
    "price and billing period, the key product capabilities, and any customer "
    "complaints or limitations that are stated. Open the pricing page first if one exists."
)


def is_available() -> bool:
    """True when the optional ``browser-use`` package is importable."""
    try:
        return importlib.util.find_spec("browser_use") is not None
    except Exception:
        return False


async def run_browser_task(
    url: str,
    task: str = DEFAULT_TASK,
    max_steps: Optional[int] = None,
) -> str:
    """Drive an LLM browser agent against ``url`` and return its text report."""
    # browser-use's Gemini client reads GOOGLE_API_KEY; keep it in sync.
    if config.GEMINI_API_KEY:
        os.environ["GOOGLE_API_KEY"] = config.GEMINI_API_KEY

    try:
        from browser_use import Agent
        from browser_use.llm.google.chat import ChatGoogle
    except Exception as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "The browser agent engine needs the 'browser-use' package "
            "(pip install browser-use)."
        ) from exc

    steps = max_steps or config.BROWSER_AGENT_MAX_STEPS
    llm = ChatGoogle(
        model=config.BROWSER_AGENT_MODEL,
        api_key=config.GEMINI_API_KEY or None,
        temperature=0.1,
        # Fail fast on provider outages rather than retrying for minutes.
        max_retries=3,
        retry_max_delay=20.0,
    )
    agent = Agent(
        task=f"Go to {url}. {task}\nFinish by reporting everything you found as concise plain text.",
        llm=llm,
    )

    try:
        history = await asyncio.wait_for(
            agent.run(max_steps=steps), timeout=config.BROWSER_AGENT_TIMEOUT
        )
    except asyncio.TimeoutError as exc:
        raise RuntimeError(
            f"The browser agent timed out after {config.BROWSER_AGENT_TIMEOUT}s."
        ) from exc
    finally:
        try:
            await agent.close()
        except Exception:
            pass

    report = (history.final_result() or "").strip()
    if not report:
        raise RuntimeError("The browser agent finished without producing a report.")

    logger.info("Browser agent finished for %s in %d steps", url, len(history.action_history))
    return report
