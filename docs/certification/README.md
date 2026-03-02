# ARES Certification Workspace

Status: Active working set  
Scope: Mainnet certification execution  
Canonical framework: `docs/mainnet-certification-framework-v1.md`

## Purpose
This directory turns the ARES Mainnet Certification Framework into an executable certification workspace.

The framework defines the policy.  
This directory defines the working control surface:
- what must be proven
- what evidence already exists
- what is still blocked
- what must be produced before mainnet signoff

Rationale: a certification standard becomes operational only when evidence, status, and blockers are tracked in one place.

---

## Files in This Directory
- `README.md`: operating guide for the certification workspace
- `execution-matrix.md`: current workstream-by-workstream status and next actions
- `evidence-index.md`: artifact inventory, evidence purpose, and missing evidence list

Supporting directories:
- `generated/`: produced certification baselines, decision records, and quantified reports
- `authority/`: signer topology, role graph, and authority playbooks
- `authority/freeze/`: executable signer-freeze and authority-closure bundle workflow
- `templates/`: launch-day and token-finality template pack
- `rehearsal/`: executable runbooks and checklists for token finality and mainnet rehearsal
- `../audit/`: external auditor kickoff pack
- `../launch/`: launch-day operator support pack

---

## How to Use This Workspace
Mainnet certification should be executed in this order:

1. Read the framework in `docs/mainnet-certification-framework-v1.md`.
2. Open `execution-matrix.md` to see current verdicts.
3. Use `evidence-index.md` to locate existing proof artifacts.
4. Produce or update missing evidence.
5. Re-score each workstream.
6. Only issue a final verdict when all critical blockers are closed.

Rule:
No team member should issue a mainnet-ready statement without checking both the execution matrix and the evidence index.

---

## Current ARES Position
ARES is currently in `testnet-live, pre-mainnet certification` stage.

Current high-level position:
- Base Sepolia contracts: live
- governance handoff on testnet: completed
- clean production recovery: completed
- landing/docs/API/explorer: live
- external audit: not complete
- token mint-finality ceremony path: mechanically proven, launch proof still pending
- mainnet certification verdict: blocked

Interpretation:
ARES has crossed the infrastructure proof stage. It has not yet crossed the external-certification and mainnet-authority stage.

---

## Verdict Model
The certification workspace uses the same verdict model as the framework:
- `PASS`
- `PASS WITH ASSUMPTIONS`
- `BLOCKED`

Final launch verdict uses only:
- `CERTIFIED FOR MAINNET DEPLOYMENT`
- `MAINNET BLOCKED`

Rule:
Any `BLOCKED` critical workstream keeps ARES in `MAINNET BLOCKED` state.

---

## Current Blocking Domains
At the time of writing, the main blockers are:

1. External audit completion and remediation closure
2. Governance immunity and governance-capture residual-risk signoff
3. Real signer freeze and live authority registry completion
4. Launch-day token finality execution proof set
5. Monitoring verification proof and final launch signoff package

Rationale: the remaining work is now mostly proof, authority finalization, launch-day execution evidence, and external review rather than product assembly.

---

## Operating Rules
- Update `execution-matrix.md` whenever a launch-relevant workstream changes state.
- Update `evidence-index.md` whenever a new artifact is created, replaced, or deprecated.
- Do not mark a workstream `PASS` unless the evidence exists and is reviewable.
- If a workstream is only true under a narrow condition, mark it `PASS WITH ASSUMPTIONS` and write the assumption explicitly.
- If an artifact is missing, unverifiable, stale, or contradicted by a higher-priority source, the linked workstream must not remain `PASS`.

---

## Relationship to Other ARES Docs
Primary companion documents:
- `docs/mainnet-certification-framework-v1.md`
- `docs/mainnet-go-no-go.md`
- `docs/security-ops.md`
- `docs/governance-handoff.md`
- `docs/token-architecture.md`
- `docs/tokenomics.md`
- `docs/production-deploy-gcp.md`

These remain source documents.  
This certification directory is the control plane that maps those documents into launch readiness.

---

## Key executable workflows
### Token finality rehearsal
1. Generate a bundle:
   - `node scripts/certification/init-token-finality-rehearsal.mjs`
2. Validate draft structure:
   - `node scripts/certification/validate-token-finality-pack.mjs <bundle-path> --draft`
3. Validate launch-day completeness:
   - `node scripts/certification/validate-token-finality-pack.mjs <bundle-path>`

Primary files:
- `rehearsal/token-finality-rehearsal-runbook.md`
- `rehearsal/token-finality-rehearsal-checklist.md`
- `generated/token-finality-rehearsal-pack-2026-03-02.md`

### Authority freeze
1. Generate a bundle:
   - `node scripts/certification/init-authority-freeze-pack.mjs`
2. Validate draft structure:
   - `node scripts/certification/validate-authority-freeze-pack.mjs <bundle-path> --draft`
3. Validate launch-day completeness:
   - `node scripts/certification/validate-authority-freeze-pack.mjs <bundle-path>`

Primary files:
- `authority/freeze/README.md`
- `authority/freeze/authority-freeze-checklist.md`
- `authority/freeze/fill-instructions.md`
- `generated/authority-freeze-pack-2026-03-02.md`
- `generated/authority-freeze-gap-report-2026-03-02.md`

### Mainnet rehearsal support
- `docs/rehearsal/mainnet/README.md`
- `scripts/certification/validate-mainnet-rehearsal-pack.mjs docs/rehearsal/mainnet`

### Audit bundle export
- `node scripts/certification/export-audit-bundle.mjs`

---

## Exit Condition
This workspace has done its job only when:

1. all critical workstreams are `PASS`
2. no critical evidence gap remains
3. final signoff package exists
4. ARES can defensibly move from `MAINNET BLOCKED` to `CERTIFIED FOR MAINNET DEPLOYMENT`

Until then, this directory should be treated as an active launch gate, not archival documentation.
