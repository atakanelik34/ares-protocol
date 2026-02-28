#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
CHAIN_ID="84532"
OUT_FILE="$ROOT_DIR/deploy/contracts/addresses.base-sepolia.json"

if [[ -z "${BASE_SEPOLIA_RPC_URL:-}" ]]; then
  echo "Missing BASE_SEPOLIA_RPC_URL"
  exit 1
fi

if [[ -z "${ARES_DEPLOYER_KEY:-}" ]]; then
  echo "Missing ARES_DEPLOYER_KEY"
  exit 1
fi

START_BLOCK_ARG=()
if [[ -n "${SUBGRAPH_START_BLOCK:-}" ]]; then
  START_BLOCK_ARG=(--start-block "$SUBGRAPH_START_BLOCK")
fi

echo "[1/4] Deploying contracts to Base Sepolia"
cd "$CONTRACTS_DIR"
DEPLOY_CMD=(
  forge script script/DeployAres.s.sol:DeployAres
  --rpc-url "$BASE_SEPOLIA_RPC_URL"
  --broadcast
)
"${DEPLOY_CMD[@]}"

echo "[2/4] Exporting deployed addresses"
cd "$ROOT_DIR"
if [[ -f "$ROOT_DIR/deploy/contracts/latest-deploy.json" ]]; then
  node deploy/contracts/refresh-addresses-from-latest.mjs
else
  node deploy/contracts/extract-addresses.mjs --chain "$CHAIN_ID" --output "$OUT_FILE"
fi
OUT_FILE="$ROOT_DIR/deploy/contracts/addresses.base-sepolia.json"

if [[ "${#START_BLOCK_ARG[@]}" -eq 0 ]]; then
  FIRST_TX_HASH="$(jq -r '.transactions[0].hash // empty' "$CONTRACTS_DIR/broadcast/DeployAres.s.sol/$CHAIN_ID/run-latest.json")"
  if [[ -n "$FIRST_TX_HASH" ]]; then
    BLOCK_HEX="$(cast receipt --json --rpc-url "$BASE_SEPOLIA_RPC_URL" "$FIRST_TX_HASH" | jq -r '.blockNumber // empty')"
    if [[ -n "$BLOCK_HEX" ]]; then
      START_BLOCK_ARG=(--start-block "$((BLOCK_HEX))")
      echo "Detected subgraph start block: $((BLOCK_HEX))"
    fi
  fi
fi

echo "[3/4] Updating subgraph manifest addresses"
node deploy/contracts/update-subgraph-addresses.mjs \
  --addresses "$OUT_FILE" \
  --manifest "$ROOT_DIR/subgraph/subgraph.yaml" \
  --network "base-sepolia" \
  "${START_BLOCK_ARG[@]}"

echo "[4/4] Done"
echo "Addresses: $OUT_FILE"
echo "Next:"
echo "  npm --workspace subgraph run codegen"
echo "  npm --workspace subgraph run build"
echo "  npm --workspace subgraph run deploy:studio"
