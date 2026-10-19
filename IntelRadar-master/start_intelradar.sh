#!/usr/bin/env bash
#
# Run IntelRadar in the foreground: engine + dashboard in one terminal.
# Ctrl+C stops both.
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# --- Prerequisites -------------------------------------------------------
if [ ! -x "$DIR/backend/.venv/bin/uvicorn" ]; then
  echo "✗ Backend environment missing."
  echo "  cd backend && python -m venv .venv && source .venv/bin/activate"
  echo "  pip install -r requirements.txt && python -m playwright install chromium"
  exit 1
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo "✗ Frontend dependencies missing."
  echo "  cd frontend && pnpm install"
  exit 1
fi

if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
  echo "✗ Something is already running on port 8000."
  echo "  Stop that process first (Ctrl+C in its terminal), then rerun this script."
  exit 1
fi

if curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
  echo "✗ Something is already running on port 3000."
  echo "  Stop that process first, then rerun this script."
  exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ] && ! grep -q "GEMINI_API_KEY" "$DIR/backend/.env" 2>/dev/null; then
  echo "⚠ No Gemini key found yet. The Settings dialog will open on first launch."
fi

# --- Engine --------------------------------------------------------------
echo "→ Starting engine on http://127.0.0.1:8000 ..."
cd "$DIR/backend"
"$DIR/backend/.venv/bin/uvicorn" app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "→ Stopping engine (pid $BACKEND_PID) ..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Imports of the ML stack make startup take 10-20s on a cold machine.
READY=0
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "✗ Engine exited during startup. Check the log above."
    exit 1
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "✗ Engine did not become healthy within 60 seconds."
  exit 1
fi

echo "✓ Engine ready (API docs: http://127.0.0.1:8000/docs)"

# --- Dashboard -----------------------------------------------------------
echo "→ Starting dashboard on http://localhost:3000 ..."
echo ""
cd "$DIR/frontend"
pnpm dev --port 3000
