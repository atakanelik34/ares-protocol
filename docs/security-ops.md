# ARES Security Ops Runbook (GCP VM)

## Weekly host check

```bash
sudo ss -tulpen | egrep ':22 |:80 |:443 |:3001 |:3003 '
crontab -l || true
sudo crontab -l || true
ps aux --sort=-%cpu | head -n 30
sudo fail2ban-client status sshd
sudo ufw status verbose
pm2 ls
pm2 logs ares-api --lines 50 --nostream
pm2 logs ares-app --lines 50 --nostream
sudo tail -n 100 /var/log/nginx/error.log
```

## Abuse event quick check

```bash
gcloud logging read \
  'logName="projects/<OLD_GCP_PROJECT>/logs/abuseevent.googleapis.com%2Fabuse_events"' \
  --project <OLD_GCP_PROJECT> \
  --limit 20 --format json
```

## Recovery baseline

1. Confirm no unknown cron entries (`/tmp`, `kworker`, `xmrig`, `minerd`, `cpuminer`, `kinsing`).
2. Confirm API is bound to localhost only (`127.0.0.1:3001`).
3. Confirm ingress only exposes `22/80/443`.
4. Confirm PM2 apps are online and log rotation is enabled.
