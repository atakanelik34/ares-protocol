# ARES External Audit Preparation Pack

This directory is the auditor-facing entrypoint for ARES Protocol mainnet-prep review.

It provides:
- frozen launch-critical contract scope
- current Sepolia deployment inventory
- authority and role narrative
- known risks and assumptions
- links into the certification evidence workspace
- explicit open questions for the auditor

This pack is decision-complete for audit kickoff. It is not a claim that ARES is certified for mainnet.

## Auditor quickstart
Recommended review order:
1. `scope.md`
2. `frozen-contracts.md`
3. `deployment-inventory.md`
4. `role-matrix.md`
5. `known-risks-and-assumptions.md`
6. `test-and-certification-index.md`
7. `open-questions-for-auditor.md`

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
- authority and token-finality templates
- machine-readable bundle manifest with checksums

## Directory contents
- `scope.md`: audit objectives, exclusions, and review expectations.
- `frozen-contracts.md`: canonical frozen contract set for primary review.
- `deployment-inventory.md`: current deployed Base Sepolia addresses and governance state.
- `role-matrix.md`: authority ownership and intended mainnet control graph.
- `known-risks-and-assumptions.md`: residual risks, accepted assumptions, and blockers.
- `test-and-certification-index.md`: map of automated tests and certification artifacts.
- `artifact-manifest.json`: machine-readable manifest of audit pack contents.
- `open-questions-for-auditor.md`: explicit questions where external review is expected to add value.

## Current status
- Testnet-live on Base Sepolia.
- Clean production runtime recovered after GCP compromise event.
- Launch-critical frozen coverage gate passing on the frozen subset.
- Mainnet remains blocked pending external audit, launch authority closure, token finality execution, and residual-risk acceptance.
