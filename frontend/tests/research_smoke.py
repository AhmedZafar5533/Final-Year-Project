"""Mocked browser smoke test; run with Playwright installed and Vite on port 5174.

RESEARCH_UI_URL overrides the frontend URL. CHROME_BINARY optionally selects an
existing Chromium/Chrome executable; otherwise Playwright's Chromium is used.
No live provider or application backend is contacted.
"""

import json
import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect


def main():
    root = Path(__file__).resolve().parents[2]
    exported = subprocess.run(
        ["node", "--input-type=module", "-e",
         "import {evidenceFixture,reportFixture,videos} from './test/fixtures/research.js';"
         "import {validateReport} from './services/research/analysis.js';"
         "const evidence=evidenceFixture();"
         "console.log(JSON.stringify({evidence,report:validateReport(reportFixture(evidence),evidence),videos}));"],
        cwd=root / "backend", capture_output=True, text=True, check=True,
    )
    fixtures = json.loads(exported.stdout)
    intelligence_id, job_id, idea_key = "507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "saved-study-idea"
    idea = {"id": "idea-1", "ideaKey": idea_key, "title": "A Practical Study Workflow",
            "hook": "Can these tools help you revise?", "angle": "Exam preparation",
            "why_it_will_perform": "A practical response to viewer questions.", "estimated_potential": "High"}
    intelligence = {
        "_id": intelligence_id, "researchRevision": "revision-1", "isDemo": False,
        "channelTitle": "Study Channel", "niche": {"primary_niche": "Study techniques", "sub_niches": []},
        "videoAnalyses": [], "marketTrends": [],
        "masterSummary": {
            "executive_overview": "Practical study workflows.", "overlap_recommendations": [idea],
            "demand_recommendations": [], "trend_recommendations": [], "next_video_recommendations": [idea],
        },
    }
    evidence = fixtures["evidence"]
    for source in evidence["sources"]:
        source.update({"title": "Study workflow evidence", "collectedAt": "2026-10-18T12:00:00Z"})
    for index, competitor in enumerate(evidence["competitors"]):
        video = fixtures["videos"][index]
        competitor.update({
            "title": video["snippet"]["title"], "channelTitle": video["snippet"]["channelTitle"],
            "url": "https://www.youtube.com/watch?v=" + video["id"],
            "publishedAt": video["snippet"]["publishedAt"], "observedAt": "2026-10-18T12:00:00Z",
            "metrics": {"views": 10000, "likes": 300, "comments": 100}, "averageViewsPerDay": 200,
            "commentSampleSize": 1, "transcriptAvailable": True,
        })
    detail = {
        "_id": job_id, "intelligenceId": intelligence_id, "ideaKey": idea_key,
        "status": "completed", "stage": "done", "hasReport": True, "stale": False,
        "completedAt": "2026-10-18T12:00:00Z", "report": fixtures["report"], "evidence": evidence,
    }
    user = {"_id": "507f1f77bcf86cd799439010", "fullName": "Research Tester", "email": "test@example.test"}
    started, script_requests, errors = [], [], []
    base = os.getenv("RESEARCH_UI_URL", "http://127.0.0.1:5174")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.getenv("CHROME_BINARY") or None, headless=True, args=["--no-sandbox"]
        )
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.add_init_script(
                "localStorage.setItem('token','test-token');"
                "localStorage.setItem('user'," + json.dumps(json.dumps(user)) + ");"
            )

            def handle(route):
                request = route.request
                parsed = urlsplit(request.url)
                headers = {
                    "access-control-allow-origin": request.headers.get("origin", base),
                    "access-control-allow-credentials": "true",
                    "access-control-allow-headers": "authorization,content-type",
                    "access-control-allow-methods": "GET,POST,OPTIONS",
                }
                if parsed.hostname == "example.org" and parsed.path.endswith("thumb.png"):
                    route.fulfill(content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180"><rect width="300" height="180" fill="#dcece8"/><circle cx="150" cy="90" r="45" fill="#377e70"/></svg>')
                    return
                if "/api/" not in parsed.path:
                    if parsed.hostname in {"127.0.0.1", "localhost"}:
                        route.continue_()
                    else:
                        route.abort()
                    return
                if request.method == "OPTIONS":
                    route.fulfill(status=204, headers=headers)
                    return
                body, status = {}, 200
                if parsed.path.endswith("/auth/me"):
                    body = {"user": user}
                elif parsed.path.endswith("/youtube/channel-intelligence"):
                    body = intelligence
                elif parsed.path.endswith("/idea-research") and request.method == "GET":
                    body = {"jobs": [{key: value for key, value in detail.items() if key not in {"report", "evidence"}}] if started else []}
                elif parsed.path.endswith("/idea-research") and request.method == "POST":
                    started.append(request.post_data_json)
                    body, status = {**detail, "status": "queued", "stage": "planning"}, 202
                elif parsed.path.endswith("/refresh"):
                    body, status = {**detail, "status": "queued", "stage": "planning"}, 202
                elif "/idea-research/" in parsed.path:
                    body = detail
                elif parsed.path.endswith("/script-studio/chat"):
                    script_requests.append(request.post_data_json)
                    is_chat = request.post_data_json.get("requestMode") == "chat" or request.post_data_json["messages"][-1]["content"].startswith("What")
                    body = {
                        "intent": "chat" if is_chat else "refine", "scriptUpdated": not is_chat,
                        "reply": "Gravity is an interaction. [S123456abcdef]" if is_chat else "Drafted with the saved research.",
                        "script": "# A Practical Study Workflow\n\n## Real examples\nUse a worked revision example.\n<img src=x onerror=window.researchXss=1>",
                        "suggested_followups": ["Make the examples clearer"], "researchApplied": True,
                        "researchCompletedAt": "2026-10-18T11:00:00Z" if len(script_requests) == 1 else detail["completedAt"],
                        "webResearch": {
                            "status": "collected", "searchedAt": "2026-10-18T12:00:00Z", "warnings": [],
                            "queries": ["study tools official sources"],
                            "activity": [{"event": "search.completed", "provider": "searxng", "results": 3}],
                            "searchResults": [{"url": "https://example.net/discovered", "title": "Discovered research paper", "snippet": "Search excerpt only", "provider": "searxng"}],
                            "sources": [{"id": "S123456abcdef", "title": "Original study reference", "url": "https://example.org/study",
                                         "collectedAt": "2026-10-18T12:00:00Z", "excerpt": "A collected study excerpt.", "cited": True, "complete": False}],
                            "images": [{"id": "I123456abcdef", "title": "Study diagram candidate", "url": "https://example.org/image-page",
                                        "imageUrl": "https://example.org/diagram.png", "thumbnailUrl": "https://example.org/thumb.png", "license": "Not verified"}],
                        },
                    }
                    if is_chat:
                        body["script"] = None
                    else:
                        body["script"] += "\nRevision " + str(len(script_requests))
                route.fulfill(status=status, headers=headers, json=body)

            page.route("**/*", handle)
            page.goto(base + "/insights")
            expect(page.get_by_role("button", name="Research competitors")).to_be_enabled(timeout=15000)
            page.get_by_role("button", name="Research competitors").click()
            dialog = page.get_by_role("dialog", name=idea["title"])
            expect(dialog).to_be_visible()
            expect(dialog.get_by_role("heading", name="Competing videos")).to_be_visible(timeout=10000)
            expect(dialog.get_by_role("heading", name="Potential gaps")).to_be_visible()
            assert started[0] == {"intelligenceId": intelligence_id, "ideaKey": idea_key}
            dialog.get_by_role("button", name="Refresh research").click()
            expect(dialog.get_by_role("heading", name="Competing videos")).to_be_visible()
            page.keyboard.press("Escape")
            expect(dialog).not_to_be_visible()
            page.get_by_role("button", name='Develop "' + idea["title"] + '" in AI Script Studio').click()
            expect(page.get_by_role("button", name="Update with research")).to_be_visible(timeout=15000)
            page.get_by_role("button", name="Update with research").click()
            expect(page.get_by_text("This draft uses saved competitor research.")).to_be_visible(timeout=15000)
            assert len(script_requests) == 2
            expected_ref = {"intelligenceId": intelligence_id, "ideaKey": idea_key}
            assert all(request["idea"]["researchRef"] == expected_ref for request in script_requests)
            assert all(request.get("sessionId") for request in script_requests)
            assert script_requests[0]["sessionId"] == script_requests[1]["sessionId"]
            page.get_by_role("tab", name="Sources", exact=False).click()
            sources = page.get_by_role("region", name="Script web references")
            expect(sources.get_by_role("link", name="[S123456abcdef] Original study reference")).to_have_attribute("href", "https://example.org/study")
            expect(sources.get_by_role("link", name="Discovered research paper")).to_be_visible()
            page.get_by_role("tab", name="Images", exact=False).click()
            expect(sources.get_by_role("img", name="Study diagram candidate")).to_be_attached()
            expect(sources.get_by_text("Licensing reported by search: Not verified")).to_be_attached()
            page.get_by_role("tab", name="Activity", exact=True).click()
            expect(page.get_by_text("search · completed")).to_be_visible()
            page.get_by_role("tab", name="Draft", exact=True).click()
            original_draft = page.locator(".script-page").inner_text()
            page.get_by_role("textbox", name="Message Nova AI").fill("What is gravity?")
            page.get_by_role("button", name="Send message", exact=True).click()
            expect(page.get_by_text("Answer · draft unchanged")).to_be_visible(timeout=15000)
            assert page.locator(".script-page").inner_text() == original_draft
            page.get_by_role("button", name="Edit script", exact=True).click()
            page.get_by_role("textbox", name="Message Nova AI").fill("Shorten the opening")
            page.get_by_role("button", name="Send message", exact=True).click()
            expect(page.locator(".script-page")).to_contain_text("Revision 4", timeout=15000)
            page.get_by_role("button", name="Find images", exact=True).click()
            expect(page.get_by_role("tab", name="Images", exact=False)).to_have_attribute("aria-selected", "true")
            expect(page.get_by_role("button", name="Find images", exact=True)).to_be_enabled(timeout=15000)
            assert script_requests[-1]["requestMode"] == "chat"
            assert script_requests[-1]["researchMode"] == "images"
            history = page.evaluate("JSON.parse(localStorage.getItem('onlycreators_script_history'))")
            assert history[0]["idea"]["researchRef"] == expected_ref
            assert history[0]["webResearch"]["sources"][0]["id"] == "S123456abcdef"
            page.reload()
            page.get_by_role("tab", name="Sources", exact=False).click()
            expect(page.get_by_role("region", name="Script web references").get_by_role("link", name="[S123456abcdef] Original study reference")).to_be_attached(timeout=15000)
            assert page.evaluate("window.researchXss") is None
            assert not errors, errors
            page.screenshot(path="/tmp/onlycreators-research-smoke.png", full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            page.get_by_role("button", name="Chat", exact=True).click()
            expect(page.get_by_role("textbox", name="Message Nova AI")).to_be_visible()
            page.get_by_role("button", name="Ask only", exact=True).click()
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            page.screenshot(path="/tmp/onlycreators-script-mobile.png", full_page=True)
            print("Browser smoke passed: competitor report, script sources/images, follow-up session references, persisted reload, and sanitized script rendering.")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
