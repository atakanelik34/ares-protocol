# ARES External Audit Preparation Pack

Status date: March 5, 2026  
Audit phase: round-1 completed, closure evidence in progress

This directory is the auditor-facing entrypoint for ARES Protocol mainnet-prep review.

It provides:
- frozen launch-critical contract scope
- current Sepolia deployment inventory
- authority and role narrative
- known risks and assumptions
- quantified governance/economic/L2 readiness context
- links into the certification evidence workspace
- explicit open questions for the auditor
- remediation workflow templates for post-kickoff use

This pack is decision-complete for audit kickoff and closure follow-up. It is not a claim that ARES is certified for mainnet.

## Auditor quickstart
Recommended review order:
1. `auditor-kickoff-summary.md`
2. `scope.md`
3. `frozen-contracts.md`
4. `deployment-inventory.md`
5. `role-matrix.md`
6. `known-risks-and-assumptions.md`
7. `governance-residual-risk-acceptance.md`
8. `authority-closure-readiness.md`
9. `token-finality-rehearsal-readiness.md`
10. `base-l2-launch-acceptance.md`
11. `test-and-certification-index.md`
12. `open-questions-for-auditor.md`
13. `auditor-request-checklist.md`

## Bundle export
An export script is available to produce a portable audit handoff bundle with copied source files and SHA-256 manifest entries:

```bash
node scripts/certification/export-audit-bundle.mjs
```

Default output:
- `tmp/audit-bundle/ares-audit-bundle-<timestamp>/`

The exported bundle includes:
- this audit pack
- frozen launch-critical contracts
- certification control-plane docs
- generated certification artifacts
- authority and token-finality workflows
- rehearsal and launch-day support docs
- remediation workflow templates
- machine-readable bundle manifest with checksums

## Directory contents
- `auditor-kickoff-summary.md`: one-page kickoff brief.
- `auditor-request-checklist.md`: bundle/freeze/questions checklist for kickoff.
- `scope.md`: audit objectives, exclusions, and review expectations.
- `frozen-contracts.md`: canonical frozen contract set for primary review.
- `deployment-inventory.md`: current deployed Base Sepolia addresses and governance state.
- `role-matrix.md`: authority ownership and intended mainnet control graph.
- `known-risks-and-assumptions.md`: residual risks, accepted assumptions, and blockers.
- `governance-residual-risk-acceptance.md`: accepted governance posture, residual risk, and launch gating implications.
- `governance-approver-signoff.template.md`: launch-approver signoff template for governance residual risk.
- `authority-closure-readiness.md`: mainnet signer/authority freeze requirements before launch signoff.
- `token-finality-rehearsal-readiness.md`: launch-day mint finality rehearsal scope and required evidence.
- `base-l2-launch-acceptance.md`: launch-facing Base/L2 assumptions and fairness boundaries.
- `backup-restore-drill.template.md`: ops recovery drill template.
- `incident-severity-signoff.md`: incident classification and ownership signoff artifact.
- `test-and-certification-index.md`: map of automated tests and certification artifacts.
- `artifact-manifest.json`: machine-readable manifest of audit pack contents.
- `open-questions-for-auditor.md`: explicit questions where external review is expected to add value.
- `remediation/`: finding log, response, and regression-evidence workflow.

## Current status
- Testnet-live on Base Sepolia.
- Clean production runtime recovered after GCP compromise event.
- Launch-critical frozen coverage gate passing on the frozen subset.
- Round-1 external audit completed (`/Users/busecimen/reports/audit_20260305_051253_ares_overall_external.md`).
- Confirmed findings were implemented in branch `codex/security-closure-ext-001-004` (`ebf5d24`, `50f6373`, `c8f7131`).
- Mainnet remains blocked pending closure attestation, launch authority closure, token finality execution, monitoring proof closure, and residual-risk acceptance.
