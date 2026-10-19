"""Public-page collection adapted from IntelRadar's scraper.py and news.py.

All browser traffic is fulfilled through the same size-limited HTTP client and
public-address resolver as ordinary fetching. No inference models are imported.
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit, urlunsplit

import aiohttp
import trafilatura
from aiohttp.resolver import DefaultResolver

MAX_BYTES = 512 * 1024
MAX_TEXT = 12000


def validate_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Only public HTTP(S) pages are supported")
    if parsed.username or parsed.password or parsed.port not in {None, 80, 443}:
        raise ValueError("Credentials and nonstandard ports are not supported")
    hostname = parsed.hostname.rstrip(".").lower()
    if hostname in {"localhost", "localhost.localdomain", "metadata.google.internal"}:
        raise ValueError("Local destinations are blocked")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        if "." not in hostname or hostname.endswith((".localhost", ".local", ".internal")):
            raise ValueError("Local destinations are blocked")
    else:
        if not address.is_global or address.is_multicast:
            raise ValueError("Private and special-use addresses are blocked")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))


class PublicResolver(DefaultResolver):
    async def resolve(self, host, port=0, family=socket.AF_INET):
        records = await super().resolve(host, port, family)
        for record in records:
            address = ipaddress.ip_address(record["host"])
            if not address.is_global or address.is_multicast:
                raise ValueError("Destination resolves to a private or special-use address")
        if not records:
            raise ValueError("Destination has no public address")
        return records


async def fetch_public(session, url, allowed_types=("text/html", "application/xhtml+xml", "text/plain")):
    target = validate_url(url)
    for _ in range(5):
        async with session.get(target, allow_redirects=False) as response:
            if response.status in {301, 302, 303, 307, 308}:
                location = response.headers.get("Location")
                if not location:
                    raise ValueError("Redirect has no destination")
                target = validate_url(urljoin(target, location))
                continue
            if response.status != 200:
                raise ValueError("Page is unavailable")
            content_type = response.headers.get("Content-Type", "").split(";")[0].lower()
            if allowed_types and content_type not in allowed_types:
                raise ValueError("Unsupported page content type")
            content = bytearray()
            async for chunk in response.content.iter_chunked(8192):
                content.extend(chunk)
                if len(content) > MAX_BYTES:
                    raise ValueError("Page exceeds the collection size limit")
            return {
                "url": target, "body": bytes(content), "content_type": content_type,
                "encoding": response.charset or "utf-8",
            }
    raise ValueError("Too many redirects")


def extract_text(body, encoding="utf-8"):
    html = body.decode(encoding, errors="replace")
    document = trafilatura.bare_extraction(
        html, include_comments=False, include_tables=True, favor_precision=True,
    )
    if not document:
        return {"title": "", "text": "", "complete": False}
    document = document.as_dict()
    raw = document.get("text") or ""
    return {
        "title": str(document.get("title") or "")[:300],
        "text": raw[:MAX_TEXT],
        "complete": len(raw) <= MAX_TEXT,
        "publishedAt": document.get("date") or None,
    }


async def render_public(session, url):
    # Imported lazily: ordinary extraction works without an installed browser.
    from playwright.async_api import async_playwright

    request_count = 0
    byte_count = 0
    final_url = url
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            context = await browser.new_context(
                service_workers="block", accept_downloads=False,
                viewport={"width": 1440, "height": 900},
            )
            await context.route_web_socket("**/*", lambda websocket: websocket.close())

            async def proxy_route(route):
                nonlocal request_count, byte_count, final_url
                request = route.request
                if request.method != "GET" or request.resource_type not in {
                    "document", "script", "stylesheet", "xhr", "fetch"
                }:
                    await route.abort()
                    return
                request_count += 1
                if request_count > 20 or byte_count > 1024 * 1024:
                    await route.abort()
                    return
                try:
                    fetched = await fetch_public(session, request.url, allowed_types=None)
                    byte_count += len(fetched["body"])
                    if byte_count > 1024 * 1024:
                        raise ValueError("Rendered page exceeds budget")
                    if request.is_navigation_request() and request.frame.parent_frame is None:
                        final_url = fetched["url"]
                    await route.fulfill(
                        status=200, body=fetched["body"],
                        headers={"content-type": fetched["content_type"], "access-control-allow-origin": "*"},
                    )
                except Exception:
                    await route.abort()

            await context.route("**/*", proxy_route)
            page = await context.new_page()
            await page.goto(validate_url(url), wait_until="domcontentloaded", timeout=12000)
            await page.wait_for_timeout(1000)
            await page.evaluate("window.scrollBy(0, window.innerHeight)")
            raw = await page.locator("body").inner_text(timeout=3000)
            return {
                "url": final_url, "title": (await page.title())[:300],
                "text": raw[:MAX_TEXT], "complete": False, "mode": "rendered",
            }
        finally:
            await browser.close()


async def collect_page(url, render=True):
    connector = aiohttp.TCPConnector(resolver=PublicResolver(), use_dns_cache=False, limit=4)
    timeout = aiohttp.ClientTimeout(total=15, connect=5)
    async with aiohttp.ClientSession(
        connector=connector, timeout=timeout, trust_env=False,
        headers={"User-Agent": "OnlyCreatorsResearch/1.0"},
    ) as session:
        fetched = await fetch_public(session, url)
        if fetched["content_type"] == "text/plain":
            raw = fetched["body"].decode(fetched["encoding"], errors="replace")
            result = {"title": "", "text": raw[:MAX_TEXT], "complete": len(raw) <= MAX_TEXT}
        else:
            result = extract_text(fetched["body"], fetched["encoding"])
        result.update({"url": fetched["url"], "mode": "http"})
        if len(result["text"]) < 300 and render:
            try:
                rendered = await asyncio.wait_for(render_public(session, fetched["url"]), timeout=17)
                if len(rendered["text"]) > len(result["text"]):
                    return rendered
            except Exception:
                # The caller can still use an honest partial HTTP extraction.
                result["complete"] = False
        return result
