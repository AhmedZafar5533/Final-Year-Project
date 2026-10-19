#!/usr/bin/env bash
#
# Stop the background services started by ./start_daemon.sh.
# (Foreground mode from ./start_intelradar.sh is stopped with Ctrl+C.)
#
set -euo pipefail

echo "Stopping IntelRadar services on ports 8000 and 3000 ..."
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
echo "Done."
