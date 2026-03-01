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
- `AresApiAccess`
- ERC-8004 adapters where their behavior affects safety boundaries
- governance/token authority at executable baseline stage

Not yet fully covered:
- stateful invariant harnesses across launch-critical modules
- token mint finality as a frozen mainnet invariant pack
- governance capture resistance as an executable invariant set

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
| REG-05 | AresRegistry | Minimum stake gates registration | Partial | Contract behavior exists; below-threshold registration should be isolated as its own invariant test |

---

## Scorecard Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| LED-01 | AresScorecardLedger | Scores must remain within `0..200` per dimension | Covered | `contracts/test/AresScorecardLedger.t.sol` |
| LED-02 | AresScorecardLedger | Only authorized scorers may write scorecards | Covered | `contracts/test/AresScorecardLedger.t.sol` |
| LED-03 | AresScorecardLedger | EIP-712 signature must bind agent/action/scores/timestamp | Partial | Current suite covers valid signature path and unauthorized rejection; explicit tampered-payload cases still needed |
| LED-04 | AresScorecardLedger | Invalidated action cannot remain valid in ledger state | Covered | `contracts/test/AresDispute.t.sol` |
| LED-05 | AresScorecardLedger | Action record identity is unique per `(agentId, actionId)` | Covered | `contracts/test/AresScorecardLedger.t.sol` |

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
| DSP-02 | AresDispute | Dispute cannot finalize twice | Covered | `contracts/test/AresDispute.t.sol` |
| DSP-03 | AresDispute | Slash amount cannot exceed effective stake subject to params | Partial | Current tests exercise accepted/rejected challenge flows, but no invariant proof over parameter space exists |
| DSP-04 | AresDispute | No permanent lock state for challenger/validator claims | Partial | Claim path exists; no certification-grade exhaustiveness test yet |
| DSP-05 | AresDispute | Voting and winner distribution are deterministic post-deadline | Partial | Happy path and guardrails exist; adversarial branch coverage remains low |

---

## API Access Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| API-01 | AresApiAccess | Only configured plans may be purchased | Covered | `contracts/test/AresApiAccess.t.sol` |
| API-02 | AresApiAccess | Fee split updates remain governance-controlled and bounded | Covered | `contracts/test/AresApiAccess.t.sol` |
| API-03 | AresApiAccess | Access purchase extends only the target beneficiary and duration | Partial | Happy-path behavior is covered; certification-grade replay and adversarial beneficiary cases still need depth |

---

## Adapter Boundary Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| ADP-01 | Identity Adapter | Adapter registration cannot create canonical authority outside core | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-02 | Identity Adapter | Adapter owner desync is detectable but not canonical authority | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-03 | Reputation Adapter | Agent owner/operator cannot submit prohibited feedback through adapter path | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-04 | Validation Adapter | Adapter validation path cannot bypass dispute rules | Covered | `contracts/test/ERC8004ValidationAdapter.t.sol` |
| ADP-05 | Bridge feedback path remains disabled or tightly governed by policy | Partial | Contract design exists; explicit governance-path evidence absent |

---

## Governance and Token Authority Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| GOV-01 | Governor/Timelock | Critical authority must resolve through timelock boundary | Partial | `contracts/test/AresTokenGovernor.t.sol`, `docs/governance-handoff.md`, and Sepolia proofs |
| GOV-02 | Governor/Timelock | Bootstrap deployer cannot retain live admin path after handoff | Partial | `docs/governance-handoff.md` and Sepolia revoke-check output |
| GOV-03 | Governor/Timelock | Proposal lifecycle is deterministic from propose to execute under configured delay | Covered | `contracts/test/AresTokenGovernor.t.sol` |
| TOK-01 | AresToken | Mint authority must be final and non-reactivatable for mainnet | Missing | Mainnet architecture not finalized |
| TOK-02 | AresToken | Supply hard cap must be provable at launch | Missing | Mainnet token/TGE implementation not finalized |
| TOK-03 | AresToken | Treasury role rotation and burn paths must not break vote accounting assumptions | Covered | `contracts/test/AresTokenGovernor.t.sol` |

---

## Current Assessment

### Strongest currently evidenced invariants
- ARI bounds and tier boundaries
- score range enforcement and duplicate prevention
- accepted-dispute invalidation path
- registry wallet link/unlink lifecycle
- API access plan guardrails
- local Governor/Timelock lifecycle execution
- adapter/core authority separation and validation forwarding

### Weakest currently evidenced invariants
- stateful long-sequence ARI/dispute behavior
- reputation adapter adversarial branch depth
- mainnet token mint finality invariants
- governance capture resistance and residual authority proofs

---

## Immediate Next Actions
1. Add explicit tampered-signature tests for scorecards.
2. Add stateful invariant suites for Registry/Ledger/Engine/Dispute.
3. Deepen adversarial branch coverage for `ERC8004IdentityAdapter` and `ERC8004ReputationAdapter`.
4. Add governance authority invariants beyond local lifecycle execution.
5. Add token mint finality invariant pack once mainnet token architecture is frozen.

---

## Verdict
Current invariant registry status: `PASS WITH ASSUMPTIONS`

Reason:
The registry now covers materially more of the launch-critical surface with direct executable tests, but it is not yet backed by certification-grade invariant harnesses across the entire protocol.
