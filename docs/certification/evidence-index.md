# ARES Certification Evidence Index

Status date: March 1, 2026  
Purpose: locate current certification evidence and identify what is still missing

## Purpose
This document is the evidence registry for ARES mainnet certification.

Each entry answers four questions:
- what artifact exists
- what it proves
- whether it is sufficient for mainnet signoff
- what evidence is still missing

Rationale: launch review breaks down if evidence is scattered across unrelated docs and scripts.

---

## Evidence Status Legend
- `Available`: artifact exists now
- `Partial`: artifact exists but is not sufficient for final signoff
- `Missing`: artifact has not yet been produced
- `Local-only`: artifact exists but is intentionally not published

---

## Existing Evidence

| Artifact | Status | Location | What It Proves | Mainnet Sufficiency |
|---|---|---|---|---|
| Mainnet certification policy | Available | `docs/mainnet-certification-framework-v1.md` | Defines certification standard, verdict model, evidence grammar, and launch gates | Not sufficient alone |
| Mainnet go/no-go checklist | Available | `docs/mainnet-go-no-go.md` | Defines main launch gates and current snapshot | Partial |
| Security ops runbook | Available | `docs/security-ops.md` | Documents runtime checks, monitoring baseline, and recovery controls | Partial |
| Governance handoff doc | Available | `docs/governance-handoff.md` | Documents Timelock/Governor handoff model and revocation expectations | Partial |
| Production deploy runbook | Available | `docs/production-deploy-gcp.md` | Documents hardened deployment and recovery topology | Partial |
| Token architecture note | Available | `docs/token-architecture.md` | Documents token authority direction and architecture intent | Partial |
| Tokenomics policy | Available | `docs/tokenomics.md` | Documents supply/distribution policy model | Partial |
| Sepolia governance smoke output | Available | `docs/demo/governance-proposal-smoke-sepolia.json` | Shows governance proposal proof-of-life on testnet | Partial |
| Sepolia governance revoke check | Available | `docs/demo/governance-state-sepolia-revoke-check.json` | Shows revoked deployer authority expectations on Sepolia | Partial |
| Sepolia demo proof | Available | `docs/demo/sepolia-demo-proof.json` | Documents live demo dataset and proof surfaces | Partial |
| Invariant registry baseline | Available | `docs/certification/generated/invariant-registry.md` | Maps current launch-critical invariants to modules, evidence, and current status | Partial |
| Security suite baseline | Available | `docs/certification/generated/security-suite-baseline-2026-03-01.md` | Records current Foundry test, invariant, and coverage baseline with measured blocker state (`73` passing tests; frozen critical subset `98.21%` line / `95.35%` branch) | Partial |
| Economic warfare scenario matrix | Available | `docs/certification/generated/economic-warfare-scenario-matrix.md` | Enumerates required economic scenarios and current modeling gaps | Partial |
| Governance immunity baseline | Available | `docs/certification/generated/governance-immunity-baseline-2026-03-01.md` | Distinguishes mechanically proven timelock authority routing from still-missing capture/signer/emergency-power evidence | Partial |
| Governance capture baseline | Available | `docs/certification/generated/governance-capture-baseline-2026-03-01.md` | Converts current Governor parameters and snapshot tests into explicit low-turnout capture and spam observations | Partial |
| Governance threshold model | Available | `docs/certification/generated/governance-threshold-model-2026-03-01.json` | Quantifies quorum size, TGE concentration, and proposal-threshold implications under tokenomics assumptions | Partial |
| Governance capture scenario model | Available | `docs/certification/generated/governance-capture-scenarios-2026-03-01.json` | Converts governance capture paths into structured scenario records with quantified token thresholds | Partial |
| Governance capture cost model | Available | `docs/certification/generated/governance-capture-cost-model-2026-03-01.md` | Ties quorum concentration and zero-threshold proposal spam to explicit token and notional-cost reads | Partial |
| Signer/key-management baseline | Available | `docs/certification/generated/signer-key-management-baseline-2026-03-01.md` | Defines required signer diversity, hardware posture, and authority-package evidence before mainnet | Partial |
| Token mint finality baseline | Available | `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md` | Proves full mint-finality ceremony path and shows why partial revocation is unsafe | Partial |
| Base/L2 resilience baseline | Available | `docs/certification/generated/base-l2-resilience-baseline-2026-03-01.md` | Distinguishes bounded ARI timing behavior from unresolved dispute fairness under sequencer delay/outage | Partial |
| Base delayed-inclusion policy | Available | `docs/certification/generated/base-delayed-inclusion-policy-2026-03-01.md` | Defines the minimum launch-policy response when dispute fairness may be impacted by delayed inclusion or sequencer degradation | Partial |
| Expanded executable contract tests | Available | `contracts/test/AresApiAccess.t.sol`, `contracts/test/AresAuthorityInvariants.t.sol`, `contracts/test/AresLedgerAuthorityInvariants.t.sol`, `contracts/test/AresTokenGovernor.t.sol`, `contracts/test/ERC8004ValidationAdapter.t.sol`, `contracts/test/AresCoreInvariants.t.sol`, `contracts/test/AresARIEngine.t.sol`, `contracts/test/AresRegistry.t.sol`, `contracts/test/AresScorecardLedger.t.sol`, `contracts/test/AresDispute.t.sol` | Shows direct baseline coverage for launch-critical modules, constructor/view guardrails, tampered-signature paths, adapter guardrails, dispute payout branches, settlement remainder/claim exhaustion, core invariants, token/API authority invariants, scorer-authorization mutation invariants, governed-target timelock routing, and mint-finality ceremony behavior | Partial |
| API / explorer live surfaces | Available | public endpoints | Demonstrate operational testnet/live infra | Not sufficient alone |
| Recovery forensic archive | Local-only | `.forensics/` | Preserves compromise and recovery evidence | Not a mainnet launch artifact |
| Master status tracker | Local-only | `docs/ARES_MASTER_STATUS_2026-02-27.md` | Broad internal progress tracker | Not a certification artifact |

