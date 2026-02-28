#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
CORE_ADDR_FILE="${CORE_ADDR_FILE:-$ROOT_DIR/deploy/contracts/addresses.base-sepolia.json}"
GOV_ADDR_FILE="${GOV_ADDR_FILE:-$ROOT_DIR/deploy/contracts/governance.base-sepolia.json}"

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
if [[ ! -f "$GOV_ADDR_FILE" ]]; then
  echo "Missing governance addresses file: $GOV_ADDR_FILE"
  exit 1
fi

export TIMELOCK_CONTROLLER_ADDRESS
export ARES_GOVERNOR_ADDRESS
export ARES_TOKEN_ADDRESS
export ARES_REGISTRY_ADDRESS
export ARES_ARI_ENGINE_ADDRESS
export ARES_SCORECARD_LEDGER_ADDRESS
export ARES_DISPUTE_ADDRESS
export ARES_API_ACCESS_ADDRESS
export ERC8004_IDENTITY_ADAPTER_ADDRESS
export ERC8004_REPUTATION_ADAPTER_ADDRESS
export ERC8004_VALIDATION_ADAPTER_ADDRESS

TIMELOCK_CONTROLLER_ADDRESS="$(jq -r '.governance.TimelockController // empty' "$GOV_ADDR_FILE")"
ARES_GOVERNOR_ADDRESS="$(jq -r '.governance.AresGovernor // empty' "$GOV_ADDR_FILE")"
ARES_TOKEN_ADDRESS="$(jq -r '.contracts.AresToken // empty' "$CORE_ADDR_FILE")"
ARES_REGISTRY_ADDRESS="$(jq -r '.contracts.AresRegistry // empty' "$CORE_ADDR_FILE")"
ARES_ARI_ENGINE_ADDRESS="$(jq -r '.contracts.AresARIEngine // empty' "$CORE_ADDR_FILE")"
ARES_SCORECARD_LEDGER_ADDRESS="$(jq -r '.contracts.AresScorecardLedger // empty' "$CORE_ADDR_FILE")"
ARES_DISPUTE_ADDRESS="$(jq -r '.contracts.AresDispute // empty' "$CORE_ADDR_FILE")"
ARES_API_ACCESS_ADDRESS="$(jq -r '.contracts.AresApiAccess // empty' "$CORE_ADDR_FILE")"
ERC8004_IDENTITY_ADAPTER_ADDRESS="$(jq -r '.contracts.ERC8004IdentityAdapter // empty' "$CORE_ADDR_FILE")"
ERC8004_REPUTATION_ADAPTER_ADDRESS="$(jq -r '.contracts.ERC8004ReputationAdapter // empty' "$CORE_ADDR_FILE")"
ERC8004_VALIDATION_ADAPTER_ADDRESS="$(jq -r '.contracts.ERC8004ValidationAdapter // empty' "$CORE_ADDR_FILE")"

for v in \
  TIMELOCK_CONTROLLER_ADDRESS ARES_GOVERNOR_ADDRESS ARES_TOKEN_ADDRESS ARES_REGISTRY_ADDRESS \
  ARES_ARI_ENGINE_ADDRESS ARES_SCORECARD_LEDGER_ADDRESS ARES_DISPUTE_ADDRESS ARES_API_ACCESS_ADDRESS \
  ERC8004_IDENTITY_ADAPTER_ADDRESS ERC8004_REPUTATION_ADAPTER_ADDRESS ERC8004_VALIDATION_ADAPTER_ADDRESS; do
  if [[ -z "${!v}" || "${!v}" == "null" ]]; then
    echo "Missing address for ${v}"
    exit 1
  fi
done

echo "Handoff policy:"
echo "  HANDOFF_KEEP_DEPLOYER_ADMIN=${HANDOFF_KEEP_DEPLOYER_ADMIN:-true}"
echo "  HANDOFF_KEEP_DEPLOYER_GOVERNANCE=${HANDOFF_KEEP_DEPLOYER_GOVERNANCE:-true}"
echo "  HANDOFF_KEEP_DEPLOYER_MINTER=${HANDOFF_KEEP_DEPLOYER_MINTER:-true}"
echo "  HANDOFF_GRANT_TIMELOCK_MINTER=${HANDOFF_GRANT_TIMELOCK_MINTER:-true}"
echo "  HANDOFF_KEEP_DEPLOYER_TIMELOCK_ADMIN=${HANDOFF_KEEP_DEPLOYER_TIMELOCK_ADMIN:-true}"
echo "  HANDOFF_KEEP_DEPLOYER_TIMELOCK_PROPOSER=${HANDOFF_KEEP_DEPLOYER_TIMELOCK_PROPOSER:-true}"
echo "  HANDOFF_KEEP_DEPLOYER_TIMELOCK_CANCELLER=${HANDOFF_KEEP_DEPLOYER_TIMELOCK_CANCELLER:-true}"

echo "[1/2] Applying governance handoff actions"
cd "$CONTRACTS_DIR"
forge script script/HandoffGovernance.s.sol:HandoffGovernance \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --broadcast

echo "[2/2] Done"
echo "Next: run verify-governance-state.mjs --strict"
