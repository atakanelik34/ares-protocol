# ARES Security Ops Runbook (GCP VM)

Durum tarihi: 5 Mart 2026

Güncel production host:
- project: `${GCP_PROJECT_ID}` (zorunlu env, değer repoya yazılmaz)
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
  "logName=\"projects/${GCP_PROJECT_ID}/logs/abuseevent.googleapis.com%2Fabuse_events\"" \
  --project "${GCP_PROJECT_ID}" \
  --limit 20 --format json
```

## Monitoring kontrolleri

```bash
gcloud alpha monitoring uptime list-configs --project "${GCP_PROJECT_ID}"
gcloud alpha monitoring channels list --project "${GCP_PROJECT_ID}"
gcloud alpha monitoring policies list --project "${GCP_PROJECT_ID}"
```

Beklenen monitoring baseline:
- uptime checks: landing, explorer, API health
- alert policy seti: uptime failure, nginx/API 5xx veya upstream error, CPU, memory, disk, abuse-event
- notification channel: email; Google doğrulama maili geldikten sonra verify edilmelidir

## Recovery baseline

1. Bilinmeyen cron satırı olmadığını doğrula (`/tmp`, `kworker`, `xmrig`, `minerd`, `cpuminer`, `kinsing`).
2. API'nin yalnız localhost'ta dinlediğini doğrula (`127.0.0.1:3001`).
3. App'in yalnız localhost'ta dinlediğini doğrula (`127.0.0.1:3003`).
4. Ingress'in sadece `22/80/443` açık olduğunu doğrula.
5. PM2 uygulamalarının online olduğunu ve log rotate'in aktif olduğunu doğrula.
6. Compromise olan eski projelerin silinmiş kaldığını doğrula; tekrar kullanılmamalı.
7. `ares-web` target tag'i için VPC egress kurallarının yalnız `53/80/443/123` izin verdiğini doğrula.

## Güncel security-closure durumu (5 Mart 2026)
- webhook endpoint artık HMAC + timestamp + replay koruması destekliyor
- geçiş modu varsayılanı `dual`; production hedefi `hmac` only
- dispute v2 cutover için redeploy/rewire kanıtı mainnet signoff öncesi zorunlu
