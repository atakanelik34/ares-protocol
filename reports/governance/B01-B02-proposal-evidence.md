# B-01 + B-02 Governance Proposal Evidence (Base Sepolia)

- Generated at: 2026-03-10T04:25:29.812Z
- Network: Base Sepolia (84532)
- Governor: 0x99aA690870a0Df973B97e63b63c2A8375a80188e
- Timelock: 0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E
- Proposer: 0xa5B0ea86106927DFD830D82B9c24c1Aaa63303e2

## Baseline proposer checks at submission context

- ARES balance: 585000000000000000000 (585 ARES)
- Proposal threshold at query time: 0
- Quorum numerator at query time: 4
- Voting delay: 86400 blocks
- Voting period: 604800 blocks
- Timelock minDelay: 172800 seconds

## Batched actions

1. setProposalThreshold(uint256)
2. updateQuorumNumerator(uint256)
3. setDisputeParams(uint256,uint256,uint64,uint256,uint16,address)

## Proposal submission evidence

- Proposal ID: 58654035350196392900949207696152763655652189042590194943354964272374651090926
- Propose tx hash: 0x89714fb818a12135d88d0d52749bf428b18c043bff7908e4f9e5c5f99b171dd0
- Propose block: 38674155
- Proposal state after submit query: 0
- Snapshot block (votingDelay end): 38760555
- Deadline block (votingPeriod end): 39365355

## Duplicate submission note (same payload)

- Earlier tx hash: 0x378b08389cbf8cd4a920ccc46f8703cafaabad37afac839e8e7ae4fad96d2749
- Earlier proposal ID: 36773326457635065596127163568328886322360693104599402797367137036408573706005
- Earlier snapshot/deadline: 38760531 / 39365331
- Reason: repeat submission during script retries.

## Expected windows

- Expected votingDelay end block: 38760555
- Expected votingPeriod end block: 39365355
- Expected timelock queue window starts at block: 39365356
- Estimated timelock queue window time (2s/block): 2026-03-26T04:23:20.000Z
- Expected execute window (queue + minDelay): 2026-03-28T04:23:20.000Z

## Explorer links

- Propose tx: https://sepolia.basescan.org/tx/0x89714fb818a12135d88d0d52749bf428b18c043bff7908e4f9e5c5f99b171dd0
- Governor: https://sepolia.basescan.org/address/0x99aA690870a0Df973B97e63b63c2A8375a80188e
- Timelock: https://sepolia.basescan.org/address/0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E
