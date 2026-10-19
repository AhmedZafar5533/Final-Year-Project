Bundled Chromium for Playwright lives here in release builds.

Created by CI with:

    PLAYWRIGHT_BROWSERS_PATH=desktop/src-tauri/resources/playwright \
      python -m playwright install chromium

The Rust shell points `PLAYWRIGHT_BROWSERS_PATH` at this folder when it exists.
