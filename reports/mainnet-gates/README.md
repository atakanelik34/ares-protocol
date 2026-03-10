# Mainnet Gates Evidence Summary (March 10, 2026)

This folder contains evidence artifacts for mainnet-readiness gates B-03 and B-04.

## Artifacts
- `reports/mainnet-gates/B03-dispute-v2-cutover-evidence.md`
- `reports/mainnet-gates/B03-dispute-v2-cutover-raw.json`
- `reports/mainnet-gates/B03-new-dispute-flow-recovered.json`
- `reports/mainnet-gates/B04-data-plane-integrity-evidence.md`
- `reports/mainnet-gates/B04-data-plane-integrity-raw.json`
- `reports/mainnet-gates/B04-no-quorum-onchain-rehearsal.json`

## Gate Status
| Gate | Status | Summary |
|---|---|---|
| B-03 Dispute v2 cutover rehearsal | IN PROGRESS (governance window) | Rehearsal deploy and full new-dispute flow already passed. Direct old-side revoke is timelock/governor-gated by design; a batched governance proposal was submitted to perform role rewire + old ingress revoke on-chain (`proposal tx: 0xce0afc99a1544a994e326115137cab453369d601acafbd1a1f22d6e4383c1791`). Final closure requires vote -> queue -> execute. |
| B-04 Data-plane integrity | CLOSED | Subgraph deployment gap is fixed, API-vs-subgraph top-5 consistency is confirmed, and production rollout is complete. Live `https://ares-protocol.xyz/api/v1/scores?limit=5` and `https://ares-protocol.xyz/api/v1/disputes?limit=5` both return `200` (verified `2026-03-10T06:45:29Z`). |

## Validation Commands (Executed)
- `forge test --root ./contracts` -> PASS (`106 passed, 0 failed`)
- `npm test` -> PASS (`40 passed, 0 failed` across workspaces)
- `npm run docs:validate` -> PASS

## Remaining Closure Conditions
1. B-03: execute submitted governance proposal after voting/timelock windows to finalize old-side role revoke and role rewire.
