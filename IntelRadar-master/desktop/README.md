# IntelRadar desktop (Tauri)

The desktop build wraps the dashboard and engine in a native window:

```
Tauri (Rust)
├── starts the Python engine on a free loopback port with a random API token
├── waits for /api/health
├── opens the webview with window.__INTELRADAR__ = { apiBase, token }
└── kills the engine when the app exits
```

## Prerequisites

- Node 20+ with pnpm
- Rust 1.90+ (`rustup`)
- Python 3.11+ (the repository `backend/.venv` is used in development)
- Linux only: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

## Development

```bash
pnpm --dir frontend install
pnpm --dir desktop install
pnpm --dir desktop tauri dev
```

`tauri dev` starts the Next.js dev server itself (`scripts/dev-frontend.mjs`)
and the engine from `backend/.venv`. Engine output goes to
`<app-data>/engine.log`.

Stop any other dev server on port 3000 first — otherwise Next refuses to start
a second instance and Tauri may attach to the stale one.

## Build installers

```bash
# 1. Freeze the engine (installs PyInstaller if needed)
backend/.venv/bin/python desktop/engine/build.py

# 2. Optional: bundle Chromium so crawls work on a clean machine
PLAYWRIGHT_BROWSERS_PATH=desktop/src-tauri/resources/playwright \
  python -m playwright install chromium

# 3. Build (macOS .dmg, Windows .msi/.exe, Linux .AppImage/.deb)
pnpm --dir desktop tauri build
```

Installers land in `desktop/src-tauri/target/release/bundle/`:

| OS | Artifacts |
| --- | --- |
| macOS (Apple Silicon) | `dmg/IntelRadar_0.1.0_aarch64.dmg`, `macos/IntelRadar.app` |
| macOS (Intel) | `dmg/IntelRadar_0.1.0_x64.dmg`, `macos/IntelRadar.app` |
| Windows | `msi/IntelRadar_0.1.0_x64_en-US.msi`, `nsis/IntelRadar_0.1.0_x64-setup.exe` |
| Linux | `deb/`, `rpm/`, `appimage/` |

### Building on macOS / Windows

Tauri and PyInstaller must run on the target OS (the Python engine cannot be
cross-frozen). On a Mac:

```bash
backend/.venv/bin/python desktop/engine/build.py
pnpm --dir desktop tauri build
```

On Windows (PowerShell):

```powershell
backend\.venv\Scripts\python.exe desktop\engine\build.py
pnpm --dir desktop tauri build
```

Neither local command requires a Linux machine. Alternatively, push and run
`.github/workflows/desktop.yml`, which builds all four targets and uploads the
installers as workflow artifacts.

### Notes

- `INTELRADAR_ENGINE_BIN=/path/to/intelradar-engine` overrides the engine
  location (useful for testing a release build).
- Video transcription still needs `ffmpeg` on `PATH`; bundling it and the
  Whisper model is a follow-up.
- Builds are unsigned until the Apple/Windows certificates are configured.
- GitHub Actions builds all four targets:
  `.github/workflows/desktop.yml` (manual dispatch or `v*` tags).
