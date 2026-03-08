#!/usr/bin/env bash
set -euo pipefail

INSTANCE="${INSTANCE:-ares-vm-01}"
ZONE="${ZONE:-us-central1-a}"
PROJECT="${PROJECT:-ares-protocol-03010044}"
TARGET_DIR="${TARGET_DIR:-/var/www/ares/ares-protocol}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVE="/tmp/ares-protocol-src.tgz"
export COPYFILE_DISABLE=1

echo "Packing source from: $REPO_ROOT"
tar \
  --exclude=".git" \
  --exclude=".forensics" \
  --exclude="node_modules" \
  --exclude="contracts/lib" \
  --exclude="contracts/cache" \
  --exclude="output" \
  --exclude="tmp" \
  --exclude="ares_pitch_deck.pdf" \
  -czf "$ARCHIVE" -C "$REPO_ROOT" .

echo "Uploading archive to VM: $INSTANCE ($ZONE)"
gcloud compute scp "$ARCHIVE" "${INSTANCE}:~/ares-protocol-src.tgz" --project "$PROJECT" --zone "$ZONE" --quiet

echo "Extracting into: $TARGET_DIR"
gcloud compute ssh "$INSTANCE" --project "$PROJECT" --zone "$ZONE" --quiet --command "\
  sudo mkdir -p '$TARGET_DIR' && \
  sudo chown -R \$USER:\$USER /var/www/ares && \
  PRESERVE_DIR=\$(mktemp -d) && \
  for path in api/query-gateway/data api/query-gateway/.env dashboard/agent-explorer/.env.local dashboard/protocol-admin/.env.local; do \
    if [ -e '$TARGET_DIR'/\$path ]; then \
      mkdir -p \"\$PRESERVE_DIR/\$(dirname \$path)\" && \
      mv '$TARGET_DIR'/\$path \"\$PRESERVE_DIR/\$path\"; \
    fi; \
  done && \
  find '$TARGET_DIR' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && \
  tar -xzf ~/ares-protocol-src.tgz -C '$TARGET_DIR' && \
  for path in api/query-gateway/data api/query-gateway/.env dashboard/agent-explorer/.env.local dashboard/protocol-admin/.env.local; do \
    if [ -e \"\$PRESERVE_DIR/\$path\" ]; then \
      mkdir -p '$TARGET_DIR'/\$(dirname \$path) && \
      mv \"\$PRESERVE_DIR/\$path\" '$TARGET_DIR'/\$path; \
    fi; \
  done && \
  rm -rf \"\$PRESERVE_DIR\" \
"

echo "Sync complete."
