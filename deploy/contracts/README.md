# Contract Deployment (Base Sepolia)

## Required env
- `BASE_SEPOLIA_RPC_URL`
- `ARES_DEPLOYER_KEY`

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
- `GOVERNOR_VOTING_DELAY_BLOCKS` (default `86400`; Governor clock units, currently block-number based)
- `GOVERNOR_VOTING_PERIOD_BLOCKS` (default `604800`; Governor clock units, currently block-number based)
- `GOVERNOR_PROPOSAL_THRESHOLD` (default `0` for legacy testnet; conservative mainnet target `1_000_000 ARES`)
- `GOVERNOR_QUORUM_BPS` (default `400` for legacy testnet; conservative mainnet target `600`)
- `GOVERNANCE_OPEN_EXECUTOR` (default `true`)
- `GOVERNANCE_KEEP_BOOTSTRAP_ROLES` (default `false`)
- `GOVERNANCE_RENOUNCE_TIMELOCK_ADMIN` (default `false`)

Mainnet conservative governance target:
- proposal threshold: `1,000,000 ARES`
- quorum: `6%`
- timelock min delay: `48h`
- open executor: `true`

Dispute deployment knobs:
- `DISPUTE_MIN_CHALLENGER_STAKE`
- `DISPUTE_MIN_VALIDATOR_STAKE`
- `DISPUTE_VOTING_PERIOD_SECONDS` (legacy testnet default `3 days`; conservative mainnet target `14 days`)
- `DISPUTE_QUORUM`
- `DISPUTE_SLASHING_BPS`

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

Manual verify can be handled out-of-band if needed; wrapper scripts do not embed verifier-specific flags.

## Governance proposal smoke test (Base Sepolia)
Create one live governance proposal (parameter update example) and write proof:

```bash
node deploy/contracts/governance-proposal-smoke-sepolia.mjs
```

Output:
- `docs/demo/governance-proposal-smoke-sepolia.json`

Notes:
- This smoke test proves live on-chain proposal creation.
- Vote/queue/execute windows follow deployed settings (`votingDelay=86400 blocks`, `votingPeriod=604800 blocks`, `timelockMinDelay=172800s`), so lifecycle completion is intentionally delayed.
