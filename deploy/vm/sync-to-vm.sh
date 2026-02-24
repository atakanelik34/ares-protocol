#!/usr/bin/env bash
set -euo pipefail

INSTANCE="${INSTANCE:-ares-vm-01}"
ZONE="${ZONE:-us-central1-a}"
TARGET_DIR="${TARGET_DIR:-/var/www/ares/ares-protocol}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVE="/tmp/ares-protocol-src.tgz"
export COPYFILE_DISABLE=1

echo "Packing source from: $REPO_ROOT"
tar \
  --exclude=".git" \
  --exclude="node_modules" \
  --exclude="contracts/lib" \
  --exclude="contracts/out" \
  --exclude="contracts/cache" \
  -czf "$ARCHIVE" -C "$REPO_ROOT" .

echo "Uploading archive to VM: $INSTANCE ($ZONE)"
gcloud compute scp "$ARCHIVE" "${INSTANCE}:~/ares-protocol-src.tgz" --zone "$ZONE" --quiet

echo "Extracting into: $TARGET_DIR"
gcloud compute ssh "$INSTANCE" --zone "$ZONE" --quiet --command "\
  sudo mkdir -p '$TARGET_DIR' && \
  sudo chown -R \$USER:\$USER /var/www/ares && \
  rm -rf '$TARGET_DIR'/* && \
  tar -xzf ~/ares-protocol-src.tgz -C '$TARGET_DIR' \
"

echo "Sync complete."
