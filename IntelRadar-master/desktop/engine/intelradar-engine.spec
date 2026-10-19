# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the IntelRadar engine (one-file binary).

Build with:

    python desktop/engine/build.py

The resulting executable is copied to
``desktop/src-tauri/resources/engine/`` so Tauri bundles it with the app.
"""

import os
import sys

from PyInstaller.utils.hooks import collect_all, collect_submodules

BACKEND = os.path.abspath(os.path.join(SPECPATH, "..", "..", "backend"))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

datas = []
binaries = []
hiddenimports = []

# Heavy dependencies use dynamic imports; collect them explicitly.
PACKAGES = (
    "uvicorn",
    "fastapi",
    "starlette",
    "pydantic",
    "crawl4ai",
    "playwright",
    "browser_use",
    "faster_whisper",
    "yt_dlp",
    "feedparser",
    "trafilatura",
    "youtube_comment_downloader",
    "apscheduler",
    "apprise",
    "google.genai",
)

for package in PACKAGES:
    try:
        package_datas, package_binaries, package_hidden = collect_all(package)
    except Exception:
        # Optional integrations may be absent on some build machines; the
        # engine degrades gracefully (see browser_agent.is_available()).
        continue
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hidden

hiddenimports += collect_submodules("app")

a = Analysis(
    ["entry.py"],
    pathex=[BACKEND],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "IPython", "notebook"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="intelradar-engine",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)
