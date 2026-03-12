#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/reports/mainnet-gates/artifacts/b05"
BACKUP_ROOT="$ARTIFACT_DIR/backup"
VERIFY_ROOT="$ARTIFACT_DIR/backup-verify"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
DATA_DIR="$ROOT_DIR/api/query-gateway/data"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
RESTORE_DIR="$ARTIFACT_DIR/restore-$TIMESTAMP"
TEST_LOG="$ARTIFACT_DIR/backup-restore-test-$TIMESTAMP.log"

mkdir -p "$BACKUP_ROOT" "$VERIFY_ROOT" "$RESTORE_DIR"

status="PASS"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

mark_fail() {
  status="FAIL"
  log "FAIL: $*"
}

if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD=(sha256sum)
else
  HASH_CMD=(shasum -a 256)
fi

checksum_tree() {
  local dir="$1"
  local out="$2"
  (
    cd "$dir"
    find . -type f -print0 | sort -z | while IFS= read -r -d '' file; do
      "${HASH_CMD[@]}" "$file"
    done
  ) >"$out"
}

log "Backup/restore drill started"
log "ROOT_DIR=$ROOT_DIR"
log "DATA_DIR=$DATA_DIR"

if [ ! -d "$DATA_DIR" ]; then
  mark_fail "Data directory not found: $DATA_DIR"
  log "Backup/restore drill finished with status=$status"
  exit 1
fi

log "Creating timestamped backup: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -a "$DATA_DIR"/. "$BACKUP_DIR"/

DIFF_DATA_BACKUP="$VERIFY_ROOT/diff-data-vs-backup-$TIMESTAMP.txt"
log "Verifying backup copy with diff -qr"
if diff -qr "$DATA_DIR" "$BACKUP_DIR" >"$DIFF_DATA_BACKUP"; then
  log "PASS: data and backup trees are byte-identical (diff)"
else
  mark_fail "data and backup trees differ (see $DIFF_DATA_BACKUP)"
fi

SRC_SUMS="$VERIFY_ROOT/checksum-data-$TIMESTAMP.txt"
BACKUP_SUMS="$VERIFY_ROOT/checksum-backup-$TIMESTAMP.txt"
DIFF_SUMS="$VERIFY_ROOT/checksum-diff-$TIMESTAMP.txt"

log "Computing checksums for source and backup trees"
checksum_tree "$DATA_DIR" "$SRC_SUMS"
checksum_tree "$BACKUP_DIR" "$BACKUP_SUMS"
if diff -u "$SRC_SUMS" "$BACKUP_SUMS" >"$DIFF_SUMS"; then
  log "PASS: checksum trees match"
else
  mark_fail "checksum trees differ (see $DIFF_SUMS)"
fi

log "Simulating restore into temp location"
mkdir -p "$RESTORE_DIR/data"
cp -a "$BACKUP_DIR"/. "$RESTORE_DIR/data"/

DIFF_BACKUP_RESTORE="$VERIFY_ROOT/diff-backup-vs-restore-$TIMESTAMP.txt"
if diff -qr "$BACKUP_DIR" "$RESTORE_DIR/data" >"$DIFF_BACKUP_RESTORE"; then
  log "PASS: backup and restored trees are byte-identical (diff)"
else
  mark_fail "backup and restored trees differ (see $DIFF_BACKUP_RESTORE)"
fi

RESTORE_DB="$RESTORE_DIR/data/ares.db"
if [ -f "$RESTORE_DB" ]; then
  TEST_DB_URL="sqlite:$RESTORE_DB"
else
  TEST_DB_URL="sqlite:$RESTORE_DIR/data/ares.db"
fi

log "Running query-gateway tests against restored DB path: $TEST_DB_URL"
if (
  cd "$ROOT_DIR"
  DATABASE_URL="$TEST_DB_URL" npm run test --workspace=api/query-gateway
) >"$TEST_LOG" 2>&1; then
  log "PASS: query-gateway tests passed against restored data"
else
  mark_fail "query-gateway tests failed (see $TEST_LOG)"
fi

log "Artifacts:"
log "- backup dir: $BACKUP_DIR"
log "- restore dir: $RESTORE_DIR/data"
log "- source checksums: $SRC_SUMS"
log "- backup checksums: $BACKUP_SUMS"
log "- test log: $TEST_LOG"
log "Backup/restore drill finished with status=$status"

if [ "$status" != "PASS" ]; then
  exit 1
fi
