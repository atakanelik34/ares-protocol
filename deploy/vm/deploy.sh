#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/ares/ares-protocol}"

if [ ! -d "$APP_ROOT" ]; then
  echo "Missing app root: $APP_ROOT"
  exit 1
fi

cd "$APP_ROOT"

echo "[1/4] Installing dependencies"
npm ci

echo "[2/5] Generating deterministic local demo state"
node scripts/demo/generate-local-demo-state.mjs

echo "[3/5] Building workspaces"
npm run build

echo "[4/5] Ensuring runtime directories"
mkdir -p api/query-gateway/data
cp -n api/query-gateway/.env.example api/query-gateway/.env || true
cp -n dashboard/agent-explorer/.env.example dashboard/agent-explorer/.env.local || true

echo "[5/6] Publishing landing static files"
bash deploy/vm/publish-landing.sh

echo "[6/6] Starting PM2 apps"
pm2 startOrReload deploy/pm2/ecosystem.config.cjs --update-env
pm2 save

echo "[post] Waiting for explorer readiness"
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:3003/ >/dev/null; then
    break
  fi
  sleep 1
done

echo "Deployment complete."
pm2 ls
