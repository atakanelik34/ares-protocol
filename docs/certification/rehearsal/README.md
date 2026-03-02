# Token Finality Rehearsal Pack

Status date: March 2, 2026  
Purpose: convert launch-day token finality from static templates into a repeatable rehearsal workflow

## Scope
This directory defines how ARES prepares, generates, checks, and reviews the token finality artifact set before mainnet launch day.

Canonical launch model:
1. deploy `AresToken`
2. deploy distribution vault
3. mint full supply once to the vault
4. revoke `MINTER_ROLE`
5. renounce `DEFAULT_ADMIN_ROLE`
6. capture post-ceremony role graph
7. attach launch signoff artifacts

## What this pack adds beyond templates
Templates already existed under `docs/certification/templates/`.

This rehearsal pack adds:
- a runbook for the rehearsal sequence
- a preflight checklist
- a script that materializes a timestamped rehearsal bundle
- a validator that checks bundle completeness in draft and strict mode

## Commands
Generate a rehearsal bundle:

```bash
node scripts/certification/init-token-finality-rehearsal.mjs
```

Validate a draft rehearsal bundle (placeholders allowed, structure enforced):

```bash
node scripts/certification/validate-token-finality-pack.mjs <bundle-path> --draft
```

Validate a launch-ready bundle (placeholders forbidden):

```bash
node scripts/certification/validate-token-finality-pack.mjs <bundle-path>
```

## Expected bundle contents
- `01-token-launch-parameters.json`
- `02-authority-registry.json`
- `03-token-finality-report.md`
- `03-token-finality-report.json`
- `04-launch-signoff.md`
- `manifest.json`
- `README.md`

## Acceptance
The rehearsal pack is considered usable when:
- a bundle can be generated without manual file hunting
- draft validation passes on a generated bundle
- strict validation fails if placeholders remain
- the same pack can be filled on launch day with actual tx hashes and authority addresses
