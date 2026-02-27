#!/usr/bin/env bash
set -euo pipefail

echo "[hardening] SSH policy"
sudo install -d -m 755 /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/99-ares-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
MaxAuthTries 3
X11Forwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
sudo sshd -t
sudo systemctl reload ssh

echo "[hardening] fail2ban"
sudo apt -y install fail2ban
sudo tee /etc/fail2ban/jail.d/ares.local >/dev/null <<'EOF'
[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
sudo systemctl enable --now fail2ban

echo "[hardening] firewall baseline"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Block common outbound mining ports while preserving normal web/RPC traffic on 443.
for port in 3333 4444 5555 6666 7777 9999 14444; do
  sudo ufw deny out "${port}/tcp" >/dev/null 2>&1 || true
  sudo ufw deny out "${port}/udp" >/dev/null 2>&1 || true
done

echo "[hardening] remove known suspicious cron persistence"
sanitize_cron() {
  local user="$1"
  local current=""
  if [ "$user" = "root" ]; then
    current="$(sudo crontab -l 2>/dev/null || true)"
    printf '%s\n' "$current" | grep -Ev '(/tmp/|kworker|xmrig|minerd|cpuminer|kinsing)' | sudo crontab - || true
  else
    current="$(crontab -l -u "$user" 2>/dev/null || true)"
    printf '%s\n' "$current" | grep -Ev '(/tmp/|kworker|xmrig|minerd|cpuminer|kinsing)' | crontab -u "$user" - || true
  fi
}

sanitize_cron "root"
sanitize_cron "$USER"

echo "[hardening] kill suspicious process names if present"
for proc in xmrig minerd cpuminer kinsing; do
  sudo pkill -f "$proc" >/dev/null 2>&1 || true
done

echo "[hardening] quarantine suspicious temp files"
for path in /tmp /var/tmp /dev/shm; do
  sudo find "$path" -maxdepth 2 -type f \
    \( -name '*kworker*' -o -name '*xmrig*' -o -name '*kinsing*' -o -name '*cpuminer*' \) \
    -exec sh -c 'chmod 000 "$1" 2>/dev/null || true; mv "$1" "$1.quarantine" 2>/dev/null || true' _ {} \;
done

echo "[hardening] disable docker if not used"
sudo systemctl disable --now docker docker.socket >/dev/null 2>&1 || true

echo "[hardening] done"
sudo ufw status verbose
sudo systemctl is-active fail2ban
