#!/usr/bin/env bash
# Azure App Service Linux startup helper (optional Startup Command).
set -euo pipefail
cd "$(dirname "$0")"
export PORT="${PORT:-8080}"
if [[ ! -f ./node_modules/next/dist/bin/next ]]; then
  echo "next binary missing — run npm ci && npm run build (enable SCM_DO_BUILD_DURING_DEPLOYMENT)" >&2
  exit 1
fi
exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$PORT"
