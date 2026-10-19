# SearXNG web search

## Local startup without Docker

From `backend`, run once:

```bash
npm run research:setup
```

This downloads the official SearXNG source into ignored `searxng/.runtime/` and
installs isolated Python environments for search and page collection. Python 3.10+
and pip are required. If Ubuntu lacks ensurepip, the setup reuses the existing
transcript environment's pip when available; otherwise install Python's pip/venv
support first. No system Python packages are modified.

Populate `SEARXNG_URL=http://127.0.0.1:8080`,
`RESEARCH_SERVICE_URL=http://127.0.0.1:8001` and `RESEARCH_SERVICE_TOKEN` in
`backend/.env`, then:

```bash
npm run research:services
```

Keep this terminal open. It starts local SearXNG and the collector together,
using the backend's shared token, and Ctrl+C stops both. This is a local
development launcher; it does not start Express or the competitor worker.
It uses the checked-in search settings and generates a private runtime secret.
It does not need a separate collector `.env` file. To test actual web results,
image results, and authenticated page extraction from another backend terminal:

```bash
npm run research:check
```

Starting Express alone does not start these services. The local launcher binds
only to loopback and expects local instance-root URLs. Docker or a managed WSGI
deployment remains an alternative for hosting outside local development.

## Docker alternative

The research worker calls this private search instance for articles and Reddit
threads. The existing Python collector fetches readable page text, and DeepSeek
analyzes collected evidence. SearXNG does not retrieve video captions.

Install Docker with the Compose plugin, then run:

```bash
cd searxng
cp .env.example .env
# Set SEARXNG_SECRET in .env to a random value: openssl rand -hex 32
docker compose up -d
curl 'http://127.0.0.1:8080/search?q=study+tools&format=json'
```

Set these in the existing `backend/.env` (preserve your other values):

```dotenv
WEB_SEARCH_PROVIDER=auto
SEARXNG_URL=http://127.0.0.1:8080
# Optional fallback in auto mode:
BRAVE_SEARCH_API_KEY=
```

Restart the research worker and refresh an idea's report in Insights. Keep the
Python collector running with its shared token configured. Existing saved reports
are not automatically rewritten. Open http://localhost:8080 to use the search UI.

Script Studio also uses these settings. Restart the Express backend, then generate
or edit a draft to collect factual references. Helpful visual requests trigger the
SearXNG `images` category and show candidate previews with original-page links.
No extra API key is needed for images; your instance must have functioning image
engines. Sources, Images and Activity tabs show the library and search outcomes;
Find sources / Find images explicitly search without modifying the script.
The library persists in saved history.
Image results are suggestions, not verified content or a grant of reuse rights.

Provider modes: `auto` tries SearXNG when its URL is set, then Brave when its key is
set; `searxng` and `brave` select one provider; `none` disables web discovery.
With no configured provider, research continues using YouTube only. An unavailable
or empty provider produces a limitation and allows fallback in auto mode.

Each idea makes up to two general queries plus one `site:reddit.com` query.
Search results are cached for one hour. Up to three pages are collected across
different domains, reserving one slot for a Reddit thread when available. Search
snippets are discovery metadata and are never used as evidence of unseen page or
comment contents. Reddit access can fail; unavailable pages are explicitly noted.
Community observations are anecdotal, and cannot establish an absence in competitor
coverage. Missing captions still prevent unsupported content-gap conclusions.

The container uses default upstream engines, whose availability varies. Successful
startup does not guarantee useful search results. Inspect `docker compose logs`
and test `/search?format=json` if reports mention SearXNG failure. JSON must be
enabled in settings; many public instances disable it. The image uses `latest` for
local setup; pin a tested image digest for a reproducible deployment.

Stop with `docker compose down`. The supplied configuration is for local use;
keep the port bound to loopback. If the worker is later containerized, configure
its reachable service hostname instead of `127.0.0.1`.

References: [Search API](https://docs.searxng.org/dev/search_api.html),
[container installation](https://docs.searxng.org/admin/installation-docker.html),
[server settings](https://docs.searxng.org/admin/settings/settings_server.html).
