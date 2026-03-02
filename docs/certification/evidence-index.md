# ARES Certification Evidence Index

Status date: March 2, 2026  
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
| Security ops runbook | Available | `docs/security-ops.md` | Documents runtime checks, monitoring baseline, recovery controls, and hardened prod expectations | Partial |
| Governance handoff doc | Available | `docs/governance-handoff.md` | Documents Timelock/Governor handoff model and revocation expectations | Partial |
| Production deploy runbook | Available | `docs/production-deploy-gcp.md` | Documents hardened deployment and recovery topology | Partial |
| Token architecture note | Available | `docs/token-architecture.md` | Documents token authority direction and architecture intent | Partial |
| Tokenomics policy | Available | `docs/tokenomics.md` | Documents supply/distribution policy model | Partial |
| Sepolia governance smoke output | Available | `docs/demo/governance-proposal-smoke-sepolia.json` | Shows governance proposal proof-of-life on testnet | Partial |
| Sepolia governance revoke check | Available | `docs/demo/governance-state-sepolia-revoke-check.json` | Shows revoked deployer authority expectations on Sepolia | Partial |
| Sepolia demo proof | Available | `docs/demo/sepolia-demo-proof.json` | Documents live demo dataset and proof surfaces | Partial |
| Invariant registry baseline | Available | `docs/certification/generated/invariant-registry.md` | Maps launch-critical invariants to modules, evidence, and status | Partial |
| Security suite baseline | Available | `docs/certification/generated/security-suite-baseline-2026-03-01.md` | Records current Foundry test, invariant, and coverage baseline | Partial |
| Governance-capture invariants baseline | Available | `docs/certification/generated/governance-capture-invariants-baseline-2026-03-02.md` | Shows which governance-capture shortcut paths are now mechanically constrained | Partial |
| Residual branch-gap report | Available | `docs/certification/generated/residual-branch-gap-report-2026-03-02.md` | Names remaining narrow branch/path blind spots after the frozen gate was met | Partial |
| Economic warfare scenario matrix | Available | `docs/certification/generated/economic-warfare-scenario-matrix.md` | Enumerates required economic scenarios and their expected output grammar | Partial |
| Economic warfare quantified report | Available | `docs/certification/generated/economic-warfare-report-2026-03-02.md`, `docs/certification/generated/economic-warfare-scenarios-2026-03-02.json` | Provides quantified EV-style reads across dispute, Sybil, timing, MEV, and governance scenarios | Partial |
| Governance immunity baseline | Available | `docs/certification/generated/governance-immunity-baseline-2026-03-01.md` | Distinguishes mechanically proven timelock authority routing from still-missing signer/emergency-power evidence | Partial |
| Governance capture baseline | Available | `docs/certification/generated/governance-capture-baseline-2026-03-01.md` | Converts current Governor parameters and snapshot tests into explicit low-turnout capture and spam observations | Partial |
| Governance threshold model | Available | `docs/certification/generated/governance-threshold-model-2026-03-01.json` | Quantifies quorum size, TGE concentration, and proposal-threshold implications | Partial |
| Governance capture scenario model | Available | `docs/certification/generated/governance-capture-scenarios-2026-03-01.json` | Converts governance capture paths into structured scenario records with quantified token thresholds | Partial |
| Governance capture cost model | Available | `docs/certification/generated/governance-capture-cost-model-2026-03-01.md` | Ties quorum concentration and proposal spam to explicit token/notional cost reads | Partial |
| Governance parameter decision record | Available | `docs/certification/generated/governance-parameter-decision-2026-03-01.md` | Freezes conservative mainnet governance profile at `1M threshold / 6% quorum / 48h timelock` | Partial |
| Governance risk register | Available | `docs/certification/generated/governance-risk-register-2026-03-02.json` | Separates eliminated governance risks from residual launch-accepted ones | Partial |
| Signer/key-management baseline | Available | `docs/certification/generated/signer-key-management-baseline-2026-03-01.md` | Defines required signer diversity, hardware posture, and authority-package evidence before mainnet | Partial |
| Token mint finality baseline | Available | `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md` | Proves the one-way mint-finality ceremony path in the tested model | Partial |
| Token finality rehearsal pack baseline | Available | `docs/certification/generated/token-finality-rehearsal-pack-2026-03-02.md`, `docs/certification/rehearsal/`, `scripts/certification/init-token-finality-rehearsal.mjs`, `scripts/certification/validate-token-finality-pack.mjs` | Converts token finality from templates into an executable bundle-generation and validation workflow | Partial |
| Authority package | Available | `docs/certification/authority/` | Freezes intended `3/5 mixed` signer topology, role matrix, replacement workflow, and compromised-signer response path | Partial |
| Authority freeze workflow baseline | Available | `docs/certification/generated/authority-freeze-pack-2026-03-02.md`, `docs/certification/generated/authority-freeze-gap-report-2026-03-02.md`, `docs/certification/authority/freeze/`, `scripts/certification/init-authority-freeze-pack.mjs`, `scripts/certification/validate-authority-freeze-pack.mjs` | Converts signer freeze and authority closure into an executable bundle-generation and validation workflow | Partial |
| Base/L2 resilience baseline | Available | `docs/certification/generated/base-l2-resilience-baseline-2026-03-01.md` | Distinguishes bounded ARI timing behavior from unresolved dispute fairness under sequencer delay/outage | Partial |
| Base delayed-inclusion policy | Available | `docs/certification/generated/base-delayed-inclusion-policy-2026-03-01.md` | Defines the minimum launch-policy response when dispute fairness may be impacted by delayed inclusion | Partial |
| Base no-inclusion simulation pack | Available | `docs/certification/generated/base-no-inclusion-simulation-2026-03-01.md`, `docs/certification/generated/base-no-inclusion-scenarios-2026-03-01.json`, `contracts/test/AresDisputeL2Timing.t.sol` | Converts delayed-inclusion/no-inclusion fairness from narrative into executable artifact and scenario pack | Partial |
| Base/L2 acceptance register | Available | `docs/certification/generated/base-l2-acceptance-register-2026-03-02.json`, `docs/audit/base-l2-launch-acceptance.md` | Provides launch-facing assumptions and residual-risk classification for Base sequencer/timing behavior | Partial |
| Mainnet readiness sprint acceptance | Available | `docs/certification/generated/mainnet-readiness-sprint-2026-03-01.md` | Records completion of the governance/L2/authority/audit-prep/token-template sprint | Partial |
| Mainnet rehearsal support pack | Available | `docs/certification/generated/mainnet-rehearsal-support-pack-2026-03-02.md`, `docs/rehearsal/mainnet/`, `scripts/certification/validate-mainnet-rehearsal-pack.mjs` | Converts mainnet rehearsal into a deterministic deployment/verify/rollback artifact pack | Partial |
| Launch-day support pack | Available | `docs/certification/generated/launch-day-support-pack-2026-03-02.md`, `docs/launch/` | Converts launch day into a fill-and-verify operator pack | Partial |
| Monitoring verification proof path | Available | `docs/certification/generated/monitoring-verification-proof-2026-03-02.md` | Names the exact evidence still required to treat monitoring as fully proven | Partial |
| External audit prep pack | Available | `docs/audit/` | Gives an auditor a decision-complete kickoff pack with frozen scope, deployment inventory, risks, open questions, readiness docs, and remediation workflow | Partial |
| Audit remediation workflow | Available | `docs/audit/remediation/` | Defines how findings are logged, patched, regressed, and reflected back into certification docs | Partial |
| Recovery forensic archive | Local-only | `.forensics/` | Preserves compromise and recovery evidence | Not a mainnet launch artifact |
| Master status tracker | Local-only | `docs/ARES_MASTER_STATUS_2026-02-27.md` | Broad internal progress tracker | Not a certification artifact |

