# ARES Security Ops Runbook (GCP VM)

Status date: March 5, 2026

Current production host:
- project: `${GCP_PROJECT_ID}` (required env, value intentionally not committed)
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
  "logName=\"projects/${GCP_PROJECT_ID}/logs/abuseevent.googleapis.com%2Fabuse_events\"" \
  --project "${GCP_PROJECT_ID}" \
  --limit 20 --format json
```

## Monitoring checks

```bash
gcloud alpha monitoring uptime list-configs --project "${GCP_PROJECT_ID}"
gcloud alpha monitoring channels list --project "${GCP_PROJECT_ID}"
gcloud alpha monitoring policies list --project "${GCP_PROJECT_ID}"
```

Expected monitoring baseline:
- uptime checks: landing, explorer, API health
- alert policies: uptime failures, nginx/API 5xx or upstream errors, CPU, memory, disk, abuse-event
- notification channel: email, verify after Google sends confirmation mail

## Certification-linked ops artifacts
- monitoring verification proof: `docs/certification/generated/monitoring-verification-proof-2026-03-02.md`
- backup/restore drill template: `docs/audit/backup-restore-drill.template.md`
- incident severity signoff: `docs/audit/incident-severity-signoff.md`
- mainnet rehearsal support: `docs/rehearsal/mainnet/`
- launch-day support pack: `docs/launch/`

## Recovery baseline

1. Confirm no unknown cron entries (`/tmp`, `kworker`, `xmrig`, `minerd`, `cpuminer`, `kinsing`).
2. Confirm API is bound to localhost only (`127.0.0.1:3001`).
3. Confirm app is bound to localhost only (`127.0.0.1:3003`).
4. Confirm ingress only exposes `22/80/443`.
5. Confirm PM2 apps are online and log rotation is enabled.
6. Confirm old compromised projects remain deleted and are never reused.
7. Confirm VPC egress rules still allow only `53/80/443/123` for target tag `ares-web`.

## Ops closure expectation
Mainnet ops signoff should not be considered complete until the following have attached evidence:
- verified notification-channel proof
- alert test reference
- backup/restore drill record
- incident severity ownership signoff

## Current security-closure state (Mar 5, 2026)
- webhook endpoint supports HMAC + timestamp + replay protection
- migration mode default is `dual`; production target remains `hmac` only
- dispute v2 cutover requires redeploy/rewire evidence before launch signoff

## Goldsky webhook auth migration (dual -> hmac)

Phase A (dual mode):
1. Set `GOLDSKY_WEBHOOK_AUTH_MODE=dual`.
2. Set `GOLDSKY_WEBHOOK_HMAC_SECRET` on API runtime.
3. Keep legacy `GOLDSKY_WEBHOOK_TOKEN` during transition.
4. Confirm logs show accepted requests with `authUsed=hmac` or `authUsed=token`.

Phase B (sender rotation):
1. Configure sender to include:
   - `x-ares-timestamp`
   - `x-ares-signature` (`sha256=<hex>`)
2. Signature payload format: `${timestamp}.${rawBody}` (HMAC-SHA256).
3. Confirm replay rejection by resending an identical signed payload (expect `409 replay detected`).

Phase C (enforcement):
1. Set `GOLDSKY_WEBHOOK_AUTH_MODE=hmac`.
2. Remove token from sender config.
3. Rotate `GOLDSKY_WEBHOOK_TOKEN` to a random value and keep unused.

Rollback:
1. Temporarily return to `GOLDSKY_WEBHOOK_AUTH_MODE=dual`.
2. Keep HMAC secret unchanged while investigating sender mismatch.

## Dispute v2 cutover smoke checklist
1. Open dispute for valid action, collect validator vote, finalize accepted.
2. Open dispute with quorum shortfall, finalize and confirm no slash/full refund.
3. Confirm duplicate dispute for active `(agentId, actionId)` reverts.
4. Confirm historical claims on legacy dispute still withdraw correctly.
