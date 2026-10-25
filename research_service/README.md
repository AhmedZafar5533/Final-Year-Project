# Competitor research collector

This internal service adapts IntelRadar's public-page extraction and browser
capture workflow. Express performs search and DeepSeek analysis. This service
fetches public pages and returns readable text; it loads no local AI models.
The original IntelRadar repository is not launched.

Use Python 3.10+:

```bash
cd research_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium

cp .env.example .env
# Populate .env with the identical RESEARCH_SERVICE_TOKEN from backend/.env.
uvicorn main:app --env-file .env --host 127.0.0.1 --port 8001
```

HTTP extraction works without Chromium; the browser fallback is used for thin
pages when installed. A failed fallback preserves a partial extraction. Chromium
can require additional OS libraries on a fresh Linux installation.
The `--env-file .env` option loads the collector's local environment file.
An already exported environment variable takes precedence over that file.

Page collection has a 15-second total budget including its queue, with bounded
HTTP and browser stages. Public page bodies are limited to 2 MB and extracted text
to 12,000 characters. Successful extractions are cached for 15 minutes (up to 48
pages), retaining their original collection time. Concurrent requests for the same
URL share a fetch; failures are not cached. Image and page collection use separate
concurrency slots so image retries cannot block factual source collection.

- `GET /health` returns liveness and token configuration status.
- `POST /collect` accepts `{"url":"https://example.org/article"}` with
  `Authorization: Bearer <RESEARCH_SERVICE_TOKEN>`.
- Responses contain the final URL, title, bounded text, extraction mode, and
  whether the extracted text was truncated.
- `POST /image` accepts `{"url":"https://example.org/photo.png","source_url":"https://example.org/article"}`
  with the same bearer token. It returns image bytes (up to 6 MB), with public-DNS
  and redirect checks. Express uses this as a fallback for saved research images
  that cannot load directly in the browser. HTML responses are rejected.

Public destination checks apply to initial URLs, DNS answers, and redirects.
Browser requests are fulfilled through the same restricted HTTP fetcher; downloads,
service workers, WebSockets, private destinations, and nonstandard ports are blocked.
Keep this service on loopback or an internal network and restrict deployment egress
to public HTTP(S), independently of application-level validation.

Run collector tests without network access:

```bash
python -m unittest -v test_collectors
```

See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for IntelRadar attribution and
[the application setup](../README.md) for the worker and research API.
