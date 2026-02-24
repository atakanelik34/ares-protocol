# ARES Production Deploy (Google VM + Namecheap Web Hosting DNS)

## Hedef topoloji
- `ares-protocol.xyz` ve `www.ares-protocol.xyz`: landing page (Nginx static).
- `app.ares-protocol.xyz`: `dashboard/agent-explorer` (Next.js).
- `api.ares-protocol.xyz`: `api/query-gateway` (Fastify).
- `dashboard/protocol-admin`, VM üzerinde çalışır ve gerekirse daha sonra proxy'lenebilir.

## 1) DNS (Namecheap Web Hosting DNS / cPanel)
Nameserver'lar Namecheap Web Hosting DNS ise kayıtları şuradan güncelle:
- Namecheap -> Hosting List -> cPanel -> Zone Editor

Gerekli kayıtlar:
- `@` -> `A` -> `<VM_STATIC_IP>`
- `www` -> `A` -> `<VM_STATIC_IP>` (veya `@` için CNAME)
- `app` -> `A` -> `<VM_STATIC_IP>`
- `api` -> `A` -> `<VM_STATIC_IP>`
- opsiyonel `docs` -> `A` -> `<VM_STATIC_IP>`

Mail çalışmaya devam edecekse MX kayıtlarını değiştirme.

## 2) VM Bootstrap
VM üzerinde çalıştır:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/bootstrap.sh
```

Bu komut Node.js >= 22, PM2, Nginx, Certbot, UFW kurar ve `/var/www` dizinini hazırlar.

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
  -d api.ares-protocol.xyz \
  -d app.ares-protocol.xyz
```

## 6) Runtime Kontrolleri
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
- PM2 + Nginx, tek VM için en küçük güvenilir kurulumdur.
- API CORS, varsayılan olarak ARES domain'leri ile sınırlıdır.
- Landing waitlist, local dışı ortamlarda `https://api.ares-protocol.xyz/v1/waitlist` adresine gönderir.
