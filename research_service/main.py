"""Internal research collector. Run: uvicorn main:app --host 127.0.0.1 --port 8001."""

import asyncio
import hmac
import os
import logging
import time
from urllib.parse import urlsplit
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from collectors import collect_page, collect_image, validate_url

app = FastAPI(title="OnlyCreators Research Collector", version="1.0.0")
slots = asyncio.Semaphore(2)
image_slots = asyncio.Semaphore(2)
page_cache = {}
page_tasks = {}
logger = logging.getLogger("uvicorn.error")


async def cached_page(url):
    url = validate_url(url)
    hit = page_cache.get(url)
    if hit and hit[0] > time.monotonic():
        return {**hit[1], "cached": True}
    if url not in page_tasks:
        async def perform():
            async with slots:
                return await collect_page(url)

        if len(page_tasks) >= 12:
            raise HTTPException(status_code=503, detail="Page collector is busy; retry shortly")
        task = asyncio.create_task(asyncio.wait_for(perform(), timeout=15))
        page_tasks[url] = task

        def completed(done):
            page_tasks.pop(url, None)
            if done.cancelled() or done.exception():
                return
            result = done.result()
            if len(result.get("text", "").strip()) >= 100:
                if len(page_cache) >= 48:
                    page_cache.pop(next(iter(page_cache)))
                page_cache[url] = (time.monotonic() + 900, dict(result))

        task.add_done_callback(completed)
    return dict(await asyncio.shield(page_tasks[url]))


class CollectRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class ImageRequest(CollectRequest):
    source_url: str = Field(min_length=8, max_length=2048)


@app.post("/image")
async def image(request: ImageRequest, authorization: Annotated[str | None, Header()] = None):
    token = os.getenv("RESEARCH_SERVICE_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="Research collector token is not configured")
    if not hmac.compare_digest(authorization or "", "Bearer " + token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        async def fetch_image():
            async with image_slots:
                return await collect_image(request.url, request.source_url)

        fetched = await asyncio.wait_for(fetch_image(), timeout=12)
        return Response(content=fetched["body"], media_type=fetched["content_type"],
                        headers={"X-Content-Type-Options": "nosniff"})
    except Exception as error:
        logger.warning("[research] image.failed error=%s", type(error).__name__)
        raise HTTPException(status_code=502, detail="Image could not be retrieved") from error


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
        result = await cached_page(request.url)
        logger.info("[research] page.completed host=%s mode=%s characters=%s cached=%s elapsed_ms=%s",
                    host, result.get("mode"), len(result.get("text", "")), result.get("cached", False), round((time.monotonic() - started) * 1000))
        return result
    except HTTPException:
        raise
    except Exception as error:
        logger.warning("[research] page.failed error=%s", type(error).__name__)
        raise HTTPException(status_code=502, detail="The public page could not be collected") from error
