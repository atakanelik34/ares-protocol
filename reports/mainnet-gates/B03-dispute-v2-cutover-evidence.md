# B-03 Dispute v2 Cutover Evidence (Base Sepolia)

Generated: 2026-03-10
Network: Base Sepolia (84532)

Raw artifact:
- `reports/mainnet-gates/B03-dispute-v2-cutover-raw.json`

## Scope
- Keep prior rehearsal evidence (fresh dispute v2 deploy + adapter deploy + full `open -> vote -> finalize` flow).
- Close the old-side revoke blocker by moving role rewiring + old ingress revoke into canonical governance flow.
- Capture role states before/after proposal submission.

## Rehearsal deployment + flow (already completed)
- New dispute v2 deploy tx: `0xf540eea57f36397eb7c88840eb8cad586ed11d49b57e1cc28c6936c72d0cbdf9`
- New validation adapter deploy tx: `0x22692dc2c204ab21876f4ffea3952ec75d7a833a904938ac3853269c301c8024`
- New adapter role grant on rehearsal dispute tx: `0xda79deb243edc3878bbcb90e8ea00f16f35d6f8327e3763261405689b1499f0a`
- Rehearsal dispute full flow txs:
  - open: `0x514fd682fc9b4d3744eafcf46cf130d88081c9dabdd83a0e8560e06ddbddf008`
  - join: `0x311b902cbb56763258049f93260fc85b8b5788cea15c9750097e5f43f03459ec`
  - vote: `0xf6f652a824b5beabf6a1af381dbfaaf3af8bdd387b15d7e0fb9600b84dfa9326`
  - finalize: `0x7dc3ff842ab2f3d13db5c439c1e70a3f3b539c83d3f350d57333bb08fe53351f`

## Why direct old-side revoke cannot be done by deployer EOA
Direct call attempt to old dispute `setAdapterRole(oldAdapter, false)` reverts:
- error: `AccessControl ... missing GOVERNANCE_ROLE`
- reason confirmed on-chain by current timelock role state:
  - `governorProposer = true`
  - `deployerProposer = false`
  - `deployerAdmin = false`

So old-side revoke is timelock/governor gated by design.

## Governance proposal submitted for full cutover (role rewire + old revoke)
- Proposal tx: `0xce0afc99a1544a994e326115137cab453369d601acafbd1a1f22d6e4383c1791`
- Proposal ID: `102745141475066169865705909421050107559936801418546675182434592432068222986157`
- State now: `0` (`Pending`)
- Vote start block: `38763050`
- Vote end block: `39367850`
- Earliest queue block: `39367851`
- Estimated earliest queue time: `2026-03-26T05:46:30.000Z`
- Estimated earliest execute time (queue + timelock): `2026-03-28T05:46:30.000Z`

Batched actions in proposal:
1. `AresScorecardLedger.grantRole(DISPUTE_ROLE, rehearsalDispute)`
2. `AresARIEngine.grantRole(DISPUTE_ROLE, rehearsalDispute)`
3. `AresDispute(old).setAdapterRole(oldAdapter, false)`
4. `AresScorecardLedger.revokeRole(DISPUTE_ROLE, oldDispute)`
5. `AresARIEngine.revokeRole(DISPUTE_ROLE, oldDispute)`

## Role state snapshot
Current state (before execution, and unchanged after proposal submit):
- `oldDisputeOldAdapterRole = true`
- `ledgerOldDisputeRole = true`
- `ledgerNewDisputeRole = false`
- `ariOldDisputeRole = true`
- `ariNewDisputeRole = false`

## B-03 gate status
- Rehearsal operability: **PASS**
- Governance cutover proposal submitted: **PASS**
- Old-side revoke fully executed on-chain: **PENDING GOVERNANCE WINDOW**

Conclusion:
- The blocker is now in active governance execution pipeline with on-chain evidence.
- Final closure requires vote -> queue -> execute completion of the submitted proposal.
