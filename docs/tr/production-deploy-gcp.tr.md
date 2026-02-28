# ARES Production Deploy (Google VM + Namecheap Web Hosting DNS)

Güncel recovered production ortamı:
- project: `<YOUR_GCP_PROJECT>`
- VM: `ares-vm-01`
- static IP: `<YOUR_VM_IP>`

## Hedef topoloji
- `ares-protocol.xyz` ve `www.ares-protocol.xyz`: landing page (Nginx static).
- `app.ares-protocol.xyz`: `dashboard/agent-explorer` (Next.js).
- `ares-protocol.xyz/api`: `api/query-gateway` (Fastify, canonical path).
- `dashboard/protocol-admin`, VM üzerinde çalışır ve gerekirse daha sonra proxy'lenebilir.

## 1) DNS (Namecheap Web Hosting DNS / cPanel)
Nameserver'lar Namecheap Web Hosting DNS ise kayıtları şuradan güncelle:
- Namecheap -> Hosting List -> cPanel -> Zone Editor

Gerekli kayıtlar:
- `@` -> `A` -> `<VM_STATIC_IP>`
- `www` -> `A` -> `<VM_STATIC_IP>` (veya `@` için CNAME)
- `app` -> `A` -> `<VM_STATIC_IP>`
- opsiyonel `docs` -> `A` -> `<VM_STATIC_IP>`

Mail çalışmaya devam edecekse MX kayıtlarını değiştirme.

## 2) VM Bootstrap
VM üzerinde çalıştır:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/bootstrap.sh
```

Bu komut Node.js >= 22, PM2, Nginx, Certbot, UFW kurar ve `/var/www` dizinini hazırlar.
Ayrıca otomatik olarak `deploy/vm/harden.sh` çalıştırır (SSH hardening, fail2ban, şüpheli cron temizliği, miner portlarına giden egress blokları, docker kapatma).

Hardening profilini manuel tekrar uygulamak için:

```bash
bash deploy/vm/harden.sh
```

## 3) Kaynağı VM'e Senkronla
Local repo kökünden çalıştır:

```bash
bash deploy/vm/sync-to-vm.sh
```

Varsayılanlar:
- instance: `ares-vm-01`
- zone: `us-central1-a`
- target: `/var/www/ares/ares-protocol`

Gerekirse override:

```bash
INSTANCE=my-vm ZONE=us-central1-b TARGET_DIR=/var/www/ares/ares-protocol bash deploy/vm/sync-to-vm.sh
```

## 4) Uygulama Deploy
VM üzerinde çalıştır:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/deploy.sh
```

`deploy.sh`, build öncesi deterministic local demo dataset'i tekrar üretir.
Bu sayede subgraph düşse veya rate-limit olsa bile explorer/API yüzeyleri çalışmaya devam eder.

Final production cut öncesi şu dosyaları düzenle:
- `api/query-gateway/.env`
- `dashboard/agent-explorer/.env.local`
- `dashboard/protocol-admin/.env.local`

## 5) Nginx + SSL
VM üzerinde çalıştır:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/configure-nginx.sh
```

`configure-nginx.sh`, mevcut site dosyalarını varsayılan olarak ezmez (Certbot SSL bloklarını korumak için).
Template'leri zorla ezmek için:

```bash
FORCE_NGINX_TEMPLATES=true bash deploy/vm/configure-nginx.sh
```

Landing dosyasını kopyala:

```bash
cp /var/www/ares/ares-protocol/aresprotocol-v3.html /var/www/landing/index.html
```

DNS VM'e çözüldükten sonra sertifika al:

```bash
sudo certbot --nginx \
  -d ares-protocol.xyz \
  -d www.ares-protocol.xyz \
  -d app.ares-protocol.xyz

# Opsiyonel legacy host:
#   -d api.ares-protocol.xyz
```

## 6) Runtime Kontrolleri
```bash
curl -s https://ares-protocol.xyz/api/v1/health
curl -I https://app.ares-protocol.xyz
curl -I https://ares-protocol.xyz
pm2 ls
pm2 logs ares-api --lines 100
pm2 logs ares-app --lines 100
sudo tail -n 100 /var/log/nginx/error.log
sudo certbot renew --dry-run
sudo ss -tulpen | egrep ':80 |:443 |:3001 |:3003 '
```

Beklenen listener durumu:
- `80/443` public nginx üzerinden
- `3001` yalnız localhost
- `3003` yalnız localhost

## Recovery Notları
- Compromise olan legacy projeler silindi ve tekrar kullanılmamalı.
- Production artık tek host/project kuralı ile çalışır.
- Recovery sırasında açığa çıkmış provider/API key'leri, production doğrudan bağımlı olmasa bile rotate edilmelidir.
- Production host rotasyonu yeni operasyon cüzdanı ve yalnız clean VM env ile tamamlandı.
- Project-level egress, `ares-web` target tag'i için DNS (`53`), HTTP (`80`), HTTPS/RPC (`443`) ve NTP (`123`) ile sınırlandı.
- Monitoring kaynakları Cloud Monitoring içinde oluşturuldu; bildirim teslimi için email channel verify edilmelidir.

## Rationale
- PM2 + Nginx, tek VM için en küçük güvenilir kurulumdur.
- API CORS, varsayılan olarak ARES domain'leri ile sınırlıdır.
- Landing waitlist, local dışı ortamlarda `https://ares-protocol.xyz/api/v1/waitlist` adresine gönderir.
- Explorer/demo sürekliliği üçüncü taraf subgraph erişimine bağımlı olmamalıdır.
