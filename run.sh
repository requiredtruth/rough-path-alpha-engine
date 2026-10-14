#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m http.server 8765 --bind 127.0.0.1 --directory app/src/main/assets &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
if command -v xdg-open >/dev/null; then xdg-open http://127.0.0.1:8765; fi
wait "$server_pid"
