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
| REG-01 | AresRegistry | Agent IDs are unique and monotonically assigned | Covered | `contracts/test/AresRegistry.t.sol`, `contracts/test/AresCoreInvariants.t.sol` |
| REG-02 | AresRegistry | Canonical core identity is non-transferable | Partial | Core architecture and contract design; needs explicit negative-transfer invariant proof |
| REG-03 | AresRegistry | Stake cannot be withdrawn before cooldown expiry | Covered | `contracts/test/AresRegistry.t.sol` |
| REG-04 | AresRegistry | Wallet link/unlink cannot rebind unrelated identity silently | Covered | `contracts/test/AresRegistry.t.sol`, `contracts/test/AresCoreInvariants.t.sol` |
| REG-05 | AresRegistry | Minimum stake gates registration | Covered | `contracts/test/AresRegistry.t.sol` |

---

## Scorecard Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| LED-01 | AresScorecardLedger | Scores must remain within `0..200` per dimension | Covered | `contracts/test/AresScorecardLedger.t.sol` |
| LED-02 | AresScorecardLedger | Only authorized scorers may write scorecards | Covered | `contracts/test/AresScorecardLedger.t.sol`, `contracts/test/AresLedgerAuthorityInvariants.t.sol` |
| LED-03 | AresScorecardLedger | EIP-712 signature must bind agent/action/scores/timestamp | Covered | `contracts/test/AresScorecardLedger.t.sol` |
| LED-04 | AresScorecardLedger | Invalidated action cannot remain valid in ledger state | Covered | `contracts/test/AresDispute.t.sol` |
| LED-05 | AresScorecardLedger | Action record identity is unique per `(agentId, actionId)` | Covered | `contracts/test/AresScorecardLedger.t.sol` |

---

## ARI Engine Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| ARI-01 | AresARIEngine | `0 <= ARI <= 1000` at all times | Covered | `contracts/test/AresARIEngine.t.sol`, `contracts/test/AresCoreInvariants.t.sol` |
| ARI-02 | AresARIEngine | Tier boundaries match documented ranges | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-03 | AresARIEngine | Large elapsed time cannot overflow or produce out-of-range score | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-04 | AresARIEngine | Invalidated action reduces valid action count and does not increase ARI | Covered | `contracts/test/AresARIEngine.t.sol` |
| ARI-05 | AresARIEngine | Decay and volume confidence remain bounded under repeated updates | Covered | `contracts/test/AresARIEngine.t.sol`, `contracts/test/AresCoreInvariants.t.sol` |
| ARI-06 | AresARIEngine | Chunked decay saturation remains deterministic at high `daysSince` | Covered | `contracts/test/AresARIEngine.t.sol` |

---

## Dispute Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| DSP-01 | AresDispute | Finalized accepted challenge invalidates disputed action | Covered | `contracts/test/AresDispute.t.sol`, `contracts/test/AresCoreInvariants.t.sol` |
| DSP-02 | AresDispute | Dispute cannot finalize twice | Covered | `contracts/test/AresDispute.t.sol` |
| DSP-03 | AresDispute | Slash amount cannot exceed effective stake subject to params | Partial | Accepted/rejected challenge flows, quorum shortfall, governance param bounds, and settlement remainder paths are covered; no invariant proof over full parameter space exists |
| DSP-04 | AresDispute | No permanent lock state for challenger/validator claims | Partial | Claim path, replay guard, pending-withdrawal backing invariant, and escrow exhaustion after claims are covered; full randomized settlement completeness invariant still missing |
| DSP-05 | AresDispute | Voting and winner distribution are deterministic post-deadline | Partial | Accepted/rejected payout paths, quorum shortfall, governance/adapter guardrails, and repeated validator-join handling exist; randomized settlement invariant still missing |

---

## API Access Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| API-01 | AresApiAccess | Only configured plans may be purchased | Covered | `contracts/test/AresApiAccess.t.sol` |
| API-02 | AresApiAccess | Fee split updates remain governance-controlled and bounded | Covered | `contracts/test/AresApiAccess.t.sol` |
| API-03 | AresApiAccess | Access purchase extends only the target beneficiary and duration | Covered | `contracts/test/AresApiAccess.t.sol`, `contracts/test/AresAuthorityInvariants.t.sol` |
| API-04 | AresApiAccess | Treasury, validator vault, fee split, and tracked plans remain well-formed under repeated governance mutations | Covered | `contracts/test/AresAuthorityInvariants.t.sol` |

