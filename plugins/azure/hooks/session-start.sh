#!/bin/bash
set -euo pipefail

cd "${CLAUDE_PLUGIN_ROOT}"

if [ ! -d node_modules ] || [ package.json -nt node_modules/.installed ]; then
  npm install --omit=dev --no-audit --no-fund --silent
  touch node_modules/.installed
fi
