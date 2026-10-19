# 🛰️ IntelRadar — Autonomous Competitor Intelligence

Autonomous multi-agent platform that tracks digital competitors, parses dynamic
pricing, analyses customer sentiment across video and web, and renders a live
competitor war-room.

> **No demo data.** The store ships empty and every profile is the product of a
> real scan. Scanning requires a Google Gemini API key.

---

## ✨ Features

- **Three scan engines** — `Fast` (Crawl4AI markdown), `Live` (Playwright
  scroll + screenshot) and `Agent` (an LLM-driven browser agent via
  [browser-use](https://github.com/browser-use/browser-use) that clicks into
  pricing pages and handles interactive flows).
- **Live signals (freshness)** — every scan pulls recent news (Google News RSS)
  and the newest YouTube comments, so analysis reflects what is happening *now*
  instead of the model's training cutoff. No extra API keys required.
- **Continuous monitoring** — an opt-in scheduler rescans every tracked
  competitor on an interval, diffs the result and alerts you (Discord / Slack /
  email via Apprise) when pricing, features, threat or coverage change.
- **Video sentiment** — yt-dlp downloads review audio and local
  faster-whisper transcribes it.
- **Multi-agent analysis** — Gemini produces pricing tiers, feature/maturity
  maps, complaint lists, a SWOT matrix, a 5-axis radar and attack vectors.
- **Resilient model fallback** — a configurable chain of models with retry and
  backoff survives transient `503`/`429` overload.
- **Like-for-like comparison** — every profile carries a canonical market
  segment, so the radar only ever compares same-market rivals. Unrelated
  products show solo, and cross-segment comparison is opt-in (`scope="all"`).
- **War-room dashboard** — a Next.js app with a radar comparison, threat gauge,
  pricing/feature tables and an activity timeline, in light and dark themes.
- **Client-ready exports** — one-click **PDF** (print-ready report) and
  **Markdown** teardowns, built for sharing with clients or pasting into Notion.

---

## 🏗️ Architecture

```
[Target pages]  ──> Crawl4AI / Playwright / browser-use agent ─┐
                                                               ├─> FastAPI engine ─> Gemini swarm ─> Next.js dashboard
[YouTube video] ──> yt-dlp + faster-whisper ───────────────────┘
```

---

## 📁 Project structure

```
InterRadar/
├── backend/                    FastAPI intelligence engine
│   ├── app/
│   │   ├── main.py             app factory + router registration
│   │   ├── core/config.py      env-driven settings (single source of truth)
│   │   ├── api/
│   │   │   ├── schemas.py      Pydantic request models
│   │   │   └── routes/         one module per resource
│   │   │       ├── health.py
│   │   │       ├── competitors.py
│   │   │       ├── scans.py
│   │   │       ├── analysis.py
│   │   │       └── compare.py
│   │   └── services/           business logic
│   │       ├── scraper.py      crawl + browser agent
│   │       ├── media.py        yt-dlp + whisper
│   │       ├── analyzer.py     Gemini analysis + model fallback
│   │       └── cache.py        JSON store
│   ├── data/                   intelligence store (gitignored)
│   ├── media_storage/          downloaded audio (gitignored)
│   ├── screenshots/            browser captures (gitignored)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   Next.js war-room dashboard
│   ├── src/app/                routes, root layout, global theme
│   ├── src/components/
│   │   ├── ui/                 shadcn/ui primitives
│   │   └── dashboard/          feature components
│   └── src/lib/                shared types + helpers
│
├── desktop/                    Tauri 2 desktop shell
│   ├── src-tauri/              Rust app, config, icons, bundled resources
│   └── engine/                 PyInstaller entry point + build script
│
├── start_intelradar.sh         launch backend + frontend (foreground)
├── start_daemon.sh             launch both in the background
├── LICENSE
└── README.md
```

---

## 🚀 Quick start

### 1. Configure the API key

The first time the dashboard opens without a key, the **Settings** dialog
appears automatically. Paste your key there — it is stored locally in the
user-data folder and applied without restarting anything.

For scripted setups you can still use `backend/.env`:

```bash
cp backend/.env.example backend/.env
# edit backend/.env and set GEMINI_API_KEY
```

Get a key from Google AI Studio: <https://aistudio.google.com/apikey>

Precedence: settings saved from the app → environment variables → built-in
defaults.

### 2. Run everything

**Open the dashboard, not the API port.**

```bash
./start_intelradar.sh        # foreground; Ctrl+C stops both services
```

| Service | URL | Notes |
| --- | --- | --- |
| **Dashboard** | **<http://localhost:3000>** | This is the app you use |
| Engine / API | <http://127.0.0.1:8000> | API only — `/` returns 404 by design; docs at `/docs` |

The launcher waits for the engine to finish its (slow) ML imports before
starting the dashboard. On a fresh install with no key, the Settings dialog
opens automatically so you can paste your Gemini key.

Background mode:

```bash
./start_daemon.sh            # starts both services, logs to */server.log
./stop_intelradar.sh         # stops them
```

If port 8000 is already busy (for example, an older `uvicorn` is still running),
the launcher tells you instead of failing silently. Stop the old process first,
or use `./start_daemon.sh`, which deliberately restarts the project ports.

### Manual startup (two terminals)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (second terminal)
cd frontend
pnpm install
pnpm dev --port 3000
```

Then open **<http://localhost:3000>**.

---

## 🖥️ Desktop app (Tauri)

The desktop build bundles the dashboard, the Python engine (PyInstaller) and
Chromium for Playwright into one app. The Rust shell starts the engine on a
random loopback port with a per-launch API token, injects the port/token into
the webview, and stops the engine when the app exits.

```bash
# 1. Freeze the engine
backend/.venv/bin/python desktop/engine/build.py

# 2. Optional but required for crawls in a clean build:
PLAYWRIGHT_BROWSERS_PATH="$PWD/desktop/src-tauri/resources/playwright" \
  python -m playwright install chromium

# 3. Build installers for the current OS
pnpm --dir desktop install
pnpm --dir desktop tauri build
```

Artifacts land in `desktop/src-tauri/target/release/bundle/`:

| OS | Formats |
| --- | --- |
| Linux | `.deb`, `.rpm`, `.AppImage` |
| macOS | `.dmg`, `.app` (via CI) |
| Windows | `.msi`, `.exe` installer (via CI) |

`.github/workflows/desktop.yml` builds all four targets on a manual run or a
`v*` tag.

**Notes**

- Builds are currently **unsigned** — macOS/Windows will warn until code signing
  and notarization are configured.
- Linux installers are ~610–645 MB because they include Chromium and the
  frozen ML engine.
- Video transcription still expects `ffmpeg` on `PATH`; bundling it is a
  follow-up.
- See `desktop/README.md` for development (`pnpm --dir desktop tauri dev`)
  and engine details.

---

## ⚙️ Configuration

### `backend/.env`

| Variable                  | Default                                                              | Purpose                                    |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `GEMINI_API_KEY`          | —                                                                    | **Required.** Analysis key.                |
| `GEMINI_MODEL`            | `gemini-2.5-flash`                                                   | Primary analysis model.                    |
| `GEMINI_FALLBACK_MODELS`  | `gemini-2.5-flash-lite,gemini-2.0-flash,gemini-2.0-flash-lite,gemini-2.5-pro` | Tried in order when a model is unavailable. |
| `BROWSER_AGENT_MODEL`     | `gemini-2.5-flash`                                                   | Model used by the `Agent` scan engine.     |
| `BROWSER_AGENT_MAX_STEPS` | `25`                                                                 | Max agent steps per run.                   |
| `BROWSER_AGENT_TIMEOUT`   | `300`                                                                | Wall-clock limit (seconds) for one run.    |
| `NEWS_MAX_ITEMS`          | `8`                                                                  | Recent news items per scan.                |
| `NEWS_LOOKBACK_DAYS`      | `120`                                                                | Drop news older than this many days.       |
| `COMMENTS_MAX`            | `40`                                                                 | YouTube comments pulled per scan.          |
| `MONITOR_ENABLED`         | `false`                                                              | Turn on scheduled rescans.                 |
| `MONITOR_INTERVAL_MINUTES`| `360`                                                                | Rescan interval.                           |
| `ALERT_URLS`              | —                                                                    | Apprise URLs for change alerts.            |
| `CORS_ORIGINS`            | `http://localhost:3000,http://127.0.0.1:3000`                        | Comma-separated allowed origins.           |
| `API_TOKEN`               | —                                                                    | Optional token required on `/api` requests.|
| `INTELRADAR_DATA_DIR`     | OS user-data dir                                                     | Override where profiles/screenshots live.  |
| `INTELRADAR_TRIAL_SCANS`  | `5`                                                                  | Free full scans before a license is needed.|
| `INTELRADAR_LICENSE_GRACE_DAYS` | `14`                                                           | Offline days a validated key keeps working.|
| `INTELRADAR_LICENSE_BYPASS` | `false`                                                            | Development escape hatch (no gating).      |

### `frontend/.env.local`

| Variable               | Default                 | Purpose                     |
| ---------------------- | ----------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8000` | Backend base URL.           |

### Where data lives

Runtime data is written to the OS user-data directory, never inside the
application folder (required for packaged desktop builds):

| Platform | Location |
| -------- | -------- |
| Linux | `~/.local/share/IntelRadar` (or `$XDG_DATA_HOME/IntelRadar`) |
| macOS | `~/Library/Application Support/IntelRadar` |
| Windows | `%LOCALAPPDATA%\IntelRadar` |

Set `INTELRADAR_DATA_DIR` to override. On first run, an existing
`backend/data/competitors.json` and `backend/screenshots/` are copied over once
(profiles are merged, keeping the newest scan per competitor).

User-editable settings (API key, model, monitoring, alerts) are stored in
`settings.json` in the same folder with owner-only permissions. The Settings
dialog (gear icon) edits them; the API key is never returned by the API. Trial
usage and the activated license key live in `license.json` next to it.

### Licensing

- **5 free full scans** by default (`INTELRADAR_TRIAL_SCANS`).
- Activate a **Lemon Squeezy-compatible license key** in Settings to unlock
  unlimited scans; scheduled monitoring requires an active license.
- Activation is validated online, then cached for **14 offline days**
  (`INTELRADAR_LICENSE_GRACE_DAYS`). Re-check from Settings at any time.
- Development bypass: `INTELRADAR_LICENSE_BYPASS=true`.
- When the trial ends, "New scan" opens Settings instead of the scan dialog,
  and the API returns `402` for scan requests.

### Continuous monitoring

Set `MONITOR_ENABLED=true` to rescan every tracked competitor on an interval,
diff each result and surface the changes in the dashboard. To also receive
alerts, add one or more [Apprise](https://github.com/caronc/apprise) URLs:

```bash
MONITOR_ENABLED=true
MONITOR_INTERVAL_MINUTES=360
ALERT_URLS=discord://webhook_id/webhook_token,mailto://user:app_password@gmail.com
```

Trigger a pass on demand with `POST /api/monitor/run`, and inspect state with
`GET /api/monitor/status`.

---

## 🔌 API reference

| Method   | Endpoint                       | Purpose                                            |
| -------- | ------------------------------ | -------------------------------------------------- |
| `GET`    | `/api/health`                  | Liveness + active model chain.                     |
| `GET`    | `/api/competitors`             | List all stored profiles.                          |
| `GET`    | `/api/competitors/{id}`        | Fetch one profile.                                 |
| `DELETE` | `/api/competitors/{id}`        | Delete a profile.                                  |
| `POST`   | `/api/scan/url`                | Scrape a single URL.                               |
| `POST`   | `/api/scan/video`              | Download + transcribe a YouTube URL.               |
| `POST`   | `/api/scan/news`               | Recent news for a query (Google News RSS).         |
| `POST`   | `/api/scan/comments`           | Newest YouTube comments for a video.               |
| `POST`   | `/api/scan/autonomous`         | Full pipeline: web + news + video/comments → analyse → persist. |
| `POST`   | `/api/analyze`                 | Analyse supplied raw text.                         |
| `POST`   | `/api/compare`                 | Radar data for same-segment peers (`scope="all"` to override). |
| `GET`    | `/api/settings`                | Effective settings (key is masked, never returned).|
| `PUT`    | `/api/settings`                | Persist + apply settings without a restart.        |
| `POST`   | `/api/settings/validate-key`   | Check a Gemini key against Google (free, no tokens).|
| `GET`    | `/api/license`                 | Trial/license state (key is masked).               |
| `POST`   | `/api/license/activate`        | Validate and store a license key.                  |
| `POST`   | `/api/license/refresh`         | Re-check the stored key online.                    |
| `DELETE` | `/api/license`                 | Forget the stored key (trial usage is kept).       |
| `GET`    | `/api/monitor/status`          | Scheduler state + next run.                        |
| `POST`   | `/api/monitor/run`             | Rescan all competitors now and report changes.     |
| `GET`    | `/screenshots/*`               | Browser-agent captures (static).                   |

---

## ➕ Adding a feature

**Backend** — new resource = one route module + one service:

1. Add request models to `app/api/schemas.py`.
2. Create `app/api/routes/<feature>.py`:
   ```python
   from fastapi import APIRouter
   router = APIRouter(prefix="/api", tags=["<feature>"])
   ```
3. Register it in `ROUTERS` in `app/main.py`.
4. Put business logic in `app/services/<feature>.py`.
5. Add any settings to `app/core/config.py` (read env only there).

**Frontend** — new view = one route + one component:

1. Add a page under `src/app/` (e.g. `src/app/reports/page.tsx`).
2. Build UI in `src/components/dashboard/` (reuse `ui/` primitives).
3. Add shared types/helpers in `src/lib/`.

---

## 🧰 Requirements

- Python **3.11+**
- Node **20+** with **pnpm**
- **ffmpeg** on `PATH` (YouTube audio extraction)
- Chromium for Playwright (`python -m playwright install chromium`)

---

## 📄 License

[MIT](LICENSE)
