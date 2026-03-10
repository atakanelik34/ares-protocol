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
| B-03 Dispute v2 cutover rehearsal | PARTIAL | New dispute v2 + new validation adapter deployed and exercised end-to-end (`open -> join -> vote -> finalize`), historical reads on old contract confirmed. Old-side adapter revoke is governance-gated and was not executable by deployer EOA during rehearsal. |
| B-04 Data-plane integrity | PARTIAL / BLOCKED | Public API internal consistency checks on sampled agents passed, but `/v1/scores` and `/v1/disputes` are not exposed (404), configured subgraph deployment probe failed, and canonical API-level `NO_QUORUM` semantic confirmation is blocked despite on-chain rehearsal proving `resolution=NO_QUORUM`. |

## Validation Commands (Executed)
- `forge test --root ./contracts` -> PASS (`106 passed, 0 failed`)
- `npm test` -> PASS (`39 passed, 0 failed` across workspaces)
- `npm run docs:validate` -> PASS

## Remaining Closure Conditions
1. Execute governance/timelock action(s) required to complete old-side adapter role revoke in canonical cutover.
2. Provide/restore canonical disputes and scores list API surface (or equivalent documented endpoint contract) for production verification.
3. Restore valid production subgraph deployment endpoint.
4. Expose/verify API-level dispute resolution semantics where `NO_QUORUM` can be distinguished from `REJECTED`.
