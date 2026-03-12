# Governance Baseline Freeze (Phase 0)

- Date: 2026-03-12
- Network: Base Sepolia (84532)
- Scope: B-01/B-02 and B-03 governance lifecycle closure

## Canonical Sources Locked

- Blocker board:
  - `reports/mainnet-gates/ARES_MAINNET_BLOCKER_BOARD_2026-03-12.md`
- Execution prep:
  - `reports/governance/execution-prep/GOVERNANCE_EXECUTION_PREP_2026-03-26.md`
- Runtime snapshot:
  - `reports/governance/execution-prep/monitoring/latest-preflight.json`
  - `reports/governance/execution-prep/monitoring/latest-preflight.md`

## Operator Input Freeze

- Governor: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`
- Timelock: `0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E`
- Proposal IDs:
  - B-01/B-02: `58654035350196392900949207696152763655652189042590194943354964272374651090926`
  - B-03: `102745141475066169865705909421050107559936801418546675182434592432068222986157`
- Proposal tx hashes:
  - B-01/B-02: `0x89714fb818a12135d88d0d52749bf428b18c043bff7908e4f9e5c5f99b171dd0`
  - B-03: `0xce0afc99a1544a994e326115137cab453369d601acafbd1a1f22d6e4383c1791`
- RPC source: `BASE_SEPOLIA_RPC_URL` (fallback `BASE_RPC_URL`) from root `.env`
- Signer source: `ARES_DEPLOYER_KEY` from root `.env`

## On-Chain Consistency Check (Locked)

Snapshot source:
- `reports/governance/execution-prep/monitoring/preflight-2026-03-12T14-32-21-191Z.json`

Verified:
- B-01/B-02 state: `1 (Active)`
- B-03 state: `1 (Active)`
- B-01/B-02 description hash: `0x0382e11fcbb0d317393237adf2a0bfe81f2fd5c77244f87e7edbda24b9e9598b`
- B-03 description hash: `0x8ca8ad00c2d9909561a97b1a4839dcedbb01e1cb05d8f0253a00e02b86db64f2`
- `hashProposal(...)` equals on-chain proposal ID for both proposals.
- Queue/execute windows are currently closed (as expected before deadline + timelock).

## Exit Gate Result

- Phase 0 gate: **PASS**
- Unresolved ambiguity on calldata/descriptionHash: **None**
