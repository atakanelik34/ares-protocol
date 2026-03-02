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
| Governance authority model | PASS WITH ASSUMPTIONS | Sepolia Governor + Timelock deployed; handoff and revocation proofs exist; local Governor lifecycle executes in test harness; governed-target tests now prove queue and timelock-delay bypass resistance; authority-surface invariants cover token/api bounded mutations; signer/key-management baseline, authority-closure readiness draft, and executable authority-freeze workflow now exist | Frozen signer identities, final Safe address, and launch approver signoff not yet produced; capture resistance not yet certified | Fill the authority-freeze bundle with real signer data and convert it into a signed launch package |
| Token mint finality | PASS WITH ASSUMPTIONS | Token architecture direction exists; local tests prove revocation alone is unsafe and that the full mint -> revoke minter -> renounce admin ceremony is one-way; launch-day token finality template pack, rehearsal-readiness draft, and executable rehearsal workflow now exist | Mainnet launch artifact set and exact transaction proofs do not yet exist | Run a filled rehearsal bundle against the intended authority topology, then execute mainnet ceremony and attach proofs |
| Executable security suite and coverage gate | PASS WITH ASSUMPTIONS | Foundry suite expanded to `82` passing tests across `12` suites; frozen critical subset coverage remains at `98.21%` line / `95.35%` branch with core, authority, scorer-mutation, dispute-backing, timelock-boundary, governance snapshot, mint-finality ceremony, and L2 timing tests in place | Governance-capture executable invariants remain incomplete; residual branch polish remains in narrow areas | Add governance-capture invariants and close residual branch gaps |
| Registry/Ledger/ARI/Dispute correctness | PASS WITH ASSUMPTIONS | Direct suites now cover core lifecycle, constructor/view guardrails, tampered signatures, invalidation, correction, payout branches, quorum-shortfall behavior, adapter entrypoints, governance validation, scorer-authorization mutation, and dispute-aware invariants for invalidation/backing | Certification-grade fuzz pack remains incomplete and randomized settlement completeness invariants remain open | Expand settlement-focused fuzz coverage and governance invariants |
| Economic warfare certification | BLOCKED | Economic risk model is defined in framework; preliminary scenario matrix exists; governance threshold and capture-cost artifacts now quantify quorum concentration and zero-threshold proposal spam | No full EV outputs across dispute/MEV/grief scenarios, no residual-risk signoff, and no launch-accepted governance parameter pack yet | Generate full economic simulation report with scenario verdicts |
| Governance immunity certification | BLOCKED | Governance design is documented, Sepolia smoke exists, local lifecycle path is tested, governed-target tests prove timelock-bound authority routing, snapshot tests prove post-snapshot mint/delegation cannot create quorum for an existing proposal, governance threshold model exists, signer/key-management baseline exists, and a governance residual-risk acceptance draft now captures the conservative target profile | No frozen signer set, no emergency-power boundedness pack, and no signed residual-risk acceptance from launch approvers | Finalize governance immunity pack and obtain approver signoff |
| ERC-8004 adapter safety boundary | PASS WITH ASSUMPTIONS | Identity/reputation selector snapshots, desync boundary tests, owner-feedback guardrails, bridge guardrails, and validation adapter forwarding tests exist | Formal conformance plus some residual branch blind spots are not yet assembled | Add adapter evidence and selector/conformance outputs |
| Base/L2 resilience | PASS WITH ASSUMPTIONS | Timing/censorship/sequencer assumptions are defined in framework; delayed-inclusion and no-inclusion dispute timing harness now exists; a 14-day mainnet dispute window decision and scenario pack are recorded | Fairness is bounded and operationally mitigated, not mathematically eliminated; no real sequencer outage replay or launch signoff yet | Produce final Base fault-model acceptance note and auditor review |
| Deployment hardening | PASS | Clean GCP recovery completed, old compromised ARES projects deleted, hardened prod runtime in place | Ongoing maintenance only | Keep deploy reports and runtime checks current |
| Security operations and monitoring | PASS WITH ASSUMPTIONS | Monitoring baseline, PM2 log rotation, abuse alerts, and hardened runtime are in place | Verified notification channel evidence and sustained operations review still needed | Capture alert verification proof and ops review snapshot |
| Data plane integrity | PASS WITH ASSUMPTIONS | Landing/docs/API/explorer are live; deterministic fallback protects demo surfaces | Canonical production data separation and subgraph consistency proof for mainnet not finalized | Produce mainnet data-plane integrity artifact |
| External security audit | BLOCKED | Framework, internal gating standard, frozen contract scope, deployment inventory, exportable audit bundle, and auditor-facing residual-risk/authority/token-finality readiness drafts now exist | Independent audit and remediation closure not complete | Select auditor, freeze commit, run audit |
| Final signoff package | BLOCKED | Launch framework and certification workspace exist | Signer, security, ops, governance, and launch approver signoff package does not yet exist | Build final signoff record after blockers close |

---

## Current ARES Summary by Domain

### Domains currently strongest
- architecture separation
- testnet governance handoff proof
- production recovery and hardened runtime
- public surface stability
- adapter boundary testing
- dispute settlement completeness and branch-depth expansion
- ledger/signature adversarial coverage
- baseline stateful invariant coverage

### Domains currently not ready for mainnet
- external audit closure
- economic exploit certification
- governance immunity certification
- Base/L2 resilience certification
- final launch signoff package

---

## Immediate Priority Queue

### Priority 1
1. External audit scope freeze and kickoff
2. Final signer freeze bundle with real Safe/signer data and launch approver signoff on governance/authority residual risk
3. Launch-day token finality rehearsal bundle with intended authority topology

### Priority 2
1. Remaining branch-depth tests for Dispute/IdentityAdapter residual blind spots
2. Governance capture pack
3. Base/L2 resilience launch acceptance note
4. Economic warfare EV pack beyond governance

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


## March 1 decision and artifact sync
- Conservative governance profile accepted: `1M threshold / 6% quorum / 48h timelock`.
- Mainnet dispute window target accepted: `14 days`.
- Signer model frozen at `3/5 mixed`.
- Token launch topology frozen at `single-vault genesis mint`.
- External audit prep pack assembled under `docs/audit/`.
- Launch-day token finality template pack assembled under `docs/certification/templates/`.
