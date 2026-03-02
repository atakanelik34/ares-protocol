# ARES Certification Execution Matrix

Status date: March 2, 2026  
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
| Governance authority model | PASS WITH ASSUMPTIONS | Sepolia Governor + Timelock deployed; handoff and revocation proofs exist; local Governor lifecycle executes in test harness; governed-target tests prove queue and timelock-delay bypass resistance; authority-surface invariants cover token/API bounded mutations; signer/key-management baseline, authority package, and executable authority-freeze workflow now exist | Frozen signer identities, final Safe address, and launch approver signoff not yet produced | Fill the authority-freeze bundle with real signer data and convert it into a signed launch package |
| Token mint finality | PASS WITH ASSUMPTIONS | Token architecture direction exists; local tests prove revocation alone is unsafe and that the full mint -> revoke minter -> renounce admin ceremony is one-way; launch-day token finality template pack and executable rehearsal workflow now exist | Mainnet launch artifact set and exact transaction proofs do not yet exist | Run a filled rehearsal bundle against the intended authority topology, then execute mainnet ceremony and attach proofs |
| Executable security suite and coverage gate | PASS WITH ASSUMPTIONS | Foundry suite currently passes with `88` tests across `15` suites and `14` invariant-oriented checks; frozen critical subset coverage gate was last measured at `98.21%` line / `95.35%` branch / `98.13%` func and remains the controlling baseline | One fresh post-expansion coverage snapshot is still pending; residual blind spots are narrow and named | Preserve gate, refresh coverage snapshot, and keep residual gaps explicit |
| Registry/Ledger/ARI/Dispute correctness | PASS WITH ASSUMPTIONS | Direct suites now cover core lifecycle, constructor/view guardrails, tampered signatures, invalidation, correction, payout branches, quorum-shortfall behavior, adapter entrypoints, governance validation, scorer-authorization mutation, L2 timing, dispute-aware invariants, randomized settlement, and authority mutation | Certification-grade fuzz depth can still be improved, but correctness is no longer blocked by missing baseline tests | Maintain regression depth and capture any audit-driven gaps |
| Economic warfare certification | PASS WITH ASSUMPTIONS | Quantified economic report and machine-readable scenario set now exist; governance capture remains explicitly isolated as the dominant residual blocker; dispute spam, rounding, Sybil, finalize edge, timing edge, and MEV reorder scenarios are named with EV reads | Governance capture is still blocked pending final signer freeze, launch distribution acceptance, and audit review | Carry quantified scenario pack into audit and close governance residual-risk signoff |
| Governance immunity certification | BLOCKED | Governance design, local lifecycle, snapshot anti-retroactivity tests, threshold model, capture-cost model, governance risk register, and residual-risk acceptance draft now exist | Final signer set, Safe details, real authority graph, and signed residual-risk acceptance are still missing | Freeze signer set, fill authority bundle, obtain launch approver signoff |
| ERC-8004 adapter safety boundary | PASS WITH ASSUMPTIONS | Identity/reputation selector snapshots, desync boundary tests, owner-feedback guardrails, bridge guardrails, randomized residual suite, and validation adapter forwarding tests exist | A few narrow adapter completeness blind spots remain for audit review | Keep residual gap report linked and preserve branch coverage |
| Base/L2 resilience | PASS WITH ASSUMPTIONS | Timing/censorship/sequencer assumptions are defined in framework; delayed-inclusion and no-inclusion timing harness exists; 14-day dispute window decision exists; Base launch acceptance note and machine-readable acceptance register now exist | Launch signoff on sequencer assumptions is still pending; fairness is bounded and operationally mitigated, not eliminated | Carry Base/L2 launch acceptance pack into audit and launch committee review |
| Deployment hardening | PASS | Clean GCP recovery completed, old compromised ARES projects deleted, hardened prod runtime in place | Ongoing maintenance only | Keep deploy reports and runtime checks current |
| Security operations and monitoring | PASS WITH ASSUMPTIONS | Monitoring baseline, PM2 log rotation, abuse alerts, and hardened runtime are in place; monitoring verification proof artifact path now exists | Verified notification-channel proof and sustained ops review still needed | Attach verified notification proof and run backup/restore drill |
| Data plane integrity | PASS WITH ASSUMPTIONS | Landing/docs/API/explorer are live; deterministic fallback protects demo surfaces | Canonical production data separation and subgraph consistency proof for mainnet are not finalized | Produce mainnet data-plane integrity artifact if audit requests it |
| Mainnet rehearsal support | PASS WITH ASSUMPTIONS | Rehearsal runbook, deployment manifest template, verification checklist, rollback checklist, and validator now exist | No real rehearsal output bundle yet | Run rehearsal when signer and launch topology freeze |
| Audit remediation readiness | PASS | Remediation workflow, finding log, finding response, and regression evidence templates now exist | No live findings yet | Use workflow as soon as audit starts |
| Launch-day execution support | PASS WITH ASSUMPTIONS | Launch-day checklist, address registry template, smoke checks, and communications pack now exist | Real mainnet addresses, audit closeout, and signoff attachments still absent | Fill pack during launch execution |
| External security audit | BLOCKED | Framework, internal gating standard, frozen contract scope, deterministic exportable audit bundle, and auditor-facing kickoff docs now exist | Independent audit and remediation closure not complete | Select auditor, freeze commit, export bundle, run audit |
| Final signoff package | BLOCKED | Launch framework, authority freeze workflow, token finality workflow, rehearsal pack, and launch support pack exist | Signer, security, ops, governance, audit, and launch approver signoff package does not yet exist | Build final signoff record after blockers close |

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
- authority freeze and token-finality rehearsal workflows
- audit kickoff packaging

### Domains currently not ready for mainnet
- external audit closure
- governance immunity signoff
- final signer freeze with real identities
- launch-day token finality execution proof set
- final launch signoff package

---

## Immediate Priority Queue

### Priority 1
1. External audit scope freeze and kickoff
2. Final signer freeze bundle with real Safe/signer data and launch approver signoff on governance/authority residual risk
3. Launch-day token finality rehearsal bundle with intended authority topology

### Priority 2
1. Verified monitoring notification proof and backup/restore drill record
2. Mainnet rehearsal output bundle
3. Final signoff package assembly

### Priority 3
1. Audit remediation execution
2. Mainnet address registry and launch-day artifact capture
3. Post-launch smoke and communications synchronization

---

## Mainnet Readiness Interpretation
Current classification:
- infrastructure readiness: strong
- protocol certification readiness: strong internal baseline, external review pending
- mainnet verdict: `BLOCKED`

This is no longer a code-completeness problem.  
It is now primarily an audit, authority, and execution-proof problem.

---

## Update Rule
Every time a blocker changes state, this matrix must be updated with:
- new verdict
- new evidence reference
- closed gap note
- next downstream dependency
