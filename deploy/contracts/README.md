# Contract Deployment (Base Sepolia)

## Required env
- `BASE_SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `ETHERSCAN_API_KEY` (optional but recommended for verify)

## One-command deploy
```bash
./deploy/contracts/deploy-base-sepolia.sh
```

This command:
1. Broadcasts `DeployAres.s.sol` to Base Sepolia.
2. Extracts deployed addresses into `deploy/contracts/addresses.base-sepolia.json`.
3. Injects addresses (and detected `startBlock`) into `subgraph/subgraph.yaml`.

## Manual address extraction
```bash
node deploy/contracts/extract-addresses.mjs --chain 84532 --output deploy/contracts/addresses.base-sepolia.json
```

## Manual subgraph sync
```bash
node deploy/contracts/update-subgraph-addresses.mjs \
  --addresses deploy/contracts/addresses.base-sepolia.json \
  --manifest subgraph/subgraph.yaml \
  --network base-sepolia \
  --start-block 38101924
```

## Run on-chain demo scenario (3 agents / 20 actions / 1 dispute)
```bash
npm run demo:sepolia
```

Requires enough Base Sepolia ETH on deployer (`>= 0.06 ETH` recommended) because `recordActionScore` calldata is L1-cost heavy.

## Governance deploy (Timelock + Governor)
```bash
./deploy/contracts/deploy-governance-sepolia.sh
```

Produces:
- `contracts/latest-governance.json`
- `deploy/contracts/governance.base-sepolia.json`

Useful env knobs:
- `GOVERNANCE_MIN_DELAY` (default `2 days`)
- `GOVERNANCE_OPEN_EXECUTOR` (default `true`)
- `GOVERNANCE_KEEP_BOOTSTRAP_ROLES` (default `false`)
- `GOVERNANCE_RENOUNCE_TIMELOCK_ADMIN` (default `false`)

## Governance handoff to timelock
```bash
./deploy/contracts/handoff-governance-sepolia.sh
```

Conservative defaults keep deployer roles for rehearsal.
For strict cutover, pass:
- `HANDOFF_KEEP_DEPLOYER_ADMIN=false`
- `HANDOFF_KEEP_DEPLOYER_GOVERNANCE=false`
- `HANDOFF_KEEP_DEPLOYER_MINTER=false`
- `HANDOFF_KEEP_DEPLOYER_TIMELOCK_ADMIN=false`
- `HANDOFF_KEEP_DEPLOYER_TIMELOCK_PROPOSER=false`
- `HANDOFF_KEEP_DEPLOYER_TIMELOCK_CANCELLER=false`

## Verify governance state
```bash
node deploy/contracts/verify-governance-state.mjs --strict
```

For final cutover checks:
```bash
node deploy/contracts/verify-governance-state.mjs --strict --require-deployer-revoked
```
