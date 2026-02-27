#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/ares/ares-protocol}"
LANDING_ROOT="${LANDING_ROOT:-/var/www/landing}"

if [ ! -d "$APP_ROOT" ]; then
  echo "Missing app root: $APP_ROOT"
  exit 1
fi

mkdir -p "$LANDING_ROOT"

echo "Publishing landing HTML"
cp "$APP_ROOT/aresprotocol-v3.html" "$LANDING_ROOT/index.html"

echo "Publishing docs"
rm -rf "$LANDING_ROOT/docs"
cp -R "$APP_ROOT/docs" "$LANDING_ROOT/docs"

echo "Publishing mini app manifest and assets"
mkdir -p "$LANDING_ROOT/.well-known" "$LANDING_ROOT/miniapp"
cp "$APP_ROOT/.well-known/farcaster.json" "$LANDING_ROOT/.well-known/farcaster.json"
cp -R "$APP_ROOT/miniapp/." "$LANDING_ROOT/miniapp/"

echo "Landing publish complete."
