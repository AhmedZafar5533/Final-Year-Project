# Engine sidecar

The desktop app bundles the FastAPI engine as a single executable:

```bash
backend/.venv/bin/python desktop/engine/build.py
```

This installs PyInstaller if needed, builds `dist/intelradar-engine` (or
`.exe` on Windows), and copies it to
`desktop/src-tauri/resources/engine/`, where Tauri packages it.

At runtime the Rust shell:

1. Picks a free loopback port and a random API token.
2. Starts the engine with `PORT`, `API_TOKEN`, `CORS_ORIGINS=*` and
   `INTELRADAR_DATA_DIR=<OS app-data dir>`.
3. Waits for `/api/health`.
4. Injects `window.__INTELRADAR__ = { apiBase, token }` into the webview.
5. Kills the engine when the app exits.

For release builds, also bundle Chromium for Playwright:

```bash
PLAYWRIGHT_BROWSERS_PATH=desktop/src-tauri/resources/playwright \
  python -m playwright install chromium
```

Video transcription additionally needs `ffmpeg` on `PATH` (bundling it is a
follow-up item).
