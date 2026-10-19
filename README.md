# Antigravity Studio (OnlyCreators)

AI-powered YouTube analytics, sentiment analysis, video insights, and script generation
with a React 19 frontend, Express backend, MongoDB, and the DeepSeek API.

## Sentiment analysis

YouTube comments are classified through DeepSeek directly from the backend.
Sentiment no longer uses RoBERTa, DistilBERT, PyTorch, Hugging Face, or keyword-rule
fallbacks. The local model dependencies are commented out in
[`sentiment_service/requirements.txt`](sentiment_service/requirements.txt).

Results retain positive, neutral, and negative labels and summary percentages.
The backend validates results by request ID, batches up to 25 comments per call,
and shares and caches identical requests for five minutes. It reports failures
instead of inventing neutral labels or confidence scores.

## Quick start

Use Node.js 22.12+ and Python 3.10+.

### Start backend services in separate terminals

After configuring the environment and installing dependencies, run from the
project root in your Linux desktop terminal:

```bash
./start-backend.sh
```

This opens five titled terminal windows: Express API, competitor research worker,
SearXNG, page collector, and transcript service. Konsole, GNOME Terminal and xterm
are supported; the launcher detects an installed terminal. Each window shows its
own logs. Ctrl+C stops that window's service, then Enter closes the stopped window.
Closing a service window also stops its service process group.

The equivalent command from `backend` is `npm run start:all`. Use
`./start-backend.sh --dry-run` to inspect the terminal commands without launching.
Stop old manually started services before the first use if you want each service
in a new window. The launcher uses PID locks for services it manages and leaves
existing listeners alone when their configured ports are already occupied.

The frontend remains separate: `cd frontend && npm run dev`. MongoDB must already
be available at your configured URI. For a fresh checkout, install backend and
transcript dependencies and run `npm run research:setup` inside `backend` once.

Environment templates:

- [backend/.env.example](backend/.env.example): database, authentication, provider
  credentials, service URLs, and research limits. The research worker uses this too.
- [frontend/.env.example](frontend/.env.example): optional public backend URL.
- [research_service/.env.example](research_service/.env.example): shared collector token.

Copy each needed template to `.env` in the same directory and populate those files.
Keep the research token identical in the backend and collector. The transcript
service needs no credentials or environment file; `python main.py` defaults to port
8000. To override that port, use `PORT=8000 python main.py` and update the backend
service URLs to match.

### Express backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DeepSeek credentials and the application configuration in .env.
npm start
```

Sentiment requires `DEEPSEEK_API_KEY`. The optional `DEEPSEEK_MODEL` defaults to
`deepseek-flash` and applies to sentiment, insights, and script generation.
Credentials stay in the backend. API requests incur DeepSeek usage charges.
The backend runs on port 5000.

### React frontend

```bash
cd frontend
npm install
npm run dev
```

Vite runs on port 5173.

### Python transcript service

This service is needed for live transcripts, independently of sentiment analysis:

```bash
cd sentiment_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

It runs on port 8000. See [its README](sentiment_service/README.md) for endpoints.

### Competitor research

For local web search without Docker, run `npm run research:setup` once in
`backend`, then keep `npm run research:services` running in another terminal.
This starts SearXNG and the page collector using `backend/.env`. Verify live web
results, images and extraction with `npm run research:check`. See
[the startup instructions](searxng/README.md). Express and the research worker
remain separate processes.

Saved recommendations can be researched against competing YouTube videos and
general web content. Insights shows progress and a sourced report covering public
metrics, observed topics, viewer questions, supported gap hypotheses, and a
suggested angle. Script Studio uses the saved report on generation and follow-up
edits, with **Update with research** when findings arrive after a draft.

Configure these backend settings:

- `DEEPSEEK_API_KEY`, `YOUTUBE_API_KEY`, and `MONGODB_URI` are required.
- `SEARXNG_URL` enables SearXNG web discovery, including Reddit thread searches.
  See [local SearXNG setup](searxng/README.md) for the supplied Docker configuration.
- `WEB_SEARCH_PROVIDER=auto` prefers configured SearXNG and falls back to Brave
  when `BRAVE_SEARCH_API_KEY` is set. Modes `searxng`, `brave`, and `none` are also
  supported. Without a configured provider, reports explicitly cover YouTube only.
- `RESEARCH_SERVICE_URL` defaults to `http://127.0.0.1:8001`.
- `RESEARCH_SERVICE_TOKEN` must match the collector's token for web-page collection.

In additional terminals, start the [Python collector](research_service/README.md)
and the research worker:

```bash
cd backend
npm run research:worker
```

Keep the existing transcript service running on port 8000 for caption collection.
Competitor captions are best effort. Missing captions, disabled comments, and failed
web requests produce explicit limitations; unsupported gap conclusions are withheld.
Only DeepSeek performs AI inference.

Web research includes a targeted Reddit query and reserves a page slot for an
available thread. Only successfully collected page text supports report claims;
search snippets do not establish comment contents. Cited community observations
appear separately in the report and are treated as anecdotal audience signals.

