# IntelRadar — Product & Shipping Plan

_Last updated: 2026-10-17_

This is the working document for turning IntelRadar from a local MVP into a paid
desktop product. It captures **decisions already made**, **what is done**, and
**what to do next**, so any future session can pick up without re-deriving the
strategy.

---

## 1. What this product is

**One-line pitch:** a competitor teardown in five minutes — scan a competitor's
site, pricing, reviews and news, then export a client-ready intelligence report.

**Who pays:** indie SaaS founders, product marketers, and agencies/consultants
who already bill for competitive research.

**What makes it different:** real scans (no canned data), three scan engines,
live news/YouTube signals, same-market-only comparisons, monitoring and alerts.

---

## 2. Current status (2026-10-17)

### Working

- Next.js dashboard (light/dark) with responsive layout and mobile section picker
- FastAPI engine: scans, Gemini analysis, news, YouTube, monitoring/alerts
- Canonical market segments so unrelated companies are never compared
- Same-segment comparison enforced in API **and** UI, with regression tests
- Hydration warning fixed (pre-paint theme script + `suppressHydrationWarning`)
- Scroll-spy fixed (deterministic active section, works after data loads)

### Done today (shipping foundations)

| Item | Status | Where |
| --- | --- | --- |
| Runtime data moved to OS user-data dir (+ one-time migration) | ✅ | `backend/app/core/paths.py`, `core/config.py` |
| Optional local API token (`API_TOKEN`, header or Bearer) | ✅ | `backend/app/main.py` |
| CORS defaults to loopback instead of `*` | ✅ | `backend/app/core/config.py` |
| Frontend sends the token when configured | ✅ | `lib/dashboard.ts` (`apiFetch`), `dashboard.tsx`, `hooks.ts` |
| Markdown report export (client-side, no new deps) | ✅ | `lib/report.ts`, Overview "Markdown" |
| PDF export via a print-ready report (gauge, SWOT, pricing) | ✅ | `lib/report-html.ts`, Overview "Export PDF" |
| In-app settings: Gemini key, model, monitoring, alerts | ✅ | `settings-dialog.tsx`, `api/routes/settings.py` |
| First-run onboarding: Settings opens when no key is set | ✅ | `dashboard.tsx` |
| Settings persist to `settings.json` (0600) and apply live | ✅ | `core/settings.py`, `core/config.py` |
| Key validation endpoint (no tokens consumed) | ✅ | `POST /api/settings/validate-key` |
| Trial (5 full scans) + license activation, offline grace | ✅ | `core/licensing.py`, `api/routes/license.py` |
| Scan gating: API `402`, UI routes to Settings, monitoring licensed-only | ✅ | `routes/scans.py`, `analysis.py`, `scheduler.py`, `dashboard.tsx` |
| License UI in Settings (activate, re-check, remove, trial badge) | ✅ | `settings-dialog.tsx` |
| Tauri 2 desktop shell + sidecar spawning + runtime config | ✅ | `desktop/src-tauri/src/lib.rs` |
| Frozen Python engine (PyInstaller) bundled with the app | ✅ | `desktop/engine/` |
| Linux installers built locally (.deb, .rpm, .AppImage) | ✅ | `desktop/src-tauri/target/release/bundle/` |
| CI matrix for macOS/Windows/Linux installers | ✅ | `.github/workflows/desktop.yml` |
| README config/storage/API docs updated | ✅ | `README.md` |
| Regression tests (23 passing) | ✅ | `tests/test_comparison_scope.py`, `test_settings.py`, `test_license.py` |

### Verified

