"""Build the engine binary and copy it into the Tauri resources folder.

Usage (from the repository root):

    backend/.venv/bin/python desktop/engine/build.py

On CI, install ``pyinstaller`` first (or let this script install it).
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEST_DIR = REPO / "desktop" / "src-tauri" / "resources" / "engine"
EXE_NAME = "intelradar-engine.exe" if os.name == "nt" else "intelradar-engine"


def main() -> int:
    try:
        subprocess.run(
            [sys.executable, "-m", "PyInstaller", "--version"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        # Some virtualenvs are created without pip (e.g. with uv); bootstrap it.
        subprocess.run(
            [sys.executable, "-m", "ensurepip", "--upgrade"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("Installing PyInstaller…")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "pyinstaller"],
            check=True,
        )

    subprocess.run(
        [
            sys.executable,
            "-m",
            "PyInstaller",
            "--clean",
            "--noconfirm",
            "intelradar-engine.spec",
        ],
        cwd=HERE,
        check=True,
    )

    built = HERE / "dist" / EXE_NAME
    if not built.exists():
        print(f"Build finished but {built} is missing.", file=sys.stderr)
        return 1

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    destination = DEST_DIR / EXE_NAME
    shutil.copy2(built, destination)
    if os.name != "nt":
        destination.chmod(0o755)

    print(f"Engine bundled at {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
