#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

unset ELECTRON_RUN_AS_NODE

exec node ./scripts/run-electron.js \
  --no-sandbox \
  --disable-setuid-sandbox \
  "$@"
