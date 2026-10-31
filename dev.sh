#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
  echo "Creating Python virtualenv and installing backend dependencies..."
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install --upgrade pip -q
  backend/.venv/bin/pip install -r backend/requirements.txt
fi

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies with Bun..."
  (cd frontend && bun install)
fi

pids=()
cleanup() {
  kill "${pids[@]}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Flask backend  -> http://127.0.0.1:5000"
(cd backend && exec ./.venv/bin/python run.py) &
pids+=($!)

echo "Starting Vite frontend  -> http://localhost:5173"
(cd frontend && exec bun run dev) &
pids+=($!)

wait
