# Token Finality Rehearsal Checklist

## Preflight
- [ ] Templates under `docs/certification/templates/` are current.
- [ ] Authority package under `docs/certification/authority/` reflects intended mainnet topology.
- [ ] Token launch model remains single-vault genesis.
- [ ] Governance launch assumptions remain valid.

## Bundle generation
- [ ] Rehearsal bundle generated.
- [ ] `manifest.json` created.
- [ ] All expected files present.
- [ ] Generated README explains launch-day usage.

## Draft validation
- [ ] Draft validator passes.
- [ ] Required JSON keys are present.
- [ ] Markdown reports contain all required checklist sections.
- [ ] Cross-file references use consistent terminology.

## Launch-day unresolved fields
- [ ] Token address marked as launch-day field.
- [ ] Vault address marked as launch-day field.
- [ ] Mint tx hash marked as launch-day field.
- [ ] `MINTER_ROLE` revoke tx hash marked as launch-day field.
- [ ] `DEFAULT_ADMIN_ROLE` renounce tx hash marked as launch-day field.
- [ ] Final role graph marked as launch-day field.
- [ ] Approver signatures marked as launch-day field.

## Review outcome
- [ ] No ambiguity remains about who fills each field.
- [ ] No ambiguity remains about artifact order.
- [ ] Bundle can be reused for mainnet without structural edits.
