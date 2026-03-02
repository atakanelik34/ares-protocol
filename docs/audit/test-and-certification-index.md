# Test and Certification Index

## Contract test suites
- `contracts/test/AresARIEngine.t.sol`
- `contracts/test/AresApiAccess.t.sol`
- `contracts/test/AresAuthorityInvariants.t.sol`
- `contracts/test/AresCoreInvariants.t.sol`
- `contracts/test/AresDispute.t.sol`
- `contracts/test/AresDisputeL2Timing.t.sol`
- `contracts/test/AresDisputeSettlementRandomized.t.sol`
- `contracts/test/AresGovernanceCaptureInvariants.t.sol`
- `contracts/test/AresLedgerAuthorityInvariants.t.sol`
- `contracts/test/AresRegistry.t.sol`
- `contracts/test/AresScorecardLedger.t.sol`
- `contracts/test/AresTokenGovernor.t.sol`
- `contracts/test/ERC8004Adapter.t.sol`
- `contracts/test/ERC8004AdapterResidual.t.sol`
- `contracts/test/ERC8004ValidationAdapter.t.sol`

## Control-plane entrypoints
- `docs/mainnet-certification-framework-v1.md`
- `docs/certification/README.md`
- `docs/certification/execution-matrix.md`
- `docs/certification/evidence-index.md`

## Generated certification baselines
- `docs/certification/generated/invariant-registry.md`
- `docs/certification/generated/security-suite-baseline-2026-03-01.md`
- `docs/certification/generated/governance-capture-invariants-baseline-2026-03-02.md`
- `docs/certification/generated/residual-branch-gap-report-2026-03-02.md`
- `docs/certification/generated/economic-warfare-scenario-matrix.md`
- `docs/certification/generated/economic-warfare-report-2026-03-02.md`
- `docs/certification/generated/economic-warfare-scenarios-2026-03-02.json`
- `docs/certification/generated/governance-immunity-baseline-2026-03-01.md`
- `docs/certification/generated/governance-capture-baseline-2026-03-01.md`
- `docs/certification/generated/governance-capture-cost-model-2026-03-01.md`
- `docs/certification/generated/governance-threshold-model-2026-03-01.json`
- `docs/certification/generated/governance-capture-scenarios-2026-03-01.json`
- `docs/certification/generated/governance-parameter-decision-2026-03-01.md`
- `docs/certification/generated/governance-risk-register-2026-03-02.json`
- `docs/certification/generated/base-l2-resilience-baseline-2026-03-01.md`
- `docs/certification/generated/base-delayed-inclusion-policy-2026-03-01.md`
- `docs/certification/generated/base-no-inclusion-simulation-2026-03-01.md`
- `docs/certification/generated/base-no-inclusion-scenarios-2026-03-01.json`
- `docs/certification/generated/dispute-window-decision-2026-03-01.md`
- `docs/certification/generated/base-l2-acceptance-register-2026-03-02.json`
- `docs/certification/generated/signer-key-management-baseline-2026-03-01.md`
- `docs/certification/generated/token-mint-finality-baseline-2026-03-01.md`
- `docs/certification/generated/token-finality-rehearsal-pack-2026-03-02.md`
- `docs/certification/generated/authority-freeze-pack-2026-03-02.md`
- `docs/certification/generated/authority-freeze-gap-report-2026-03-02.md`
- `docs/certification/generated/monitoring-verification-proof-2026-03-02.md`
- `docs/certification/generated/mainnet-rehearsal-support-pack-2026-03-02.md`
- `docs/certification/generated/launch-day-support-pack-2026-03-02.md`

## Authority / signer workflows
- `docs/certification/authority/`
- `docs/certification/authority/freeze/`
- `scripts/certification/init-authority-freeze-pack.mjs`
- `scripts/certification/validate-authority-freeze-pack.mjs`

## Token finality / launch workflows
- `docs/certification/templates/`
- `docs/certification/rehearsal/`
- `scripts/certification/init-token-finality-rehearsal.mjs`
- `scripts/certification/validate-token-finality-pack.mjs`
- `docs/rehearsal/mainnet/`
- `scripts/certification/validate-mainnet-rehearsal-pack.mjs`
- `docs/launch/`

## Auditor handoff and readiness docs
- `docs/audit/README.md`
- `docs/audit/auditor-kickoff-summary.md`
- `docs/audit/auditor-request-checklist.md`
- `docs/audit/governance-residual-risk-acceptance.md`
- `docs/audit/governance-approver-signoff.template.md`
- `docs/audit/authority-closure-readiness.md`
- `docs/audit/token-finality-rehearsal-readiness.md`
- `docs/audit/base-l2-launch-acceptance.md`
- `docs/audit/backup-restore-drill.template.md`
- `docs/audit/incident-severity-signoff.md`
- `docs/audit/open-questions-for-auditor.md`
- `docs/audit/remediation/`
