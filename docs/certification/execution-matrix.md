# ARES Certification Execution Matrix

Status date: March 1, 2026  
Stage: Testnet-live, pre-mainnet certification  
Canonical framework: `docs/mainnet-certification-framework-v1.md`

## Purpose
This matrix maps each certification workstream to:
- current verdict
- evidence currently available
- gaps still open
- next required action

Rationale: a framework without a live execution matrix becomes aspirational instead of operational.

---

## Verdict Legend
- `PASS`: requirement satisfied with current evidence
- `PASS WITH ASSUMPTIONS`: requirement provisionally satisfied, but depends on bounded assumptions or incomplete verification
- `BLOCKED`: requirement not yet satisfied for mainnet

---

## Workstream Matrix

| Workstream | Current Verdict | Current Basis | Remaining Gap | Next Action |
|---|---|---|---|---|
| Core architecture and authority separation | PASS | Core vs adapter vs derived surface boundary is documented and consistent across docs and code architecture | None at policy level | Preserve in all future contract changes |
| Governance authority model | PASS WITH ASSUMPTIONS | Sepolia Governor + Timelock deployed; handoff and revocation proofs exist; local Governor lifecycle executes in test harness; authority-surface invariants now cover token/api bounded mutations | Mainnet role graph, signer set, and final authority signoff not produced; capture resistance not yet certified | Generate mainnet role matrix and launch authority package |
| Token mint finality | BLOCKED | Token architecture and policy direction exist; token role/burn paths are now exercised locally | Mainnet one-time mint path, revocation proof, and final deployment architecture not implemented | Finalize token authority contracts and mint finality artifact set |
| Executable security suite and coverage gate | BLOCKED | Foundry suite expanded to `55` tests across `10` suites; frozen critical subset coverage now sits at `97.01%` line / `81.40%` branch with core plus authority stateful invariants in place | Branch coverage and mint-finality/governance-capture invariants remain below certification threshold | Extend remaining branch depth and add governance/mint-finality invariants |
| Registry/Ledger/ARI/Dispute correctness | PASS WITH ASSUMPTIONS | Direct suites now cover core lifecycle, negative paths, tampered signatures, invalidation, correction, payout branches, quorum-shortfall behavior, adapter entrypoints, governance validation, and dispute-aware invariants for invalidation/backing | Certification-grade fuzz pack remains incomplete and randomized settlement completeness invariants remain open | Expand settlement-focused fuzz coverage and scorer/governance invariants |
| Economic warfare certification | BLOCKED | Economic risk model is defined in framework and preliminary scenario matrix exists | No quantified EV outputs, cost curves, or residual-risk signoff yet | Generate full economic simulation report with scenario verdicts |
| Governance immunity certification | BLOCKED | Governance design is documented, Sepolia smoke exists, and local lifecycle path is tested | No full capture-cost, threshold, spam, and emergency-power certification pack | Produce governance immunity pack |
| ERC-8004 adapter safety boundary | PASS WITH ASSUMPTIONS | Identity/reputation selector snapshots, desync boundary tests, owner-feedback guardrails, bridge guardrails, and validation adapter forwarding tests exist | Formal conformance plus some residual branch blind spots are not yet assembled | Add adapter evidence and selector/conformance outputs |
| Base/L2 resilience | BLOCKED | Timing/censorship/sequencer assumptions are defined in framework | No formal Base fault model artifact or explicit tolerated timing deltas | Produce Base/L2 resilience report |
| Deployment hardening | PASS | Clean GCP recovery completed, old compromised ARES projects deleted, hardened prod runtime in place | Ongoing maintenance only | Keep deploy reports and runtime checks current |
| Security operations and monitoring | PASS WITH ASSUMPTIONS | Monitoring baseline, PM2 log rotation, abuse alerts, and hardened runtime are in place | Verified notification channel evidence and sustained operations review still needed | Capture alert verification proof and ops review snapshot |
| Data plane integrity | PASS WITH ASSUMPTIONS | Landing/docs/API/explorer are live; deterministic fallback protects demo surfaces | Canonical production data separation and subgraph consistency proof for mainnet not finalized | Produce mainnet data-plane integrity artifact |
| External security audit | BLOCKED | Framework and internal gating standard now exist | Independent audit and remediation closure not complete | Select auditor, freeze scope, run audit |
| Final signoff package | BLOCKED | Launch framework and certification workspace exist | Signer, security, ops, governance, and launch approver signoff package does not yet exist | Build final signoff record after blockers close |

---

## Current ARES Summary by Domain

### Domains currently strongest
- architecture separation
- testnet governance handoff proof
- production recovery and hardened runtime
- public surface stability
- adapter boundary testing
- dispute branch-depth expansion
- ledger/signature adversarial coverage
- baseline stateful invariant coverage

### Domains currently not ready for mainnet
- external audit closure
- token mint finality
- economic exploit certification
- governance immunity certification
- Base/L2 resilience certification
- final launch signoff package

---

## Immediate Priority Queue

### Priority 1
1. External audit scope freeze and kickoff
2. Token authority finality architecture for mainnet
3. Governance-capture and mint-finality stateful invariant expansion

### Priority 2
1. Remaining branch-depth tests for Dispute/Registry/ScorecardLedger/IdentityAdapter/ReputationAdapter/ARIEngine
2. Economic warfare scenario pack
3. Governance immunity pack
4. Base/L2 resilience report

### Priority 3
1. Alert verification proof
2. Final signoff package assembly
3. Certification directory expansion with generated artifacts

---

## Mainnet Readiness Interpretation
Current classification:
- infrastructure readiness: strong
- protocol certification readiness: intermediate-to-strong internal baseline
- mainnet verdict: `BLOCKED`

This is not a code-completeness problem anymore.  
It is a certification-completeness problem.

---

## Update Rule
Every time a blocker changes state, this matrix must be updated with:
- new verdict
- new evidence reference
- closed gap note
- next downstream dependency
