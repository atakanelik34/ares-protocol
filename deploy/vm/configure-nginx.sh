#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/ares/ares-protocol}"
FORCE_NGINX_TEMPLATES="${FORCE_NGINX_TEMPLATES:-false}"

if [ ! -d "$APP_ROOT/deploy/nginx" ]; then
  echo "Nginx templates not found under $APP_ROOT/deploy/nginx"
  exit 1
fi

copy_template() {
  local src="$1"
  local dst="$2"
  if [ -f "$dst" ] && [ "$FORCE_NGINX_TEMPLATES" != "true" ]; then
    echo "Skipping existing nginx file: $dst"
    return
  fi
  sudo cp "$src" "$dst"
}

copy_template "$APP_ROOT/deploy/nginx/ares-protocol.xyz.conf" /etc/nginx/sites-available/ares-protocol.xyz
copy_template "$APP_ROOT/deploy/nginx/api.ares-protocol.xyz.conf" /etc/nginx/sites-available/api.ares-protocol.xyz
copy_template "$APP_ROOT/deploy/nginx/app.ares-protocol.xyz.conf" /etc/nginx/sites-available/app.ares-protocol.xyz
copy_template "$APP_ROOT/deploy/nginx/docs.ares-protocol.xyz.conf" /etc/nginx/sites-available/docs.ares-protocol.xyz

sudo ln -sfn /etc/nginx/sites-available/ares-protocol.xyz /etc/nginx/sites-enabled/ares-protocol.xyz
sudo ln -sfn /etc/nginx/sites-available/api.ares-protocol.xyz /etc/nginx/sites-enabled/api.ares-protocol.xyz
sudo ln -sfn /etc/nginx/sites-available/app.ares-protocol.xyz /etc/nginx/sites-enabled/app.ares-protocol.xyz
sudo ln -sfn /etc/nginx/sites-available/docs.ares-protocol.xyz /etc/nginx/sites-enabled/docs.ares-protocol.xyz
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx

echo "Nginx configured."
echo "If DNS is pointed to this VM, run:"
echo "sudo certbot --nginx -d ares-protocol.xyz -d www.ares-protocol.xyz -d api.ares-protocol.xyz -d app.ares-protocol.xyz"
