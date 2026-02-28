# ARES Security Ops Runbook (GCP VM)

Güncel production host:
- project: `<YOUR_GCP_PROJECT>`
- VM: `ares-vm-01`

## Haftalık host kontrolü

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

## Abuse event hızlı kontrol

```bash
gcloud logging read \
  'logName="projects/<YOUR_GCP_PROJECT>/logs/abuseevent.googleapis.com%2Fabuse_events"' \
  --project <YOUR_GCP_PROJECT> \
  --limit 20 --format json
```

## Monitoring kontrolleri

```bash
gcloud alpha monitoring uptime list-configs --project <YOUR_GCP_PROJECT>
gcloud alpha monitoring channels list --project <YOUR_GCP_PROJECT>
gcloud alpha monitoring policies list --project <YOUR_GCP_PROJECT>
```

Beklenen monitoring baseline:
- uptime checks: landing, explorer, API health
- alert policy seti: uptime failure, CPU, memory, disk, abuse-event
- notification channel: email; Google doğrulama maili geldikten sonra verify edilmelidir

## Recovery baseline

1. Bilinmeyen cron satırı olmadığını doğrula (`/tmp`, `kworker`, `xmrig`, `minerd`, `cpuminer`, `kinsing`).
2. API'nin yalnız localhost'ta dinlediğini doğrula (`127.0.0.1:3001`).
3. App'in yalnız localhost'ta dinlediğini doğrula (`127.0.0.1:3003`).
4. Ingress'in sadece `22/80/443` açık olduğunu doğrula.
5. PM2 uygulamalarının online olduğunu ve log rotate'in aktif olduğunu doğrula.
6. Compromise olan eski projelerin silinmiş kaldığını doğrula; tekrar kullanılmamalı.
7. `ares-web` target tag'i için VPC egress kurallarının yalnız `53/80/443/123` izin verdiğini doğrula.
