# ARES Protocol v1.4 Execution Plan

## Order and dependencies
1. Monorepo bootstrap: root tooling, env, workspaces.
2. Contracts: core + ERC-8004 adapters + tests.
3. Subgraph schema and mappings.
4. API query-gateway + scoring-service + auth.
5. Dashboards.
6. SDKs.
7. Landing waitlist backend integration.
8. CI workflows and smoke tests.
9. Demo scripts and docs finalization.

## Critical constraints
- ERC-8004 language: published (Aug 2025), draft/proposed, gaining adoption.
- Core AgentID is non-transferable and stake-gated.
- ARI formula/tier ranges are fixed and unchanged.
- Dispute correction must remove invalid score contribution from decayed sums.

## Implementation notes (locked)
- Whitepaper wording is patched as “via spec-accurate adapters” for ERC-8004 registries.
- API/SDK expose both `agentId` (decimal string) and `agentIdHex`.
- Adapter register enforces duplicate guard and immutable adapter->core id mapping.
- Auth challenge uses nonce TTL (default 5m) and single-use invalidation on verify.
- Decay uses chunked fixed-point math with deterministic day saturation.
- `bridgeFeedbackToScorecard` is default-off and governance-controlled.
