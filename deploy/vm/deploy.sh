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

echo "[2/4] Building workspaces"
npm run build

echo "[3/5] Ensuring runtime directories"
mkdir -p api/query-gateway/data
cp -n api/query-gateway/.env.example api/query-gateway/.env || true
cp -n dashboard/agent-explorer/.env.example dashboard/agent-explorer/.env.local || true
cp -n dashboard/protocol-admin/.env.example dashboard/protocol-admin/.env.local || true

echo "[4/5] Publishing landing static files"
bash deploy/vm/publish-landing.sh

echo "[5/5] Starting PM2 apps"
pm2 start deploy/pm2/ecosystem.config.cjs --update-env
pm2 save

echo "Deployment complete."
pm2 ls
