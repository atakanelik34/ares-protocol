# ARES Governance Capture Baseline

Status date: March 1, 2026  
Artifact class: Governance Certification Pack / Economic overlay  
Environment: local executable baseline + canonical tokenomics assumptions

## Purpose
This artifact translates the current ARES governance settings into explicit capture and spam risk observations.

It is not a final governance-capture certification report.  
It is the first bounded baseline tying executable snapshot behavior to the configured voting model and tokenomics assumptions.

---

## Evidence Used
- `contracts/test/AresTokenGovernor.t.sol`
- `contracts/token/AresGovernor.sol`
- `docs/tokenomics.md`
- `docs/certification/generated/governance-immunity-baseline-2026-03-01.md`
- `docs/certification/generated/governance-threshold-model-2026-03-01.json`
- `docs/certification/generated/governance-capture-cost-model-2026-03-01.md`

---

## Mechanically Proven Governance Properties

### 1. Post-snapshot minting does not increase voting power for an existing proposal
Local tests now prove that minting and delegating additional supply after proposal snapshot cannot retroactively create quorum or passing power for that proposal.

Evidence:
- `testPostSnapshotMintCannotCreateQuorumForExistingProposal`

### 2. Post-snapshot delegation does not increase voting power for an existing proposal
Local tests now prove that holding supply without delegation at snapshot and delegating only after voting starts does not retroactively create usable votes for that proposal.

Evidence:
- `testPostSnapshotDelegationCannotRetroactivelyIncreaseVotes`

### 3. Governor/Timelock route remains mandatory even for governed targets
Local tests already prove that queue and min-delay cannot be bypassed for timelock-gated state changes.

Evidence:
- `testGovernedTargetRejectsDirectMutationAndUnauthorizedScheduling`
- `testGovernorCannotBypassQueueOrTimelockDelayForGovernedMutation`

---

## Current Parameter Read

From code and threshold artifact:
- voting delay: `1 day`
- voting period: `1 week`
- quorum fraction: `4%`
- proposal threshold: `0`

From tokenomics target model:
- target total supply: `1,000,000,000 ARES`

Derived quorum under final tokenomics assumption:
- required quorum = `40,000,000 ARES`

Low-turnout implication:
- if opposition is absent and abstain votes are not needed, a bloc of roughly `40,000,000 ARES` can satisfy quorum and pass by simple majority of votes cast
- this is approximately `4%` of total modeled supply

Interpretation:
snapshot semantics reduce flash amplification after snapshot, but low-turnout concentration risk remains real under the current quorum and threshold configuration.

Cost-model bridge:
- the quantitative cost model now records this quorum as `4%` of total modeled supply and `50%` of modeled TGE circulating supply
- the same model records that proposal spam cost is `0` tokens under the current threshold

---

## Current Risk Read

### Capture Risk
- ARES cannot currently claim governance-whale immunity
- under the final tokenomics target, the low-turnout passing threshold is comparatively small relative to total supply
- signer diversity and operational review may mitigate damage after proposal creation, but they do not remove capture economics at the voting layer

### Spam Risk
- `proposalThreshold = 0` means proposal spam is not structurally gated by token threshold
- any address with zero threshold eligibility can open governance workload if other surrounding controls do not exist

### Flash-Loan Read
- ARES now has executable proof that post-snapshot minting or delegation cannot affect an existing proposal
- ARES does **not** yet claim that all flash-amplified voting strategies are impossible under the final launch environment
- same-window liquidity, concentration, and operational coordination assumptions still need explicit treatment

---

## Current Verdict
Current governance capture verdict: `BLOCKED`

Reason:
ARES now proves snapshot-boundary behavior, but current governance economics are still not certified. Quorum concentration, proposal spam, and final signer/authority overlays are unresolved.

---

## Minimum Conditions To Unblock
1. Produce final capture-cost model under actual launch token distribution and circulating assumptions.
2. Justify or revise `proposalThreshold = 0`.
3. Freeze mainnet signer set and authority-review process.
4. Publish governance residual-risk acceptance or parameter changes if low-turnout capture remains possible.
