#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SANDBOX="./node_modules/electron/dist/chrome-sandbox"

if [[ ! -f "$SANDBOX" ]]; then
  echo "chrome-sandbox nao encontrado. Rode npm install primeiro."
  exit 1
fi

sudo chown root:root "$SANDBOX"
sudo chmod 4755 "$SANDBOX"

echo "Permissoes atualizadas:"
ls -l "$SANDBOX"
