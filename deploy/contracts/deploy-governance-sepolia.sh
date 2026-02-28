#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
CORE_ADDR_FILE="${CORE_ADDR_FILE:-$ROOT_DIR/deploy/contracts/addresses.base-sepolia.json}"
OUT_FILE="${OUT_FILE:-$ROOT_DIR/deploy/contracts/governance.base-sepolia.json}"

if [[ -z "${BASE_SEPOLIA_RPC_URL:-}" ]]; then
  echo "Missing BASE_SEPOLIA_RPC_URL"
  exit 1
fi
if [[ -z "${ARES_DEPLOYER_KEY:-}" ]]; then
  echo "Missing ARES_DEPLOYER_KEY"
  exit 1
fi
if [[ ! -f "$CORE_ADDR_FILE" ]]; then
  echo "Missing core addresses file: $CORE_ADDR_FILE"
  exit 1
fi

export ARES_TOKEN_ADDRESS
ARES_TOKEN_ADDRESS="$(jq -r '.contracts.AresToken // empty' "$CORE_ADDR_FILE")"
if [[ -z "$ARES_TOKEN_ADDRESS" || "$ARES_TOKEN_ADDRESS" == "null" ]]; then
  echo "AresToken address not found in $CORE_ADDR_FILE"
  exit 1
fi

echo "[1/3] Deploying Timelock + Governor"
cd "$CONTRACTS_DIR"
DEPLOY_CMD=(
  forge script script/DeployGovernance.s.sol:DeployGovernance
  --rpc-url "$BASE_SEPOLIA_RPC_URL"
  --broadcast
)
"${DEPLOY_CMD[@]}"

echo "[2/3] Exporting governance addresses"
cd "$ROOT_DIR"
node deploy/contracts/refresh-governance-addresses-from-latest.mjs "$CONTRACTS_DIR/latest-governance.json" "$OUT_FILE"

echo "[3/3] Done"
echo "Core addresses:       $CORE_ADDR_FILE"
echo "Governance addresses: $OUT_FILE"
echo "Next: run handoff script after dry-run review."
