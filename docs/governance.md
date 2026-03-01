# ARES Governance Model (v2.1)

## Progressive Decentralization Stages

### Stage 1 — Controlled Launch Window
- multisig-assisted operations
- emergency procedures enabled
- advisory token voting for low-risk policy signaling

### Stage 2 — Timelock Governor Operation
- token voting with timelock execution
- formal quorum/threshold configuration
- emergency powers narrowed to exceptional paths

### Stage 3 — Full DAO Maturity
- governance-led operational cadence
- minimized founding-team exceptional authority
- on-chain parameter lifecycle as default

## Parameter Surface
Governance owns policy parameters for:
- scoring and dispute economics
- treasury emission and fee splits
- burn bounds and reward policy
- staking/distribution policy toggles

## Accepted Mainnet Target Profile
Conservative mainnet target accepted for readiness planning:
- Governor clock mode: block-number based
- voting delay: `86400` governor clock units
- voting period: `604800` governor clock units
- proposal threshold: `1,000,000 ARES`
- quorum: `6%`
- timelock min delay: `48h`
- open executor: `true`

Rationale:
- remove zero-cost proposal spam
- prevent a single `40M ARES` TGE tranche from satisfying quorum alone
- preserve review latency and timelock visibility without over-constraining governance

## Power Decay Note
Power decay remains a planned extension:
- planned as separate mainnet-prep module
- not implemented in this sprint

## Sprint Deliverable Scope
This sprint updates governance documentation and product consistency.
It does not ship new governance contract logic.
