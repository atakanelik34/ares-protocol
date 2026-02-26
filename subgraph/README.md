# ARES Subgraph

## Local commands
- `npm --workspace subgraph run codegen`
- `npm --workspace subgraph run build`

## Configure addresses
Preferred:
```bash
./deploy/contracts/deploy-base-sepolia.sh
```

If contracts are already deployed:
```bash
node deploy/contracts/update-subgraph-addresses.mjs \
  --addresses deploy/contracts/addresses.base-sepolia.json \
  --manifest subgraph/subgraph.yaml \
  --network base-sepolia
```

## Deploy to Graph Studio
1. Set `GRAPH_STUDIO_DEPLOY_KEY`.
2. `graph auth $GRAPH_STUDIO_DEPLOY_KEY`
3. Optionally set `SUBGRAPH_VERSION_LABEL` (example: `v0.1.0-sepolia-20260224-1`).
4. `npm --workspace subgraph run deploy:studio`

Data model tracks canonical decimal `agentId` and adapter/core events.