```bash
# Backend tests
cd backend && .venv/bin/python -m unittest discover -s tests -v   # 23 passing

# Frontend
cd frontend && npx tsc --noEmit -p . && npm run build             # clean

# Token behaviour (test instance on :8001)
/api/health                           -> 200 without token
/api/competitors                      -> 401 without token
/api/competitors + X-IntelRadar-Token -> 200
/api/competitors + Bearer token       -> 200
CORS preflight                        -> 200

# Settings end-to-end (Playwright, fresh data dir, no key)
settings auto-opens on first run      -> yes
save monitor/interval/alerts          -> persisted + applied live
values survive reload                 -> yes
escape closes / gear reopens          -> yes
mobile 390px overflow                 -> 0px, 0 console errors

# PDF export (Playwright, live data)
new report window opens               -> yes
title / sections / tiers / SWOT       -> correct (10 sections, 4 tiers, 4 cells)
visual QA (gauge, 2x2 pricing)        -> screenshot reviewed
0 console errors                      -> yes

# Licensing end-to-end (fresh data dir, trial pre-exhausted)
GET /api/license                      -> trial_used 5, can_scan false
POST /api/scan/autonomous             -> 402 without a license
Settings shows "0 of 5 free scans left" / "Trial ended"
"New scan" opens Settings, not the scan form
0 console errors

# Desktop packaging
cargo check (Tauri shell)              -> clean
frozen engine boot (325 MB)            -> /api/health 200, token 401/200
Tauri release build                    -> clean
Linux bundles                          -> .deb/.rpm 608 MB, .AppImage 643 MB
Bundle contents                         -> engine + Chromium + static frontend
Engine shutdown                         -> process group killed (no orphan server)
```

**Operational note:** if a backend is already running on port 8000, restart it
to pick up the new storage location and token guard. Existing profiles are
copied automatically to the OS data directory on first import; the old
`backend/data` copy is left untouched.

---

## 3. Architecture decisions

### Packaging

| Decision | Choice | Why |
| --- | --- | --- |
| Desktop shell | **Tauri 2** (+ auto-updater) | ~10 MB shell, signed updates, low memory |
| Engine | Current FastAPI backend as a **PyInstaller sidecar** | Reuses all Python logic |
| Platforms | **macOS + Windows first**, Linux AppImage later | Where the buyers are |
| Bundle weight | ~300–500 MB (Chromium + ffmpeg + Whisper) | Acceptable if positioned as a pro tool |
| Compute key | **BYO Gemini key** on desktop; managed credits on cloud tier | No inference cost/abuse on desktop |

Planned repo shape:

```
apps/desktop/     Tauri shell, updater, license gate
apps/web/         current Next.js dashboard
services/engine/  current FastAPI backend (sidecar)
packages/shared/  types + segment logic + license client
```

### Storage & security (implemented)

- Data lives in `~/.local/share/IntelRadar` (Linux),
  `~/Library/Application Support/IntelRadar` (macOS),
  `%LOCALAPPDATA%\IntelRadar` (Windows); override with `INTELRADAR_DATA_DIR`.
- Bind the engine to **127.0.0.1** only.
- When `API_TOKEN` is set, every `/api` request except health/preflight needs
  `X-IntelRadar-Token` (or `Authorization: Bearer …`).
- The desktop shell should generate a fresh token per launch and pass it to the
  frontend as `NEXT_PUBLIC_API_TOKEN` at build/serve time.

---

## 4. Business model (decided)

### Distribution

- **Primary store:** Polar.sh / Lemon Squeezy / Paddle (merchant of record,
  license keys, VAT handled, ~4–6% + fee).
- **itch.io:** free demo build only — it has no license-key system and weak
  software discovery. Link to the paid store.
- **Own landing page:** best margin long term.

### Tiers

| Tier | Price | Includes |
| --- | --- | --- |
| **Free trial** | $0 | 1 competitor, 2 scans, Fast engine, limited export |
| **Personal** | **$29 launch / $39 regular**, one-time | BYO key, 3 competitors, all engines, local scans, 1 year updates |
| **Pro** | **$79–99** one-time or **$12/mo** | Unlimited competitors, monitoring + alerts, PDF/MD export, updates |
| **Cloud / Team** | **$39–79/mo** | Managed Gemini key + scan credits, cloud sync, seats, API |

