# ARES Protocol
ARES (Autonomous Reputation & Evaluation Scoring) is Base-native trust infrastructure for AI agents.
Core modules: stake-gated non-transferable AgentID registry, action scorecard ledger, ARI engine (0-1000), dispute layer, and governance.
ARI model is fixed to 5 dimensions with weights `[0.30, 0.25, 0.20, 0.15, 0.10]`, time decay, and volume confidence.
ERC-8004 compatibility is provided via spec-accurate adapters (identity/reputation/validation), while core authority remains SBT registry based.

## Local setup
1. `cp .env.example .env`
2. `make setup`
3. `make contracts-setup` (first run only)
4. `cd contracts && forge test -vv`
5. `npm --workspace api/query-gateway run dev`
6. `npm --workspace api/scoring-service run dev`
7. `npm --workspace dashboard/agent-explorer run dev`
8. `npm --workspace dashboard/protocol-admin run dev`

## Demo flow
1. `npm --workspace api/scoring-service run seed:demo`
2. `npm --workspace api/scoring-service run demo:actions`
3. Query: `GET http://localhost:3001/v1/score/{agentAddress}`
4. Open explorer: `http://localhost:3003`

## Docs
- Architecture: `docs/architecture.md`
- Scoring: `docs/scoring.md`
- Security: `docs/security.md`
- Integration guide: `docs/integration-guide.md`
- Google VM deploy: `docs/production-deploy-gcp.md`