---

## Missing Evidence Required for Mainnet Certification

### Security and correctness
- fuzz test report for frozen critical contracts
- governance-capture invariant suite
- storage safety report if any upgradeable path is introduced

### Economics
- EV model outputs per scenario outside governance
- dispute griefing cost analysis
- launch-accepted governance capture cost analysis and residual-risk decision
- residual-risk acceptance notes for non-zero residual scenarios

### Governance
- mainnet role matrix
- mainnet authority assignment report
- timelock enforcement artifact set
- emergency powers boundedness report
- frozen signer set and signer diversity record

### Token and TGE
- canonical mainnet token parameter file
- token deployment artifact set
- launch-day token finality transaction proofs
- mint revocation proof set
- treasury wallet registry
- vesting contract address set if used

### Base / L2
- Base fault model report
- sequencer outage test matrix
- timing drift tolerance output
- dispute fairness under delayed inclusion artifact

### Operations
- monitoring channel verification proof
- alert test proof
- backup/restore drill record
- incident severity and response targets document finalized as accepted evidence

### External review
- independent audit report
- remediation matrix
- final closure report for findings

### Final signoff
- launch signoff record
- residual-risk acceptance record, if any
- final certification verdict record

---

## Evidence by Workstream

### Workstream 1: Formal Security Spec
Current evidence:
- `docs/mainnet-certification-framework-v1.md`
- `docs/mainnet-go-no-go.md`
- `docs/certification/generated/invariant-registry.md`

Still needed:
- forbidden-transition artifact
- executable invariant mapping to frozen contract list