Rules of thumb:

- Do not bundle the Gemini key in the desktop app; proxy cloud calls server-side.
- Price the **output** (teardown/export), not the AI.
- Launch early-bird at $29, raise to $39–49 after the first ~50 customers.
- Usage caps: Agent engine is 10–50× more expensive than Fast — Pro-only.

### What it is worth

- Pre-revenue: code replacement cost ~$3–10k, **market value ~$0** until paid
  customers exist.
- ~$1k MRR: roughly $30–60k as a micro-SaaS asset (2–5× ARR).
- ~$5k MRR: roughly $150–300k with low churn.
- One-time desktop sales are cash, not a recurring asset. Cloud Pro is the goal.

### Realistic revenue math

$39 × 10,000 downloads × 2% conversion = **~$7.8k gross/year** before fees,
refunds, signing and support. “Passive” only after support load drops and
marketing is repeatable.

---

## 5. Roadmap

### Phase 0 — MVP hardening (done)

- [x] Responsive UI (mobile picker, cards instead of scroll tables)
- [x] Hydration mismatch fix
- [x] Scroll-spy + mobile section navigation fix
- [x] Same-segment comparison + tests
- [x] Storage relocation + migration
- [x] Local API token + loopback CORS
- [x] Markdown report export

### Phase 1 — Paid-product foundations (next)

- [x] First-run onboarding: Gemini key entry, validation, storage path
- [x] Settings UI (API key, model, monitoring, alerts, data dir)
- [x] Packaging with Tauri 2 + PyInstaller sidecar
      - [x] Linux installers built and verified locally
      - [x] Engine + Chromium bundled into the app
      - [ ] Run the GitHub Actions matrix to produce macOS/Windows artifacts
      - [ ] Bundle ffmpeg (video transcription currently needs it on PATH)
- [ ] Code signing / notarization (Apple $99/yr, Windows cert)
- [ ] Signed auto-updater (Tauri updater)
- [x] License keys (Lemon Squeezy-compatible validation) + offline grace
      - [ ] Create the store product + set the price/link (external account)
      - [ ] Device limit / seat policy (optional; not enforced yet)
- [ ] Proper EULA / privacy policy / refund policy
- [ ] Remove MIT for official builds (or adopt open-core: engine MIT, app proprietary)
- [x] Export to **PDF** (print-ready report + browser Save as PDF)

### Phase 2 — Paid launch

- [ ] Landing page with demo video and 3 screenshots
- [ ] Free demo build on itch.io → paid link
- [ ] Polar/Lemon Squeezy checkout + license delivery
- [ ] Support email + FAQ + changelog
- [ ] Crash reporting (Sentry) and opt-in telemetry
- [ ] First 20 customers via Product Hunt, indie/SaaS/PM communities

### Phase 3 — Recurring revenue

- [ ] Hosted cloud plan (managed key, scan credits, rate limits)
- [ ] Scheduled monitoring in the cloud (not only local)
- [ ] Team workspaces, seats, shared exports
- [ ] API access for agencies
- [ ] Pricing test: $19 vs $29 vs $39/mo

### Phase 4 — Growth

- [ ] Affiliate/referral program
- [ ] Templates by industry (SaaS, e-commerce, agencies)
- [ ] Integrations (Notion, Slack, Google Sheets exports)
- [ ] Annual plans and regional (PPP) pricing

---

## 6. Known risks / open questions

- **Scraping & YouTube ToS:** commercial sale increases exposure. Keep video
  analysis optional; respect robots/ToS; do not advertise bypassing logins.
- **ffmpeg licensing:** avoid bundling a GPL build in closed binaries; prefer
  LGPL builds or require system ffmpeg.
- **Model churn:** Gemini versions and prices change; keep the fallback chain and
  a provider abstraction.
- **Support:** expect 5–10 hours/month (installs, keys, site breakage).
- **Piracy:** license keys are friction, not protection. Optimize for honest
  buyers.
