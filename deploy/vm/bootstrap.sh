#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Updating apt packages"
sudo apt update
sudo apt -y upgrade

echo "[2/6] Installing base packages"
sudo apt -y install curl git ufw nginx certbot python3-certbot-nginx

echo "[3/6] Ensuring Node.js >= 22"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p "Number(process.versions.node.split('.')[0])")" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt -y install nodejs
fi

echo "[4/6] Installing PM2"
sudo npm i -g pm2

echo "[5/6] Configuring local firewall"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "[6/6] Preparing directories and nginx"
sudo mkdir -p /var/www/ares /var/www/landing
sudo chown -R "$USER:$USER" /var/www/ares /var/www/landing
sudo systemctl enable --now nginx

echo "Bootstrap complete."
node -v
npm -v
pm2 -v
sudo ufw status
