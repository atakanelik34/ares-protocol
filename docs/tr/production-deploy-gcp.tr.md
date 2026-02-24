# ARES Production Deploy (Google VM + Namecheap Web Hosting DNS)

## Hedef topoloji
- `ares-protocol.xyz` ve `www.ares-protocol.xyz`: landing page (Nginx static)
- `app.ares-protocol.xyz`: `dashboard/agent-explorer` (Next.js)
- `api.ares-protocol.xyz`: `api/query-gateway` (Fastify)
- `dashboard/protocol-admin` VM'de calisir, ihtiyaca gore reverse-proxy ile acilabilir.

## 1) DNS (Namecheap Web Hosting DNS / cPanel)
Nameserver Namecheap Web Hosting DNS ise kayitlari su panelden guncelle:
- Namecheap -> Hosting List -> cPanel -> Zone Editor

Gerekli kayitlar:
- `@` -> `A` -> `<VM_STATIC_IP>`
- `www` -> `A` -> `<VM_STATIC_IP>` (veya `@` icin CNAME)
- `app` -> `A` -> `<VM_STATIC_IP>`
- `api` -> `A` -> `<VM_STATIC_IP>`
- opsiyonel `docs` -> `A` -> `<VM_STATIC_IP>`

Mail calismaya devam edecekse MX kayitlarina dokunma.

## 2) VM bootstrap
VM uzerinde:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/bootstrap.sh
```

Bu script Node.js >= 22, PM2, Nginx, Certbot, UFW kurar ve `/var/www` dizinini hazirlar.

## 3) Kaynagi VM'ye senkronla
Local repo kokunden:

```bash
bash deploy/vm/sync-to-vm.sh
```

Varsayilanlar:
- instance: `ares-vm-01`
- zone: `us-central1-a`
- target: `/var/www/ares/ares-protocol`

Gerekirse override:

```bash
INSTANCE=my-vm ZONE=us-central1-b TARGET_DIR=/var/www/ares/ares-protocol bash deploy/vm/sync-to-vm.sh
```

## 4) Uygulama deploy
VM uzerinde:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/deploy.sh
```

Final production cut oncesi su dosyalari duzenle:
- `api/query-gateway/.env`
- `dashboard/agent-explorer/.env.local`
- `dashboard/protocol-admin/.env.local`

## 5) Nginx + SSL
VM uzerinde:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/configure-nginx.sh
```

`configure-nginx.sh`, Certbot SSL bloklarini korumak icin mevcut site dosyalarini varsayilan olarak ezmez.
Zorla template ezmek istersen:

```bash
FORCE_NGINX_TEMPLATES=true bash deploy/vm/configure-nginx.sh
```

Landing dosyasini kopyala:

```bash
cp /var/www/ares/ares-protocol/aresprotocol-v3.html /var/www/landing/index.html
```

DNS VM'ye resolve olduktan sonra sertifika al:

```bash
sudo certbot --nginx \
  -d ares-protocol.xyz \
  -d www.ares-protocol.xyz \
  -d api.ares-protocol.xyz \
  -d app.ares-protocol.xyz
```

## 6) Runtime kontrolleri
```bash
curl -s https://api.ares-protocol.xyz/v1/health
curl -I https://app.ares-protocol.xyz
curl -I https://ares-protocol.xyz
pm2 ls
pm2 logs ares-api --lines 100
pm2 logs ares-app --lines 100
sudo tail -n 100 /var/log/nginx/error.log
sudo certbot renew --dry-run
```

## Rationale
- Tek VM icin PM2 + Nginx en kucuk ama guvenilir calisma modelidir.
- API CORS varsayilan olarak ARES domainleriyle kisitlidir.
- Landing waitlist, local disinda `https://api.ares-protocol.xyz/v1/waitlist` endpointine gonderim yapar.
