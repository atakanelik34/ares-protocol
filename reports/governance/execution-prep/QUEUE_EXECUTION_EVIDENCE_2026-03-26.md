# Queue Execution Evidence (Base Sepolia)

- Date: 2026-03-26
- Network: Base Sepolia (84532)
- Governor: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`
- Timelock: `0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E`

## Pre-Queue Checklist (T-30m)

- [ ] `preflight-check` run output archived
- [ ] B-01/B-02 state = `Succeeded (4)`
- [ ] B-03 state = `Succeeded (4)`
- [ ] calldata/targets/values/descriptionHash match prep doc

Preflight artifact paths:
- `reports/governance/execution-prep/monitoring/<snapshot>.json`
- `reports/governance/execution-prep/monitoring/<snapshot>.md`

## Queue Transactions

### B-01/B-02
- Proposal ID: `58654035350196392900949207696152763655652189042590194943354964272374651090926`
- Queue tx hash: `<PENDING>`
- Block number: `<PENDING>`
- Receipt status: `<PENDING>`

### B-03
- Proposal ID: `102745141475066169865705909421050107559936801418546675182434592432068222986157`
- Queue tx hash: `<PENDING>`
- Block number: `<PENDING>`
- Receipt status: `<PENDING>`

## Post-Queue Verification

- [ ] B-01/B-02 state = `Queued (5)`
- [ ] B-03 state = `Queued (5)`
- [ ] `proposalEta` visible for both
- [ ] ETA aligns with timelock minDelay

Evidence:
- Post-queue preflight output: `<PATH>`

## Notes

- Do not mark queue as complete without tx hashes + receipts + post-queue state proof.
