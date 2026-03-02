# Authority Freeze Pack

Status date: March 2, 2026  
Purpose: convert signer freeze and authority closure from planning docs into a repeatable launch bundle

## Scope
This pack defines the minimum artifact set required to freeze ARES mainnet signer identities, Safe ownership, authority routing, and launch approver acknowledgements.

The pack is not complete when topology is only described in prose.
It is complete when the bundle contains the actual signer seats, Safe address, hardware posture acknowledgements, and launch approvals.

## Bundle workflow
Generate a draft bundle:

```bash
node scripts/certification/init-authority-freeze-pack.mjs
```

Validate in draft mode:

```bash
node scripts/certification/validate-authority-freeze-pack.mjs <bundle-path> --draft
```

Validate in strict mode:

```bash
node scripts/certification/validate-authority-freeze-pack.mjs <bundle-path>
```

## Expected bundle contents
- `01-authority-freeze-record.json`
- `02-launch-authority-registry.json`
- `03-signer-attestation.md`
- `04-launch-committee-approval.md`
- `manifest.json`
- `README.md`

## Acceptance
The authority freeze pack is considered usable when:
- a timestamped bundle is generated automatically
- draft validation passes with placeholders
- strict validation fails while placeholders remain
- the same structure can be completed with live signer identities and Safe details before mainnet signoff
