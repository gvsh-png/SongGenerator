#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> Song Studio Local"
echo "    Starting MusicGen API on http://localhost:8787"
echo "    (first run downloads the model — can take several minutes)"
echo ""

python3 local-server/server.py &
API_PID=$!

echo "    Waiting for API health check…"
ready=0
for _ in $(seq 1 120); do
  if curl -sf http://localhost:8787/health >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "ERROR: MusicGen server exited. Run: npm run local-server:install"
    exit 1
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "ERROR: API did not become ready in time. Check logs above."
  exit 1
fi

echo "    API ready."
echo "    Starting UI at http://localhost:5173 (npm run dev:local)"
echo ""

npm run dev:local
