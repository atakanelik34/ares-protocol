# Governance Residual-Risk Acceptance

Status date: March 2, 2026  
Document class: audit handoff decision record  
Launch status: accepted for planning, not yet accepted for mainnet signoff

## Accepted planning posture
ARES mainnet planning is frozen to the conservative governance profile:
- `proposalThreshold = 1,000,000 ARES`
- `quorum = 6%`
- `timelockMinDelay = 48h`
- `openExecutor = true`

This replaces the weaker Sepolia-era planning posture of `0 threshold / 4% quorum`.

## What this changes
- Removes zero-cost proposal spam as a default condition.
- Prevents a single `40M` TGE tranche from satisfying quorum by itself.
- Preserves the current governance cadence while materially increasing the coalition needed to execute governance.

## Residual risks that remain
1. Low-turnout capture is reduced, not eliminated.
2. Proposal spam is no longer free, but still possible for sufficiently capitalized actors.
3. Governance safety still depends on final signer quality, monitoring, and timelock review discipline.
4. `openExecutor = true` remains acceptable only if authority routing and timelock assumptions hold.

## Auditor focus
The external auditor is expected to specifically evaluate:
- whether `1M / 6% / 48h` is sufficient relative to actual launch distribution
- whether `openExecutor = true` is acceptable under the final role graph
- whether any additional emergency or veto controls are warranted

## Mainnet signoff condition
This document does not by itself authorize mainnet launch.

Mainnet signoff additionally requires:
- external audit review of the governance surface
- final signer set freeze
- final authority registry with live addresses
- launch committee acceptance of remaining concentration and turnout risk

