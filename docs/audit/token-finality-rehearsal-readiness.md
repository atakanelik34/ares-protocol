# Token Finality Rehearsal Readiness

Status date: March 2, 2026  
Document class: audit handoff execution-readiness note  
Launch status: template-ready, execution pending

## Canonical launch model
ARES mainnet token launch is planned as a single-vault genesis:
1. deploy `AresToken`
2. deploy distribution vault
3. mint full supply once to the vault
4. revoke `MINTER_ROLE`
5. renounce `DEFAULT_ADMIN_ROLE`
6. capture post-ceremony role graph
7. attach signoff artifacts

## What is already proven
- the one-way mint finality ceremony exists mechanically
- revoking `MINTER_ROLE` alone is insufficient
- revoking minter and then renouncing admin closes the mint path in the tested model

## What the rehearsal must produce
1. token launch parameters file
2. token finality report
3. authority registry
4. launch signoff sheet
5. exact tx-hash checklist for mint, revoke, renounce, and post-ceremony verification

Executable workflow:
- generate bundle: `node scripts/certification/init-token-finality-rehearsal.mjs`
- draft validation: `node scripts/certification/validate-token-finality-pack.mjs <bundle-path> --draft`
- strict launch validation: `node scripts/certification/validate-token-finality-pack.mjs <bundle-path>`

## Auditor expectation
The auditor should review:
- whether the single-vault genesis topology is sufficient
- whether the finality ceremony leaves any practical reactivation path
- whether any stricter separation between treasury, vault, and governance authority is needed

## Mainnet signoff condition
Token finality remains unresolved until launch day artifacts include:
- token address
- vault address
- minted total supply
- mint tx hash
- `MINTER_ROLE` revoke tx hash
- `DEFAULT_ADMIN_ROLE` renounce tx hash
- final post-ceremony role graph
