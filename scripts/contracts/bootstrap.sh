#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR/contracts"

forge install openzeppelin/openzeppelin-contracts@v4.9.6 --no-git
forge install foundry-rs/forge-std@v1.9.4 --no-git
