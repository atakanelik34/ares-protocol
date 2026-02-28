# ARES Security Ops Runbook (GCP VM)

Current production host:
- project: `<YOUR_GCP_PROJECT>`
- VM: `ares-vm-01`

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
pm2 conf pm2-logrotate:max_size
pm2 conf pm2-logrotate:retain
sudo tail -n 100 /var/log/nginx/error.log
```

## Abuse event quick check

```bash
gcloud logging read \
  'logName="projects/<YOUR_GCP_PROJECT>/logs/abuseevent.googleapis.com%2Fabuse_events"' \
  --project <YOUR_GCP_PROJECT> \
  --limit 20 --format json
```

## Monitoring checks

```bash
gcloud alpha monitoring uptime list-configs --project <YOUR_GCP_PROJECT>
gcloud alpha monitoring channels list --project <YOUR_GCP_PROJECT>
gcloud alpha monitoring policies list --project <YOUR_GCP_PROJECT>
```

Expected monitoring baseline:
- uptime checks: landing, explorer, API health
- alert policies: uptime failures, nginx/API 5xx or upstream errors, CPU, memory, disk, abuse-event
- notification channel: email, verify after Google sends confirmation mail

## Recovery baseline

1. Confirm no unknown cron entries (`/tmp`, `kworker`, `xmrig`, `minerd`, `cpuminer`, `kinsing`).
2. Confirm API is bound to localhost only (`127.0.0.1:3001`).
3. Confirm app is bound to localhost only (`127.0.0.1:3003`).
4. Confirm ingress only exposes `22/80/443`.
5. Confirm PM2 apps are online and log rotation is enabled.
6. Confirm old compromised projects remain deleted and are never reused.
7. Confirm VPC egress rules still allow only `53/80/443/123` for target tag `ares-web`.
