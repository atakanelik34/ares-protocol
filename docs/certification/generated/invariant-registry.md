# ARES Invariant Registry

Status date: March 1, 2026  
Environment basis: current repository contracts and test suite  
Artifact class: Formal Security Spec / Workstream 1

## Purpose
This artifact enumerates the current launch-critical invariants for ARES and maps them to:
- owning module
- expected safety property
- current evidence source
- current certification state

Rationale: the framework requires an explicit invariant registry, not only narrative descriptions across multiple docs.

---

## Scope
This registry currently covers:
- `AresRegistry`
- `AresScorecardLedger`
- `AresARIEngine`
- `AresDispute`
- ERC-8004 adapters where their behavior affects safety boundaries
- governance/token authority only at high-level policy mapping stage

Not yet fully covered:
- `AresApiAccess`
- `AresGovernor`
- `AresToken` mainnet authority finality as an executable invariant set

Interpretation:
This registry is a baseline artifact, not final mainnet closure evidence.

---

## Invariant Status Legend
- `Covered`: explicit contract behavior plus direct test evidence exists
- `Partial`: contract behavior exists but direct certification-grade invariant evidence is incomplete
- `Missing`: invariant is required but not yet mapped to executable proof

---

## Registry Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| REG-01 | AresRegistry | Agent IDs are unique and monotonically assigned | Covered | `contracts/test/AresRegistry.t.sol` |
| REG-02 | AresRegistry | Canonical core identity is non-transferable | Partial | Core architecture and contract design; needs explicit negative-transfer invariant proof |
| REG-03 | AresRegistry | Stake cannot be withdrawn before cooldown expiry | Covered | `contracts/test/AresRegistry.t.sol` |
| REG-04 | AresRegistry | Wallet link/unlink cannot rebind unrelated identity silently | Covered | `contracts/test/AresRegistry.t.sol` |
| REG-05 | AresRegistry | Minimum stake gates registration | Partial | Contract behavior exists; direct test for registration below threshold not yet in suite |

---

## Scorecard Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| LED-01 | AresScorecardLedger | Scores must remain within `0..200` per dimension | Covered | `contracts/test/AresScorecardLedger.t.sol` |
| LED-02 | AresScorecardLedger | Only authorized scorers may write scorecards | Partial | Contract behavior exists; direct negative-path certification test should be extended |
| LED-03 | AresScorecardLedger | EIP-712 signature must bind agent/action/scores/timestamp | Partial | Current test signs and records successfully; negative signature mismatch cases still needed |
| LED-04 | AresScorecardLedger | Invalidated action cannot remain valid in ledger state | Covered | `contracts/test/AresDispute.t.sol` |
| LED-05 | AresScorecardLedger | Action record identity is unique per `(agentId, actionId)` | Partial | Contract semantics imply uniqueness; overwrite/replay behavior needs explicit proof |

---

## ARI Engine Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| ARI-01 | AresARIEngine | `0 <= ARI <= 1000` at all times | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-02 | AresARIEngine | Tier boundaries match documented ranges | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-03 | AresARIEngine | Large elapsed time cannot overflow or produce out-of-range score | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-04 | AresARIEngine | Invalidated action reduces valid action count and does not increase ARI | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-05 | AresARIEngine | Decay and volume confidence remain bounded under repeated updates | Partial | Current tests cover decay/correction path; stateful long-sequence invariant harness still missing |
| ARI-06 | AresARIEngine | Chunked decay saturation remains deterministic at high `daysSince` | Covered | `contracts/test/AresARIEngine.t.sol` |

---

## Dispute Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| DSP-01 | AresDispute | Finalized accepted challenge invalidates disputed action | Covered | `contracts/test/AresDispute.t.sol` |
| DSP-02 | AresDispute | Dispute cannot finalize twice | Partial | Contract behavior exists; explicit regression test needed |
| DSP-03 | AresDispute | Slash amount cannot exceed effective stake subject to params | Partial | Contract review indicates intended bound; executable invariant not yet produced |
| DSP-04 | AresDispute | No permanent lock state for challenger/validator claims | Partial | Claim path exists; no certification-grade exhaustiveness test yet |
| DSP-05 | AresDispute | Voting and winner distribution are deterministic post-deadline | Partial | Happy path exists; adversarial branch coverage remains low |

---

## Adapter Boundary Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| ADP-01 | Identity Adapter | Adapter registration cannot create canonical authority outside core | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-02 | Identity Adapter | Adapter owner desync is detectable but not canonical authority | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-03 | Reputation Adapter | Agent owner/operator cannot submit prohibited feedback through adapter path | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-04 | Validation Adapter | Adapter validation path cannot bypass dispute rules | Missing | No direct executable test yet |
| ADP-05 | Bridge feedback path remains disabled or tightly governed by policy | Partial | Contract design exists; explicit governance-path evidence absent |

---

## Governance and Token Authority Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| GOV-01 | Governor/Timelock | Critical authority must resolve through timelock boundary | Partial | Governance handoff docs and Sepolia proofs exist; executable certification pack not complete |
| GOV-02 | Governor/Timelock | Bootstrap deployer cannot retain live admin path after handoff | Partial | `docs/governance-handoff.md` and Sepolia revoke-check output |
| TOK-01 | AresToken | Mint authority must be final and non-reactivatable for mainnet | Missing | Mainnet architecture not finalized |
| TOK-02 | AresToken | Supply hard cap must be provable at launch | Missing | Mainnet token/TGE implementation not finalized |

---

## Current Assessment

### Strongest currently evidenced invariants
- ARI bounds and tier boundaries
- score range enforcement
- accepted-dispute invalidation path
- registry wallet link/unlink lifecycle
- adapter/core authority separation signal

### Weakest currently evidenced invariants
- dispute double-finalize and payout completeness
- authorized scorer negative-path depth
- validation adapter bypass resistance
- governance executable invariants
- token mint finality invariants

---

## Immediate Next Actions
1. Add direct negative-path tests for scorer authorization and signature mismatch.
2. Add dispute adversarial tests for double-finalize, claim replay, and payout exactness.
3. Add validation adapter tests.
4. Add governance lifecycle invariant pack.
5. Add token mint finality invariant pack once mainnet token architecture is frozen.

---

## Verdict
Current invariant registry status: `PASS WITH ASSUMPTIONS`

Reason:
The registry now exists and several high-value invariants are already supported by executable tests, but the registry is not yet backed by a certification-grade invariant harness across the entire launch-critical surface.
