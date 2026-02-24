# ARES Subgraph

## Local commands
- `npm --workspace subgraph run codegen`
- `npm --workspace subgraph run build`

## Configure addresses
Edit `subgraph/subgraph.yaml` source addresses before deployment.

## Deploy to Graph Studio
1. Set `GRAPH_STUDIO_DEPLOY_KEY`.
2. `graph auth --studio $GRAPH_STUDIO_DEPLOY_KEY`
3. `npm --workspace subgraph run deploy:studio`

Data model tracks canonical decimal `agentId` and adapter/core events.
