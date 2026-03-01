# ARES Governance Capture Cost Model

Status date: March 1, 2026  
Artifact class: Governance Certification Pack / Economic overlay  
Environment: launch tokenomics assumptions + local executable Governor behavior

## Purpose
This artifact converts ARES governance settings into explicit capture and spam cost observations.

It is not a final launch approval.
It is the quantitative governance-risk bridge between the current Governor configuration and the tokenomics model.

---

## Evidence Used
- `docs/certification/generated/governance-threshold-model-2026-03-01.json`
- `docs/certification/generated/governance-capture-scenarios-2026-03-01.json`
- `docs/tokenomics.constants.json`
- `contracts/test/AresTokenGovernor.t.sol`

---

## Core Derived Numbers
- total modeled supply: `1,000,000,000 ARES`
- target TGE circulating supply: `80,000,000 ARES`
- current quorum fraction: `4%`
- derived quorum: `40,000,000 ARES`
- proposal threshold: `0 ARES`

Implications:
- a governance bloc holding `40,000,000 ARES` can satisfy quorum on its own under low-turnout conditions
- this is `4%` of total modeled supply
- this is `50%` of modeled TGE circulating supply
- reference notional value at seed price (`$0.005`) is approximately `$200,000`, but this is only a reference floor and not a statement about executable market acquisition cost

---

## Capture Scenarios

| Scenario ID | Scenario | Quantified Read | Current Status |
|---|---|---|---|
| `GOV-CAP-01` | Single-bloc quorum capture under low turnout | `40,000,000 ARES` can satisfy quorum alone | `BLOCKED` |
| `GOV-CAP-02` | TGE-era single-source quorum concentration | one modeled TGE component can equal quorum alone | `BLOCKED` |
| `GOV-CAP-03` | Proposal spam workload | proposal threshold is `0`, so token capital required to open governance workload is `0` | `BLOCKED` |
| `GOV-CAP-04` | Post-snapshot vote injection | executable tests show existing-proposal vote inflation is blocked by snapshot semantics | `MITIGATED` |

---

## What Is Quantitatively True Today

### 1. Low-turnout capture is not hypothetical
Under the current configuration, quorum is only `40,000,000 ARES`.
That means:
- any aligned bloc at or above `4%` of total modeled supply can satisfy quorum by itself
- during TGE-era circulation, that same quorum equals `50%` of modeled circulating supply

This is too small to claim governance-whale immunity.

### 2. TGE concentration can be governance-critical
The modeled ecosystem activation tranche is `40,000,000 ARES`.
That single component equals the entire quorum requirement.

Interpretation:
TGE distribution discipline is not merely tokenomics hygiene; it is governance security.

### 3. Proposal spam is structurally cheap
Because `proposalThreshold = 0`, the token-denominated cost of opening proposal workload is zero.

Interpretation:
ARES currently has no contract-level anti-spam gate at proposal creation.
Any claim of proposal-spam resistance must therefore come from off-chain review, signer process, or later parameter changes.

### 4. Snapshot semantics materially reduce one attack class
ARES now has executable proof that after an existing proposal's snapshot:
- minting new votes does not help
- delegating late does not help

This meaningfully reduces retroactive vote-injection risk for an already-open proposal.
It does not remove low-turnout capture or concentration risk.

---

## Current Verdict
Current governance capture cost-model verdict: `BLOCKED`

Reason:
ARES can now quantify the current risk surface. The quantified result is not acceptable for a mainnet immunity claim under the present quorum and proposal-threshold assumptions.

---

## Minimum Conditions To Unblock
1. Either increase governance cost or justify the current parameters with a stronger launch distribution and turnout model.
2. Replace or justify `proposalThreshold = 0`.
3. Freeze a signer-review and authority package that can detect and contain malicious governance flow before execution.
4. Produce a residual-risk acceptance note if low-turnout capture is knowingly retained.

---

## Audit Note
This artifact intentionally distinguishes:
- executable snapshot-bound behavior that is already proven
- parameterized economic risk that remains a launch decision

That distinction is critical for external reviewers.
