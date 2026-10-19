#!/usr/bin/env bash
#
# Run IntelRadar in the background (logs in backend/server.log and
# frontend/server.log). Stop everything with ./stop_intelradar.sh
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# --- Prerequisites -------------------------------------------------------
if [ ! -x "$DIR/backend/.venv/bin/uvicorn" ]; then
  echo "✗ Backend environment missing. See README quick start."
  exit 1
fi
if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo "✗ Frontend dependencies missing: cd frontend && pnpm install"
  exit 1
fi

# --- Stop stale instances on the project ports ---------------------------
echo "Checking existing instances..."
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# --- Engine --------------------------------------------------------------
echo "Starting engine on http://127.0.0.1:8000 ..."
cd "$DIR/backend"
nohup "$DIR/backend/.venv/bin/uvicorn" app.main:app \
  --host 127.0.0.1 --port 8000 > "$DIR/backend/server.log" 2>&1 &
BACKEND_PID=$!
echo "Engine PID: $BACKEND_PID"

READY=0
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "✗ Engine exited. See backend/server.log"
    exit 1
  fi
  sleep 1
done
if [ "$READY" -ne 1 ]; then
  echo "✗ Engine did not become healthy within 60 seconds."
  exit 1
fi
echo "✓ Engine ready (docs: http://127.0.0.1:8000/docs)"

# --- Dashboard -----------------------------------------------------------
echo "Starting dashboard on http://localhost:3000 ..."
cd "$DIR/frontend"
nohup pnpm dev --port 3000 > "$DIR/frontend/server.log" 2>&1 &
FRONTEND_PID=$!
echo "Dashboard PID: $FRONTEND_PID"

sleep 4
echo ""
echo "=========================================================="
echo "  Dashboard : http://localhost:3000"
echo "  API docs  : http://127.0.0.1:8000/docs"
echo "  Logs      : backend/server.log, frontend/server.log"
echo "  Stop      : ./stop_intelradar.sh"
echo "=========================================================="
