# B-03 Dispute v2 Cutover Evidence (Base Sepolia)

Generated: 2026-03-10
Network: Base Sepolia (84532)

Raw artifacts:
- `reports/mainnet-gates/B03-dispute-v2-cutover-raw.json`
- `reports/mainnet-gates/B03-new-dispute-flow-recovered.json`

## Scope
- Deploy fresh `AresDispute` v2 rehearsal instance.
- Deploy fresh `ERC8004ValidationAdapter` wired to new dispute.
- Grant adapter role on new dispute.
- Attempt old adapter revoke on old dispute.
- Open test dispute on old dispute contract (historical surface continuity check).
- Run full flow (`open -> vote -> resolve`) on new dispute instance.

## Canonical contracts
- Old dispute: `0x66168715B5A760d775a9672255bd49087063613f`
- Old validation adapter: `0x7AF6e906D5108D53aBf5F025a38Be4b0e0cD0aE3`
- New dispute (rehearsal): `0xBe8ceddF63626F5A3D817c06dBF8e28d00293214`
- New validation adapter (rehearsal): `0xF41E9af66C2e74686Ed0b0cD46195FE8D83cbDc3`

## Transaction evidence

1. Deploy new dispute v2
- Tx: `0xf540eea57f36397eb7c88840eb8cad586ed11d49b57e1cc28c6936c72d0cbdf9`
- Contract: `0xbe8ceddf63626f5a3d817c06dbf8e28d00293214`
- Block: `38675142`
- Explorer: https://sepolia.basescan.org/tx/0xf540eea57f36397eb7c88840eb8cad586ed11d49b57e1cc28c6936c72d0cbdf9

2. Deploy new validation adapter
- Tx: `0x22692dc2c204ab21876f4ffea3952ec75d7a833a904938ac3853269c301c8024`
- Contract: `0xf41e9af66c2e74686ed0b0cd46195fe8d83cbdc3`
- Block: `38675144`
- Explorer: https://sepolia.basescan.org/tx/0x22692dc2c204ab21876f4ffea3952ec75d7a833a904938ac3853269c301c8024

3. Grant adapter role on new dispute (`setAdapterRole(newAdapter,true)`)
- Tx: `0xda79deb243edc3878bbcb90e8ea00f16f35d6f8327e3763261405689b1499f0a`
- Block: `38675145`
- Explorer: https://sepolia.basescan.org/tx/0xda79deb243edc3878bbcb90e8ea00f16f35d6f8327e3763261405689b1499f0a

4. Open test dispute on old contract
- Tx: `0x15ec17be1be2842a11d59fc2d1d3ed81d338b87eb242cd0756e94f9fcd571662`
- Block: `38675151`
- New old-dispute id: `24`
- Explorer: https://sepolia.basescan.org/tx/0x15ec17be1be2842a11d59fc2d1d3ed81d338b87eb242cd0756e94f9fcd571662

5. New dispute full flow on rehearsal contract
- Open tx: `0x514fd682fc9b4d3744eafcf46cf130d88081c9dabdd83a0e8560e06ddbddf008` (block `38675153`)
- Join tx: `0x311b902cbb56763258049f93260fc85b8b5788cea15c9750097e5f43f03459ec` (block `38675202`)
- Vote tx: `0xf6f652a824b5beabf6a1af381dbfaaf3af8bdd387b15d7e0fb9600b84dfa9326` (block `38675204`)
- Finalize tx: `0x7dc3ff842ab2f3d13db5c439c1e70a3f3b539c83d3f350d57333bb08fe53351f` (block `38675216`)

Final state (`disputeId=1` on rehearsal dispute):
- `finalized=true`
- `accepted=false`
- `totalRejectStake=2000000000000000000`
- `totalAcceptStake=0`

## Role state before/after

Old dispute (`0x6616...613f`):
- Signer `0xa5B0...03e2` has `GOVERNANCE_ROLE`: **false**
- Old adapter has `ADAPTER_ROLE`: **true**

New rehearsal dispute (`0xBe8c...3214`):
- Signer `0xa5B0...03e2` has `GOVERNANCE_ROLE`: **true**
- New rehearsal adapter has `ADAPTER_ROLE`: **true**

## Revoke-on-old attempt

Attempted old-side revoke simulation:
- `setAdapterRole(oldAdapter,false)` on old dispute
- Result: **reverted**
- Reason: signer missing `GOVERNANCE_ROLE` (`AccessControl` revert)

This means role cutover could be rehearsed on new side, but not fully executed on old live contract without governance/timelock execution.

## Historical continuity check

Old historical dispute remained readable after rehearsal activity:
- Reference dispute id `18` (finalized, accepted=false) read successfully.
- `pendingWithdrawals(signer)` read path remains callable (`0` at check time).

## B-03 Gate status

- Fresh v2 deployment: **PASS**
- New adapter deployment + role grant: **PASS**
- Old dispute test-open: **PASS**
- New dispute full flow (`open->vote->resolve`): **PASS**
- Old adapter revoke on live old dispute: **BLOCKED by governance authority model**

Conclusion:
- Rehearsal demonstrates technical operability of dispute v2 flow.
- Full live cutover is **not fully closed** until governance executes old-side revoke / rewire actions on canonical old contract.
