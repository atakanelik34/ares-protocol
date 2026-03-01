# Known Risks and Assumptions

## Current mainnet blockers
1. External audit not yet completed.
2. Launch-day token finality ceremony not yet executed.
3. Final signer set and live authority registry not yet frozen with real addresses.
4. Governance capture residual risk still requires final launch acceptance after parameter changes.
5. Base delayed/no-inclusion risk is bounded and operationally mitigated, not mathematically eliminated.

## Accepted assumptions for current certification work
- Mainnet governance uses conservative profile: `1M threshold / 6% quorum / 48h timelock`.
- Mainnet dispute voting period target is `14 days`.
- Mainnet signer topology is `3/5 mixed`.
- Token genesis uses single-vault mint topology.

## Known integration risks
- RISK: Off-chain integrators may skip wallet-AgentID binding verification and rely solely on ARI score lookup.
- MITIGATION: The integration guide explicitly documents the mandatory binding check. On-chain integrations should enforce this at contract level via `operatorOf()` before trusting any score.
- RESIDUAL: Incorrect off-chain integrations cannot be prevented by the protocol. This remains an integrator responsibility and must be treated as part of the integration threat model.

## Residual-risk notes
- Proposal spam is materially reduced, not absolutely impossible.
- Low-turnout governance capture is reduced by threshold/quorum changes but still depends on real distribution and voter participation.
- L2 inclusion timing cannot be removed; it can only be bounded via larger windows and operational response.
