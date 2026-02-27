# ARES Security Ops Runbook (GCP VM)

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
sudo tail -n 100 /var/log/nginx/error.log
```

## Abuse event hızlı kontrol

```bash
gcloud logging read \
  'logName="projects/<OLD_GCP_PROJECT>/logs/abuseevent.googleapis.com%2Fabuse_events"' \
  --project <OLD_GCP_PROJECT> \
  --limit 20 --format json
```

## Recovery baseline

1. Bilinmeyen cron satırı olmadığını doğrula (`/tmp`, `kworker`, `xmrig`, `minerd`, `cpuminer`, `kinsing`).
2. API'nin yalnız localhost'ta dinlediğini doğrula (`127.0.0.1:3001`).
3. Ingress'in sadece `22/80/443` açık olduğunu doğrula.
4. PM2 uygulamalarının online olduğunu ve log rotate'in aktif olduğunu doğrula.