---

## Missing Evidence Required for Mainnet Certification

### Security and correctness
- refreshed post-expansion coverage snapshot attached to the baseline artifact
- any audit-requested additional fuzz/invariant evidence

### Economics
- final launch acceptance or rejection of governance concentration residual risk
- auditor judgment on quantified economic scenario pack

### Governance and authority
- final signer identities and addresses
- final Safe address
- strict-valid authority freeze bundle
- signed governance residual-risk acceptance

### Token and TGE
- filled rehearsal bundle against intended authority topology
- live mainnet token authority proofs:
  - token address
  - vault address
  - mint tx hash
  - `MINTER_ROLE` revoke tx hash
  - `DEFAULT_ADMIN_ROLE` renounce tx hash
  - post-ceremony role graph

### Base / L2
- launch committee signoff on Base delayed/no-inclusion assumptions
- any auditor-requested extension to no-inclusion fairness testing

### Operations
- verified notification-channel proof
- backup/restore drill record
- incident severity signoff artifact accepted by ops owner

### External review
- independent audit report
- remediation closure report
- final closure report for findings

### Final signoff
- launch committee approval bundle
- final launch-day address registry
- post-launch smoke proof set
- final certification verdict record

---

## Evidence by Workstream

### Workstream 1: Formal Security Spec
Current evidence:
- `docs/mainnet-certification-framework-v1.md`
- `docs/mainnet-go-no-go.md`
- `docs/certification/generated/invariant-registry.md`

