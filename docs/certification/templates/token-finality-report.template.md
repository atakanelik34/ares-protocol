# Token Finality Report Template

## Launch summary
- Network:
- Token address:
- Distribution vault address:
- Total supply:
- Mint topology: single-vault

## Ceremony sequence
1. Token deployed.
2. Distribution vault deployed.
3. Full supply minted to distribution vault.
4. `MINTER_ROLE` revoked.
5. `DEFAULT_ADMIN_ROLE` renounced.
6. Post-ceremony role graph verified.
7. Launch approvers signed off.

## Required transaction hashes
- Token deployment tx:
- Distribution vault deployment tx:
- Mint tx:
- `MINTER_ROLE` revoke tx:
- `DEFAULT_ADMIN_ROLE` renounce tx:

## Post-ceremony authority graph
- Governor:
- Timelock:
- Treasury:
- Distribution vault:
- Remaining privileged EOAs:

## Verification checklist
- [ ] Full supply minted exactly once
- [ ] Mint target was single distribution vault
- [ ] `MINTER_ROLE` revoked
- [ ] `DEFAULT_ADMIN_ROLE` renounced
- [ ] Final role graph captured
- [ ] Explorer verification complete
- [ ] Launch signoff attached
