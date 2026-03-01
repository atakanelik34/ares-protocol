# ARES Governance Parameter Decision Record

Status date: March 1, 2026  
Artifact class: Governance decision record  
Decision status: Accepted for mainnet readiness planning

## Purpose
This artifact closes the open decision on whether the current Governor profile is acceptable for mainnet.

It does not change the already-deployed Sepolia Governor.  
It defines the accepted conservative profile for mainnet deployment and certification.

## Current Config
Current Governor profile in deployed Sepolia artifacts:
- Governor clock mode: `blocknumber`
- voting delay: `86400` clock units
- voting period: `604800` clock units
- proposal threshold: `0 ARES`
- quorum: `4%`
- timelock min delay: `172800 seconds`
- open executor: `true`

## Proposed Conservative Mainnet Config
Accepted mainnet target:
- Governor clock mode: `blocknumber`
- voting delay: `86400` clock units
- voting period: `604800` clock units
- proposal threshold: `1,000,000 ARES`
- quorum: `6%`
- timelock min delay: `172800 seconds`
- open executor: `true`

## Attack Surface Delta
| Surface | Current | Accepted Mainnet | Effect |
|---|---|---:|---|
| Proposal spam cost | `0 ARES` | `1,000,000 ARES` | Removes zero-cost proposal spam |
| Quorum | `40,000,000 ARES` | `60,000,000 ARES` | Raises low-turnout capture cost |
| Single 40M TGE tranche | Meets quorum alone | Does not meet quorum alone | Removes single-tranche quorum sufficiency |
| Snapshot vote injection | Already mitigated | Already mitigated | No change |
| Review latency | unchanged | unchanged | Maintains current review cadence |

## Usability Tradeoff
Tradeoff accepted:
- proposal creation becomes meaningfully harder
- governance spam is materially reduced
- quorum now requires a broader coalition at launch
- review cadence and timelock visibility remain unchanged

This is the correct tradeoff for a trust/reputation primitive. Governance should be harder to spam than a generic consumer DAO.

## Final Accepted Config
ARES mainnet readiness planning is now locked to:
- `proposalThreshold = 1_000_000 ARES`
- `quorumBps = 600`
- `timelockMinDelay = 172800 seconds`
- `openExecutor = true`

## Implementation Path
1. `AresGovernor` constructor is parameterized.
2. `DeployGovernance.s.sol` consumes explicit governor env/config values.
3. Mainnet deploy path must set:
   - `GOVERNOR_VOTING_DELAY_BLOCKS=86400`
   - `GOVERNOR_VOTING_PERIOD_BLOCKS=604800`
   - `GOVERNOR_PROPOSAL_THRESHOLD=1000000000000000000000000`
   - `GOVERNOR_QUORUM_BPS=600`
4. Mainnet launch package must include the post-deploy governance parameter snapshot.

## Residual Risks
This decision reduces but does not eliminate:
- low-turnout governance capture
- signer/process dependence
- off-chain coordination attacks

Residual risks must still be managed by:
- signer review discipline
- authority package controls
- timelock monitoring
- launch signoff

## Rationale
ARES cannot defend a governance immunity claim with `proposalThreshold = 0` and `4% quorum` under current tokenomics assumptions.

The accepted mainnet profile is conservative enough to remove the most obvious spam and single-tranche concentration failure mode while remaining operationally usable.
