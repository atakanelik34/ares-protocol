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
| Governance authority model | PASS WITH ASSUMPTIONS | Sepolia Governor + Timelock deployed, handoff and revocation proofs exist | Mainnet role graph and final signoff not produced | Generate mainnet role matrix and launch authority package |
| Token mint finality | BLOCKED | Token architecture and policy direction exist | Mainnet one-time mint path, revocation proof, and final deployment architecture not implemented | Finalize token authority contracts and mint finality artifact set |
| Registry/Ledger/ARI/Dispute correctness | PASS WITH ASSUMPTIONS | Strong testnet behavior and working protocol flows exist; invariant registry and baseline suite artifacts now exist | Certification-grade invariant/fuzz artifact pack is still incomplete and current coverage is materially below target | Expand invariant/fuzz suite and re-run coverage to target thresholds |
| Economic warfare certification | BLOCKED | Economic risk model is defined in framework and preliminary scenario matrix now exists | No quantified EV outputs, cost curves, or residual-risk signoff yet | Generate full economic simulation report with scenario verdicts |
| Governance immunity certification | BLOCKED | Governance design is documented and smoke-tested on Sepolia | No full capture-cost, threshold, spam, and emergency-power certification pack | Produce governance immunity pack |
| ERC-8004 adapter safety boundary | PASS WITH ASSUMPTIONS | Adapter/core separation model is documented and built into design | Formal conformance plus non-authority proof pack not assembled | Add adapter evidence and selector/conformance outputs |
| Base/L2 resilience | BLOCKED | Timing/censorship/sequencer assumptions are defined in framework | No formal Base fault model artifact or explicit tolerated timing deltas | Produce Base/L2 resilience report |
| Deployment hardening | PASS | Clean GCP recovery completed, old compromised ARES projects deleted, hardened prod runtime in place | Ongoing maintenance only | Keep deploy reports and runtime checks current |
| Security operations and monitoring | PASS WITH ASSUMPTIONS | Monitoring baseline, PM2 log rotation, abuse alerts, and hardened runtime are in place | Verified notification channel evidence and sustained operations review still needed | Capture alert verification proof and ops review snapshot |
| Data plane integrity | PASS WITH ASSUMPTIONS | Landing/docs/API/explorer are live; deterministic fallback protects demo surfaces | Canonical production data separation and subgraph consistency proof for mainnet not finalized | Produce mainnet data-plane integrity artifact |
| External security audit | BLOCKED | Framework and internal gating standard now exist | Independent audit and remediation closure not complete | Select auditor, freeze scope, run audit |
| Final signoff package | BLOCKED | Launch framework exists | Signer, security, ops, governance, and launch approver signoff package does not yet exist | Build final signoff record after blockers close |

---

## Current ARES Summary by Domain

### Domains currently strongest
- architecture separation
- testnet governance handoff proof
- production recovery and hardened runtime
- public surface stability

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
3. Invariant/fuzz/coverage evidence generation

### Priority 2
1. Economic warfare scenario pack
2. Governance immunity pack
3. Base/L2 resilience report

### Priority 3
1. Alert verification proof
2. Final signoff package assembly
3. Certification directory expansion with generated artifacts

---

## Mainnet Readiness Interpretation
Current classification:
- infrastructure readiness: strong
- protocol certification readiness: intermediate
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
