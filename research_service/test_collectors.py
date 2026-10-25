import asyncio
import os
import socket
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from collectors import MAX_BYTES, PublicResolver, extract_text, fetch_public, validate_url
from main import CollectRequest, collect, ImageRequest, image
import main


class UrlTests(unittest.TestCase):
    def test_public_pages(self):
        self.assertEqual(validate_url("https://example.org/article#section"), "https://example.org/article")
        self.assertEqual(validate_url("https://8.8.8.8/path"), "https://8.8.8.8/path")

    def test_private_and_special_destinations(self):
        for url in [
            "http://localhost/a", "http://127.0.0.1/a", "http://10.1.2.3/a",
            "http://172.16.0.1/a", "http://192.168.1.1/a", "http://169.254.169.254/",
            "http://0.0.0.0/", "http://[::1]/", "http://[::ffff:127.0.0.1]/",
            "http://224.0.0.1/", "http://service.internal/", "http://host.local/",
            "https://user:secret@example.org/", "https://example.org:8000/",
            "file:///etc/passwd", "ftp://example.org/file",
        ]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_url(url)

    def test_readable_extraction_excludes_scripts_and_keeps_a_bound(self):
        paragraph = "A practical study workflow combines revision questions and worked examples. "
        html = ("<html><head><title>Study Guide</title><script>UNTRUSTED_SCRIPT_TEXT</script></head>"
                "<body><article><h1>Study Guide</h1>" +
                "".join("<p>" + paragraph * 5 + "</p>" for _ in range(50)) +
                "</article></body></html>")
        result = extract_text(html.encode())
        self.assertIn("revision questions", result["text"])
        self.assertNotIn("UNTRUSTED_SCRIPT_TEXT", result["text"])
        self.assertLessEqual(len(result["text"]), 12000)

    def test_large_extraction_is_marked_partial(self):
        document = SimpleNamespace(as_dict=lambda: {"title": "Long page", "text": "x" * 15000})
        with patch("collectors.trafilatura.bare_extraction", return_value=document):
            result = extract_text(b"<html><body>Long page</body></html>")
        self.assertEqual(len(result["text"]), 12000)
        self.assertFalse(result["complete"])


class AsyncTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        main.page_cache.clear()
        main.page_tasks.clear()
        main.slots = asyncio.Semaphore(2)

    async def test_concurrent_and_repeated_collection_reuses_successful_page_fetches(self):
        evidence = {"url": "https://example.org/cache-test", "title": "Study", "text": "Actual collected text. " * 20}
        async def slow_page(url):
            await asyncio.sleep(0.01)
            return evidence
        with patch("main.collect_page", AsyncMock(side_effect=slow_page)) as collector:
            first, second = await asyncio.gather(main.cached_page(evidence["url"]), main.cached_page(evidence["url"]))
            first["text"] = "caller mutation"
            third = await main.cached_page(evidence["url"])
            self.assertEqual(second["text"], evidence["text"])
            self.assertEqual(third["text"], evidence["text"])
            self.assertEqual(collector.await_count, 1)

    async def test_failed_collection_is_not_cached(self):
        evidence = {"url": "https://example.org/recover", "text": "Recovered page text. " * 20}
        with patch("main.collect_page", AsyncMock(side_effect=[ValueError("Unavailable"), evidence])) as collector:
            with self.assertRaises(ValueError):
                await main.cached_page(evidence["url"])
            self.assertEqual(await main.cached_page(evidence["url"]), evidence)
            self.assertEqual(collector.await_count, 2)

    async def test_resolver_rejects_private_dns_answers(self):
        records = [{"host": "127.0.0.1", "hostname": "example.org", "port": 80, "family": socket.AF_INET}]
        with patch("collectors.DefaultResolver.resolve", AsyncMock(return_value=records)):
            resolver = PublicResolver()
            try:
                with self.assertRaises(ValueError):
                    await resolver.resolve("example.org", 80)
            finally:
                await resolver.close()

    async def test_resolver_rejects_mixed_public_and_private_answers(self):
        records = [{"host": host} for host in ["8.8.8.8", "192.168.0.1"]]
        with patch("collectors.DefaultResolver.resolve", AsyncMock(return_value=records)):
            resolver = PublicResolver()
            try:
                with self.assertRaises(ValueError):
                    await resolver.resolve("example.org", 80)
            finally:
                await resolver.close()

    async def test_redirect_to_private_address_is_rejected_before_a_second_request(self):
        class Response:
            status = 302
            headers = {"Location": "http://169.254.169.254/latest/meta-data"}

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

        class Session:
            calls = 0

            def get(self, *args, **kwargs):
                self.calls += 1
                return Response()

        session = Session()
        with self.assertRaises(ValueError):
            await fetch_public(session, "https://example.org/article")
        self.assertEqual(session.calls, 1)

    async def test_oversized_page_is_rejected(self):
        class Content:
            async def iter_chunked(self, size):
                yield b"x" * (MAX_BYTES + 1)

        class Response:
            status = 200
            headers = {"Content-Type": "text/html"}
            content = Content()
            charset = "utf-8"

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

        class Session:
            def get(self, *args, **kwargs):
                return Response()

        with self.assertRaises(ValueError):
            await fetch_public(Session(), "https://example.org/article")

    async def test_image_fetch_rejects_html_and_enforces_its_byte_limit(self):
        class Content:
            async def iter_chunked(self, size):
                yield b"x" * 11

        class Response:
            status = 200
            headers = {"Content-Type": "text/html"}
            content = Content()
            charset = None

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

        class Session:
            def get(self, *args, **kwargs):
                return Response()

        with self.assertRaisesRegex(ValueError, "content type"):
            await fetch_public(Session(), "https://example.org/photo", allowed_types=("image/png",), max_bytes=10)
        Response.headers = {"Content-Type": "image/png"}
        with self.assertRaisesRegex(ValueError, "size limit"):
            await fetch_public(Session(), "https://example.org/photo", allowed_types=("image/png",), max_bytes=10)

    async def test_api_requires_a_configured_token(self):
        with patch.dict(os.environ, {"RESEARCH_SERVICE_TOKEN": ""}):
            with self.assertRaises(HTTPException) as raised:
                await collect(CollectRequest(url="https://example.org/article"), "Bearer any")
        self.assertEqual(raised.exception.status_code, 503)

    async def test_api_rejects_incorrect_token_without_collecting(self):
        with patch.dict(os.environ, {"RESEARCH_SERVICE_TOKEN": "test-token"}):
            with patch("main.collect_page", AsyncMock()) as collector:
                with self.assertRaises(HTTPException) as raised:
                    await collect(CollectRequest(url="https://example.org/article"), "Bearer wrong")
                self.assertEqual(raised.exception.status_code, 401)
                collector.assert_not_called()

    async def test_authorized_collection_returns_evidence(self):
        evidence = {"url": "https://example.org/article", "title": "Article", "text": "Collected text"}
        with patch.dict(os.environ, {"RESEARCH_SERVICE_TOKEN": "test-token"}):
            with patch("main.collect_page", AsyncMock(return_value=evidence)):
                result = await collect(CollectRequest(url="https://example.org/article"), "Bearer test-token")
        self.assertEqual(result, evidence)

    async def test_collection_failures_are_sanitized(self):
        with patch.dict(os.environ, {"RESEARCH_SERVICE_TOKEN": "test-token"}):
            with patch("main.collect_page", AsyncMock(side_effect=ValueError("Private infrastructure detail"))):
                with self.assertRaises(HTTPException) as raised:
                    await collect(CollectRequest(url="https://example.org/article"), "Bearer test-token")
        self.assertEqual(raised.exception.status_code, 502)
        self.assertNotIn("Private", raised.exception.detail)

    async def test_image_collection_requires_token_and_returns_only_collected_bytes(self):
        request = ImageRequest(url="https://example.org/photo.png", source_url="https://example.org/article")
        with patch.dict(os.environ, {"RESEARCH_SERVICE_TOKEN": "test-token"}):
            with patch("main.collect_image", AsyncMock(return_value={"body": b"image fixture", "content_type": "image/png"})) as collector:
                with self.assertRaises(HTTPException):
                    await image(request, "Bearer wrong")
                collector.assert_not_called()
                result = await image(request, "Bearer test-token")
                self.assertEqual(result.body, b"image fixture")
                self.assertEqual(result.media_type, "image/png")
                collector.assert_awaited_once_with(request.url, request.source_url)


if __name__ == "__main__":
    unittest.main()
