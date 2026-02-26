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