Defaults: automatically research the first three unique recommendations after a
live channel analysis is saved, up to five videos and three web pages per idea,
20 jobs per user per UTC day, and 24-hour report freshness. Remaining ideas and demo
recommendations can be researched manually. Set `RESEARCH_AUTO_COUNT=0` for manual
research only. Reanalyze an existing saved channel to trigger automatic research;
merely reopening Insights never starts paid jobs.

Competitor discovery mixes relevance-ranked and view-ranked YouTube searches,
examining up to 48 unique candidates before selecting five. Ranking considers
title relevance, format, total views and average views per day, with at most two
videos per channel. No minimum view count is imposed on niche topics, and missing
metrics receive no performance bonus. Refresh existing reports after changing
the selection logic; saved reports retain their original competitor sample.

Research persists in MongoDB and runs independently of recommendation loading.
Restarting the worker reclaims expired leases. Refresh retains the previous report.
No in-memory substitute is used when the research database is unavailable.
Provider usage is recorded per report; quotas and provider charges still apply.

The feature exposes authenticated `/api/idea-research` create/list endpoints,
`/api/idea-research/:id` for detail, and `/:id/refresh` for refresh.
The imported IntelRadar app remains unchanged; selected deterministic collection
patterns are adapted in `research_service/` with attribution.

### Script Studio web references and images

Script Studio and the idea's script modal use the same configured web search
providers directly during generation and follow-up requests. This does not require
waiting for a competitor research job. Keep SearXNG and the Python page collector
running; the Express backend performs script research, so restart it after updates.

DeepSeek plans up to two focused factual-source queries and one SearXNG image
query. New script generation always attempts a source query and, when SearXNG is
configured, an image query even if the planner returns an empty plan. Pure wording
or pacing edits can skip new searches. **Find sources** and **Find images** explicitly
run the selected search while leaving the script unchanged. Up to three
pages from different domains are collected; search snippets are never promoted into
factual evidence. The planner is instructed to prefer primary studies, institutional
material and official documentation, but search discovery does not guarantee source
accuracy. Check important claims against the linked pages before recording.

The workspace has **Draft**, **Sources**, **Images**, and **Activity** tabs. Sources
shows collected excerpts and discovered links separately, so a failed page fetch
does not hide successful search results. Images shows previews and original-page
links, including a fallback when a remote preview fails. Activity lists completed
search stages, queries, result counts and collection outcomes. Cited links are included in copied and exported
Markdown. Image previews link to original pages and full images; image content and
licensing are not independently verified, and no usage rights are inferred.

References are saved with local script history. Full collected excerpts are also
stored server-side per authenticated user and script session for later edits, with
30-day expiry. Each session retains up to 12 sources and eight image candidates.
Web collection has a 45-second budget before drafting; the client allows up to two
minutes for the combined request. Provider failures are shown as limitations, and
unsupported factual statements are instructed to carry `[CHECK SOURCE]` markers.
Failed script generation preserves the existing draft rather than returning a
pretend researched result. Script searches add provider usage independently of
the competitor worker's daily job allowance.

**Auto** classifies the latest message as a question, refinement or new-script
request. Questions and critiques are answered only in chat; the server returns
`script: null` and `scriptUpdated: false`, and the frontend preserves the draft.
Explicit edits return a complete revised script. **Ask only** and **Edit script**
override classification. If classification fails, the draft is protected and the
request is handled as chat. On narrow screens, use **Draft & research** / **Chat**
to switch panes. Enter sends a message; Shift+Enter adds a line break.

### Research logs and troubleshooting

The backend and research worker print `[research]` JSON events with request/job
IDs, stage names, elapsed time, provider, query, result counts, collection outcomes,
HTTP status and connection error codes. Collector logs show host, extraction mode,
text length and elapsed time. Credentials, headers, full scripts and full page text
are not logged. Set `RESEARCH_LOGGING=0` to disable Node research logs.

Competitor job events appear in the **worker terminal**; interactive script events
appear in the **Express backend terminal**. The Activity tab shows the latest
completed script-research trace; it is not a live stream. Common failures:

- `ECONNREFUSED`: the configured SearXNG or collector service is not reachable.
- Search HTTP `403`: check SearXNG JSON output and instance access rules.
- Collector HTTP `401`: check that backend and collector tokens match.
- Empty image results: check the instance's enabled image engines.

Start SearXNG using [its setup guide](searxng/README.md) and the collector using
[its setup guide](research_service/README.md), then restart the backend and worker
after code or environment changes.

## Validation

```bash
cd backend
npm test
```

Sentiment and research tests mock providers and do not make paid API calls.
Run database integration tests against a disposable MongoDB server with
`TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test` from `backend/`.
They create and drop an isolated `onlycreators_research_test_<pid>` database.
Without that environment variable, database integration tests are skipped.
Collector tests run separately as described above.
For the mocked browser smoke test, start Vite on port 5174 and run
`CHROME_BINARY=/path/to/chrome python frontend/tests/research_smoke.py`
using a Python environment with Playwright installed. Omit `CHROME_BINARY`
to use Playwright's installed Chromium. The smoke test blocks external requests
and mocks all application API responses.

[COMPETITOR_RESEARCH_PLAN.md](COMPETITOR_RESEARCH_PLAN.md) records the design.

[ARCHITECTURE.md](ARCHITECTURE.md) contains the broader system design and an
October 2026 migration note. Its older local-model sections are historical.
