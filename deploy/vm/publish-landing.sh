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

echo "Publishing landing assets"
rm -rf "$LANDING_ROOT/landing-assets"
if [ -d "$APP_ROOT/landing-assets" ]; then
  cp -R "$APP_ROOT/landing-assets" "$LANDING_ROOT/landing-assets"
fi

echo "Publishing docs"
rm -rf "$LANDING_ROOT/docs"
cp -R "$APP_ROOT/docs" "$LANDING_ROOT/docs"

echo "Removing mini app placement artifacts"
rm -rf "$LANDING_ROOT/miniapp"
rm -f "$LANDING_ROOT/.well-known/farcaster.json"
rmdir "$LANDING_ROOT/.well-known" 2>/dev/null || true

echo "Landing publish complete."
