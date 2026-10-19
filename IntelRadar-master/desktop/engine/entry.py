"""Entry point for the frozen IntelRadar engine.

The Tauri shell starts this process with a free port and a per-launch API token
in the environment. All user data is redirected with INTELRADAR_DATA_DIR.
"""

import os


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))

    import uvicorn

    # Import statically so PyInstaller bundles the backend package and passing
    # the object avoids frozen-mode import-string resolution.
    from app.main import app as application

    uvicorn.run(
        application,
        host="127.0.0.1",
        port=port,
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    main()