Still needed:
- final signoff record tying framework verdict to live launch artifacts

### Workstream 2: Executable Security Suite
Current evidence:
- `contracts/test/*`
- `docs/certification/generated/security-suite-baseline-2026-03-01.md`
- `docs/certification/generated/governance-capture-invariants-baseline-2026-03-02.md`
- `docs/certification/generated/residual-branch-gap-report-2026-03-02.md`

Still needed:
- refreshed coverage snapshot after latest suite expansion
- any audit-driven deepening

### Workstream 3: Economic Simulation Pack
Current evidence:
- `docs/certification/generated/economic-warfare-scenario-matrix.md`
- `docs/certification/generated/economic-warfare-report-2026-03-02.md`
- `docs/certification/generated/economic-warfare-scenarios-2026-03-02.json`
- governance capture economic artifacts

Still needed:
- signed acceptance or adjustment of governance concentration risk

### Workstream 4: Governance Certification Pack
Current evidence:
- governance handoff docs and Sepolia smoke artifacts
- governance threshold/capture/cost artifacts
- governance risk register
- authority package and authority freeze workflow
- governance residual-risk acceptance draft and approver signoff template

Still needed:
- real signer identities
- strict-valid authority bundle
- signed residual-risk acceptance

### Workstream 5: Base / L2 Resilience Pack
Current evidence:
- Base/L2 baseline, delayed-inclusion policy, no-inclusion simulation, dispute-window decision
- Base/L2 launch acceptance note and acceptance register

Still needed:
- final launch signoff on L2 assumptions

### Workstream 6: Token Finality Pack
Current evidence:
- token architecture note
- token finality baseline
- token finality templates
- token finality rehearsal workflow and validators

Still needed:
- filled rehearsal bundle with intended launch topology
- live execution proofs on mainnet day

### Workstream 7: Deployment / Audit Pack
Current evidence:
- `docs/audit/*`
- deterministic export bundle script
- artifact manifest
- auditor kickoff summary and checklist

Still needed:
- selected auditor
- audit kickoff bundle export attached to real kickoff

### Workstream 8: Ops Certification Pack
Current evidence:
- security ops runbook
- monitoring verification proof path
- incident severity signoff artifact
- backup/restore drill template

Still needed:
- verified alert channel proof
- backup/restore drill completion record

### Workstream 9: Rehearsal and Launch Support
Current evidence:
- mainnet rehearsal support pack
- launch-day support pack
- remediation workflow

Still needed:
- live rehearsal outputs
- final launch-day filled artifacts