### Workstream 2: Executable Security Suite
Current evidence:
- existing repo tests and CI posture
- `contracts/test/AresApiAccess.t.sol`
- `contracts/test/AresAuthorityInvariants.t.sol`
- `contracts/test/AresLedgerAuthorityInvariants.t.sol`
- `contracts/test/AresTokenGovernor.t.sol`
- `contracts/test/ERC8004ValidationAdapter.t.sol`
- `contracts/test/AresCoreInvariants.t.sol`
- `docs/certification/generated/security-suite-baseline-2026-03-01.md`
- `docs/certification/generated/governance-immunity-baseline-2026-03-01.md`
- `docs/certification/generated/governance-capture-baseline-2026-03-01.md`
- `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md`

Still needed:
- certification-grade fuzz report
- residual branch-gap closure pack
- final residual branch-gap justification pack

### Workstream 3: Economic Simulation Pack
Current evidence:
- policy framework
- `docs/certification/generated/economic-warfare-scenario-matrix.md`
- `docs/certification/generated/governance-threshold-model-2026-03-01.json`
- `docs/certification/generated/governance-capture-scenarios-2026-03-01.json`
- `docs/certification/generated/governance-capture-cost-model-2026-03-01.md`

Still needed:
- full economic scenario outputs beyond governance
- EV tables and accepted residual-risk notes

### Workstream 4: Governance Certification Pack
Current evidence:
- `docs/governance-handoff.md`
- `docs/demo/governance-proposal-smoke-sepolia.json`
- `docs/demo/governance-state-sepolia-revoke-check.json`
- `contracts/test/AresTokenGovernor.t.sol`
- `docs/certification/generated/governance-immunity-baseline-2026-03-01.md`
- `docs/certification/generated/governance-capture-baseline-2026-03-01.md`
- `docs/certification/generated/governance-threshold-model-2026-03-01.json`
- `docs/certification/generated/governance-capture-cost-model-2026-03-01.md`
- `docs/certification/generated/signer-key-management-baseline-2026-03-01.md`

Still needed:
- mainnet authority pack
- spam/DOS analysis
- governance-capture invariants beyond local lifecycle execution and bounded authority surface

### Workstream 5: Base / L2 Resilience Pack
Current evidence:
- `docs/certification/generated/base-l2-resilience-baseline-2026-03-01.md`
- `docs/certification/generated/base-delayed-inclusion-policy-2026-03-01.md`
- `contracts/core/AresARIEngine.sol`
- `contracts/core/AresDispute.sol`
- `contracts/test/AresARIEngine.t.sol`

Still needed:
- explicit timing-delta acceptance threshold
- sequencer-outage/no-inclusion simulation output
- dispute fairness mitigation policy

### Workstream 4b: Token Finality Pack
Current evidence:
- `contracts/test/AresTokenGovernor.t.sol`
- `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md`
- `docs/token-architecture.md`

Still needed:
- mainnet token address registry
- minted supply proof
- minter revoke proof
- admin renounce proof
- launch-day signoff attachment

### Workstream 5: Deployment Certification Pack
Current evidence:
- `docs/production-deploy-gcp.md`
- public verified deployment/runtime surfaces on testnet/prod infra

Still needed:
- final mainnet address registry
- constructor table
- mainnet verification pack

### Workstream 6: Ops Certification Pack
Current evidence:
- `docs/security-ops.md`
- live monitoring baseline and hardened recovery state

Still needed:
- verified notification-channel proof
- backup/restore drill artifact
- final incident-severity signoff artifact

---

## Artifact Quality Rules
An artifact should not be counted as certification evidence unless it is:
- attributable to a specific environment or release
- reviewable by a third party
- consistent with higher-priority sources of truth
- current relative to the launch candidate

If an artifact is stale, contradictory, or only anecdotal, it should be treated as `Partial` or `Missing`.

---

## Operating Note
This index should be updated every time:
- a new certification artifact is created
- an artifact is replaced
- a blocker closes
- a previously accepted artifact becomes stale

This document is not archival. It is an active launch control surface.
