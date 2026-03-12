#!/usr/bin/env bash
set -euo pipefail

status="PASS"
START_EPOCH="$(date +%s)"
START_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
HEALTH_URL_PRIMARY="${HEALTH_URL_PRIMARY:-http://127.0.0.1:3001/health}"
HEALTH_URL_FALLBACK="${HEALTH_URL_FALLBACK:-http://127.0.0.1:3001/v1/health}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"
PM2_CMD=()

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

mark_fail() {
  status="FAIL"
  log "FAIL: $*"
}

log "Incident simulation started"
log "Start time: $START_ISO"
log "Target process: ares-api"
log "Health endpoints: $HEALTH_URL_PRIMARY (primary), $HEALTH_URL_FALLBACK (fallback)"

if ! command -v pm2 >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    PM2_CMD=(npx -y pm2)
    log "pm2 binary not found in PATH; using npx fallback"
  else
    mark_fail "pm2 not found in PATH and npx fallback unavailable"
    log "Incident simulation finished with status=$status"
    exit 1
  fi
else
  PM2_CMD=(pm2)
fi

if ! command -v curl >/dev/null 2>&1; then
  mark_fail "curl not found in PATH"
  log "Incident simulation finished with status=$status"
  exit 1
fi

log "Stopping ares-api via PM2"
if "${PM2_CMD[@]}" stop ares-api; then
  log "PASS: pm2 stop ares-api"
else
  mark_fail "pm2 stop ares-api failed"
fi

log "Waiting 5 seconds"
sleep 5

log "Restarting ares-api via PM2"
if "${PM2_CMD[@]}" restart ares-api; then
  log "PASS: pm2 restart ares-api"
else
  mark_fail "pm2 restart ares-api failed"
fi

log "Polling health for up to ${TIMEOUT_SECONDS}s"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
recovered=0
recover_epoch=0
recover_url=""

while [ "$(date +%s)" -le "$deadline" ]; do
  code_primary="$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL_PRIMARY" || true)"
  code_fallback="$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL_FALLBACK" || true)"
  log "Probe: primary=$code_primary fallback=$code_fallback"

  if [ "$code_primary" = "200" ]; then
    recovered=1
    recover_epoch="$(date +%s)"
    recover_url="$HEALTH_URL_PRIMARY"
    break
  fi

  if [ "$code_fallback" = "200" ]; then
    recovered=1
    recover_epoch="$(date +%s)"
    recover_url="$HEALTH_URL_FALLBACK"
    break
  fi
  sleep 1
done

if [ "$recovered" -eq 1 ]; then
  mttr_seconds=$((recover_epoch - START_EPOCH))
  recover_iso="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  log "PASS: service recovered at $recover_iso via $recover_url"
  log "MTTR_SECONDS=$mttr_seconds"
else
  mark_fail "health probe did not return 200 within ${TIMEOUT_SECONDS}s"
fi

log "Incident simulation finished with status=$status"
if [ "$status" != "PASS" ]; then
  exit 1
fi
