# ARES Production Deploy (Google VM + Namecheap Web Hosting DNS)

## Target Topology
- `ares-protocol.xyz` and `www.ares-protocol.xyz`: landing page (Nginx static).
- `app.ares-protocol.xyz`: `dashboard/agent-explorer` (Next.js).
- `ares-protocol.xyz/api`: `api/query-gateway` (Fastify, canonical path).
- `dashboard/protocol-admin` runs on VM and can be proxied later if needed.

## 1) DNS (Namecheap Web Hosting DNS via cPanel)
If nameservers are set to Namecheap Web Hosting DNS, update records from:
- Namecheap -> Hosting List -> cPanel -> Zone Editor

Required records:
- `@` -> `A` -> `<VM_STATIC_IP>`
- `www` -> `A` -> `<VM_STATIC_IP>` (or CNAME to `@`)
- `app` -> `A` -> `<VM_STATIC_IP>`
- `api` -> `A` -> `<VM_STATIC_IP>`
- optional `docs` -> `A` -> `<VM_STATIC_IP>`

Do not modify MX records if mail must keep working.

## 2) VM Bootstrap
Run on VM:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/bootstrap.sh
```

This installs Node.js >= 22, PM2, Nginx, Certbot, UFW, and prepares `/var/www`.

## 3) Sync Source To VM
Run from local repo root:

```bash
bash deploy/vm/sync-to-vm.sh
```

Defaults:
- instance: `ares-vm-01`
- zone: `us-central1-a`
- target: `/var/www/ares/ares-protocol`

Override if needed:

```bash
INSTANCE=my-vm ZONE=us-central1-b TARGET_DIR=/var/www/ares/ares-protocol bash deploy/vm/sync-to-vm.sh
```

## 4) App Deploy
Run on VM:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/deploy.sh
```

Edit these files before final production cut:
- `api/query-gateway/.env`
- `dashboard/agent-explorer/.env.local`
- `dashboard/protocol-admin/.env.local`

## 5) Nginx + SSL
Run on VM:

```bash
cd /var/www/ares/ares-protocol
bash deploy/vm/configure-nginx.sh
```

`configure-nginx.sh` does not overwrite existing site files by default (to preserve Certbot SSL blocks).
To force template overwrite, run:

```bash
FORCE_NGINX_TEMPLATES=true bash deploy/vm/configure-nginx.sh
```

Copy landing file:

```bash
cp /var/www/ares/ares-protocol/aresprotocol-v3.html /var/www/landing/index.html
```

After DNS resolves to VM, issue certificates:

```bash
sudo certbot --nginx \
  -d ares-protocol.xyz \
  -d www.ares-protocol.xyz \
  -d api.ares-protocol.xyz \
  -d app.ares-protocol.xyz
```

## 6) Runtime Checks
```bash
curl -s https://ares-protocol.xyz/api/v1/health
curl -I https://app.ares-protocol.xyz
curl -I https://ares-protocol.xyz
pm2 ls
pm2 logs ares-api --lines 100
pm2 logs ares-app --lines 100
sudo tail -n 100 /var/log/nginx/error.log
sudo certbot renew --dry-run
```

## Rationale
- PM2 + Nginx is the smallest reliable setup for one VM.
- API CORS is restricted to ARES domains by default.
- Landing waitlist posts to `https://ares-protocol.xyz/api/v1/waitlist` in non-local environments.