- **“Passive income” expectation:** treat this as a small business with a
  support inbox, not a lottery ticket.
- **Open question:** keep the repo MIT (community) or close official builds?
  Current recommendation: proprietary EULA for shipped binaries, optional open
  engine later.
- **Open question:** cloud provider and budget for Phase 3.

---

## 7b. Desktop packaging (implemented)

- **Shell:** Tauri 2 (`desktop/`), custom app icon, minimum window 380×640,
  starts at 1440×960.
- **Engine:** PyInstaller one-file binary (`desktop/engine/build.py`) placed in
  `desktop/src-tauri/resources/engine/` and bundled as a resource.
- **Runtime:** Rust picks a free loopback port + random API token, starts the
  engine with `INTELRADAR_DATA_DIR` pointed at the OS app-data dir, waits for
  `/api/health`, injects `window.__INTELRADAR__ = { apiBase, token }`, and kills
  the engine's whole process group on exit (PyInstaller one-file forks).
- **Frontend:** `TAURI_BUILD=1` produces a static export in `frontend/out`;
  normal browser dev/build is unchanged (PPR/cache components kept).
- **Browsers:** CI bundles Chromium into `resources/playwright`; the shell sets
  `PLAYWRIGHT_BROWSERS_PATH`.
- **Artifacts:** Linux `.deb`/`.rpm`/`.AppImage` verified locally; macOS/Windows
  via `.github/workflows/desktop.yml`.
- **Not done:** code signing, notarization, auto-updater, ffmpeg bundling,
  store listing metadata, macOS/Windows test passes.

## 8. Settings & licensing (implemented)

- Gear icon in the header opens the Settings dialog (first run opens it
  automatically when no key is configured).
- Fields: Gemini API key (write-only; masked hint returned), model, scheduled
  rescans, interval (15–10,080 min), Apprise alert URLs.
- Persisted to `<user-data>/settings.json` (mode 0600). Precedence:
  **saved settings → env vars → defaults**.
- Changes apply immediately: analyzer/browser agent read config at call time and
  the monitoring scheduler is reloaded.
- `POST /api/settings/validate-key` checks a key via Google's free model list.

### Licensing

- Trial: **5 free full scans** (`INTELRADAR_TRIAL_SCANS`). Only successful
  scans consume credit.
- Activation: Lemon Squeezy-compatible key, validated online, stored in
  `license.json` (0600), cached for **14 offline days**
  (`INTELRADAR_LICENSE_GRACE_DAYS`).
- Enforcement: `/api/scan/autonomous` and `/api/analyze` return `402` when the
  trial is exhausted; scheduled monitoring requires an active license.
- UI: Settings shows trial/license status with activate, re-check and remove.
  The main "New scan" button opens Settings when no scans remain.
- Dev bypass: `INTELRADAR_LICENSE_BYPASS=true`.
- Still external: create the store product/checkout in Lemon Squeezy and put the
  real key format in the docs.

## 7. How to run / verify

```bash
# Backend
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend
pnpm dev            # or npm run dev

# Tests
cd backend && .venv/bin/python -m unittest discover -s tests -v
cd frontend && npx tsc --noEmit -p .
```

New environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `INTELRADAR_DATA_DIR` | OS user-data dir | Override profile/screenshot storage |
| `API_TOKEN` | empty | Require a token on `/api` requests |
| `CORS_ORIGINS` | localhost:3000 / 127.0.0.1:3000 | Allowed browser origins |

---

## 9. Immediate next actions (pick up here)

1. Run the **desktop GitHub Actions workflow** to produce macOS/Windows
   artifacts, then test them on real machines.
2. Create the **Lemon Squeezy product + checkout**, then test a real key.
3. Write the landing page and collect a waitlist before the full packaging push.
4. Code signing / notarization + signed auto-updater.
5. Bundle ffmpeg (or disable video transcription gracefully when it is absent).
