import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from playwright.async_api import async_playwright

from app.core.config import SCREENSHOTS_DIR

async def crawl_url(url: str) -> Dict[str, Any]:
    """
    High-speed, asynchronous web scraping using Crawl4AI.
    Converts raw product HTML directly into clean markdown and structured metadata.
    """
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        page_timeout=30000,
        verbose=False
    )
    
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url, config=config)
        
        if not result.success:
            raise RuntimeError(f"Crawl failed for {url}: {result.error_message}")
            
        return {
            "url": url,
            "markdown": result.markdown or "",
            "fit_markdown": getattr(result, 'fit_markdown', "") or result.markdown or "",
            "title": getattr(result.metadata, 'title', "") or getattr(result, 'title', ""),
            "links": {
                "internal": [l.get("href") for l in result.links.get("internal", []) if isinstance(l, dict)][:15],
                "external": [l.get("href") for l in result.links.get("external", []) if isinstance(l, dict)][:15]
            } if hasattr(result, "links") and isinstance(result.links, dict) else {}
        }

async def capture_browser_agent(url: str, scroll_passes: int = 3) -> Dict[str, Any]:
    """
    Autonomous browser agent navigation using Playwright.
    Navigates to URL, bypasses JS rendering, scrolls page to trigger lazy elements,
    and captures high-resolution war-room screenshot.
    """
    screenshot_filename = f"scan_{uuid.uuid4().hex[:10]}.png"
    screenshot_path = SCREENSHOTS_DIR / screenshot_filename
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            # Navigate to target page
            await page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception:
            # Fallback if networkidle times out
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            
        # Scroll to load dynamic pricing/feature components
        for _ in range(scroll_passes):
            await page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
            await asyncio.sleep(0.5)
            
        # Scroll back to top hero
        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(0.4)
        
        # Take full viewport screenshot
        await page.screenshot(path=str(screenshot_path), full_page=False)
        
        page_title = await page.title()
        text_content = await page.evaluate("() => document.body.innerText")
        
        await browser.close()
        
    return {
        "url": url,
        "title": page_title,
        "screenshot_url": f"/screenshots/{screenshot_filename}",
        "screenshot_path": str(screenshot_path),
        "extracted_text_preview": text_content[:2000] if text_content else "",
        "full_text": text_content or ""
    }
