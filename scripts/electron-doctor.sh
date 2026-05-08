#!/usr/bin/env bash
set -u

cd "$(dirname "$0")/.."

echo "Node: $(node --version 2>/dev/null || echo 'not found')"
echo "npm: $(npm --version 2>/dev/null || echo 'not found')"
echo "Electron package: $(node -p "require('./node_modules/electron/package.json').version" 2>/dev/null || echo 'not installed')"
echo "ELECTRON_RUN_AS_NODE=${ELECTRON_RUN_AS_NODE-}"
echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE-}"
echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY-}"
echo "DISPLAY=${DISPLAY-}"
echo "chrome-sandbox:"
ls -l ./node_modules/electron/dist/chrome-sandbox 2>/dev/null || true
echo "systemd scope:"
systemctl --user status "$(systemctl --user show-environment 2>/dev/null | sed -n 's/^INVOCATION_ID=//p')" >/dev/null 2>&1 || true

echo
echo "Trying Electron launcher smoke test..."
node ./scripts/run-electron.js --version 2>&1

echo
echo "Trying Electron Node-mode smoke test..."
ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/electron -e "console.log('electron node smoke ok', process.versions.electron)" 2>&1