---

## Adapter Boundary Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| ADP-01 | Identity Adapter | Adapter registration cannot create canonical authority outside core | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-02 | Identity Adapter | Adapter owner desync is detectable but not canonical authority | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-03 | Reputation Adapter | Agent owner/operator cannot submit prohibited feedback through adapter path | Covered | `contracts/test/ERC8004Adapter.t.sol` |
| ADP-04 | Validation Adapter | Adapter validation path cannot bypass dispute rules | Covered | `contracts/test/ERC8004ValidationAdapter.t.sol` |
| ADP-05 | Bridge feedback path remains disabled or tightly governed by policy | Covered | `contracts/test/ERC8004Adapter.t.sol` |

---

## Governance and Token Authority Domain

| ID | Module | Invariant | Current Status | Current Evidence |
|---|---|---|---|---|
| GOV-01 | Governor/Timelock | Critical authority must resolve through timelock boundary | Covered | `contracts/test/AresTokenGovernor.t.sol`, `docs/governance-handoff.md`, and Sepolia proofs |
| GOV-02 | Governor/Timelock | Bootstrap deployer cannot retain live admin path after handoff | Partial | `docs/governance-handoff.md` and Sepolia revoke-check output |
| GOV-03 | Governor/Timelock | Proposal lifecycle is deterministic from propose to execute under configured delay | Covered | `contracts/test/AresTokenGovernor.t.sol` |
| GOV-04 | Token/API Authority | Mutable authority surfaces remain bounded under repeated privileged operations | Covered | `contracts/test/AresAuthorityInvariants.t.sol` |
| GOV-05 | Governor/Token snapshot | Post-snapshot minting or delegation cannot retroactively create voting power for an existing proposal | Covered | `contracts/test/AresTokenGovernor.t.sol`, `docs/certification/generated/governance-capture-baseline-2026-03-01.md`, `docs/certification/generated/governance-threshold-model-2026-03-01.json` |
| TOK-01 | AresToken | Mint authority must be final and non-reactivatable for mainnet | Partial | `contracts/test/AresTokenGovernor.t.sol`, `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md` |
| TOK-02 | AresToken | Supply hard cap must be provable at launch | Partial | `contracts/test/AresTokenGovernor.t.sol`, `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md` |
| TOK-03 | AresToken | Treasury role rotation and burn paths must not break vote accounting assumptions | Covered | `contracts/test/AresTokenGovernor.t.sol`, `contracts/test/AresAuthorityInvariants.t.sol` |

---

## Current Assessment

### Strongest currently evidenced invariants
- ARI bounds and tier boundaries
- ARI constructor/view guardrails and normalization/cap paths
- score range enforcement, tampered-signature rejection, and duplicate prevention
- scorer authorization mutation safety under repeated governance toggles
- accepted-dispute invalidation path plus accepted/rejected payout branches
- registry constructor, withdrawal, wallet link/unlink lifecycle, and resolution stability
- API access plan guardrails and repeated authority-surface invariants
- local Governor/Timelock lifecycle execution, governed-target timelock enforcement, and token privilege guards
- adapter/core authority separation, validation forwarding, and bridge guardrails

### Weakest currently evidenced invariants
- dispute settlement completeness under randomized multi-party conditions
- governance capture resistance and residual authority proofs beyond post-snapshot vote-injection resistance
- residual branch-depth blind spots in `AresDispute` and `ERC8004IdentityAdapter`

---

## Immediate Next Actions
1. Extend invariants to dispute-aware randomized settlement flows.
2. Add governance capture and residual-authority invariants beyond local lifecycle execution.
3. Add mainnet launch-day role/finality proofs for treasury and mint authority.
4. Extend governance invariants from authority routing into capture and emergency-power analysis.

---

## Verdict
Current invariant registry status: `PASS WITH ASSUMPTIONS`

Reason:
The registry now has direct executable evidence across more of the launch-critical surface and includes a real stateful invariant baseline, but it is not yet backed by certification-grade invariants across the entire protocol.
