"""Internal research collector. Run: uvicorn main:app --host 127.0.0.1 --port 8001."""

import asyncio
import hmac
import os
import logging
import time
from urllib.parse import urlsplit
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from collectors import collect_page

app = FastAPI(title="OnlyCreators Research Collector", version="1.0.0")
slots = asyncio.Semaphore(2)
logger = logging.getLogger("uvicorn.error")


class CollectRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


@app.get("/health")
def health():
    return {"status": "online", "configured": bool(os.getenv("RESEARCH_SERVICE_TOKEN"))}


@app.post("/collect")
async def collect(request: CollectRequest, authorization: Annotated[str | None, Header()] = None):
    token = os.getenv("RESEARCH_SERVICE_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="Research collector token is not configured")
    if not hmac.compare_digest(authorization or "", "Bearer " + token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        started = time.monotonic()
        host = urlsplit(request.url).hostname
        logger.info("[research] page.started host=%s", host)
        async with slots:
            result = await asyncio.wait_for(collect_page(request.url), timeout=19)
        logger.info("[research] page.completed host=%s mode=%s characters=%s elapsed_ms=%s",
                    host, result.get("mode"), len(result.get("text", "")), round((time.monotonic() - started) * 1000))
        return result
    except Exception as error:
        logger.warning("[research] page.failed error=%s", type(error).__name__)
        raise HTTPException(status_code=502, detail="The public page could not be collected") from error
