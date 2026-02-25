# Base Batches 003 Execution Plan (13 Days)

## Submission target
- Program window: Feb 17 - Mar 9, 2026.
- Goal: ship testnet-validated ARES with live proof links before submission deadline.

## Must-have proof pack
1. Base Sepolia deployed and verified contracts.
2. Live API + live dashboard.
3. Live subgraph query endpoint.
4. Demo scenario:
   - 25 agents registered
   - 250 action scores recorded
   - 10+ disputes finalized (accepted/rejected mixed) with ARI correction checks
5. One 2-3 minute demo video with one-click link.
6. Submission bundle:
   - 500-word light paper
   - Differentiation statement (Core SBT + stake + dispute + ERC-8004 adapters)
   - GitHub + addresses + docs + API links

## Day-by-day execution
1. Day 1-2: lock contract params, deploy on Sepolia, verify contracts, export addresses.
2. Day 3: configure and deploy subgraph, validate index consistency.
3. Day 4-5: wire API to subgraph + on-chain paid access verification.
4. Day 6: seed deterministic demo data (25 agents / 250 actions / 10+ disputes).
5. Day 7-8: dashboard QA, canonical screenshots, docs freeze v1.
6. Day 9: record short demo video and create single-link demo page.
7. Day 10: write and review light paper (500 words).
8. Day 11: dry-run submission interview narrative.
9. Day 12: regression test and backup deploy plan.
10. Day 13: final application submit.

## Scope cuts (intentional)
- Token total supply finalization is post-audit/governance.
- Mainnet is presented as near-term milestone after Batch acceptance.
- Positioning: "testnet-validated infra" rather than "mainnet complete."

## Operational checklist
- `forge test` green.
- `npm run test` + `npm run build` green.
- `deploy/contracts/deploy-base-sepolia.sh` successful.
- `subgraph` codegen/build/deploy successful.
- `/v1/health`, `/v1/score/:agentAddress`, `/v1/access/:account` healthy.
- Landing waitlist post works against production API endpoint.
