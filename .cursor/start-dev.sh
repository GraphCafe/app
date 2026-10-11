#!/usr/bin/env bash
set -euo pipefail

PORT=43127

if command -v ss >/dev/null 2>&1 && ss -tln | grep -q ":${PORT} "; then
  echo "Port ${PORT} already in use; skipping dev server start."
  exit 0
fi

npm run dev &
pid=$!

for _ in $(seq 1 180); do
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; then
    echo "Next.js ready on http://127.0.0.1:${PORT}/"
    wait "$pid"
    exit $?
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "Dev server exited before port ${PORT} became ready."
    exit 1
  fi
  sleep 1
done

echo "Timed out waiting for Next.js on port ${PORT}."
kill "$pid" 2>/dev/null || true
exit 1
