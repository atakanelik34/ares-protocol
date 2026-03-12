# Token Finality Report Template

## Launch summary
- Network: base-sepolia
- Token address: 0x89f8748435b048e0f2944376cb793cf193b87af4
- Distribution vault address: 0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E
- Total supply: 875000000000000000000
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
- Token deployment tx: rehearsal-reference-deployment-source-addresses-base-sepolia
- Distribution vault deployment tx: rehearsal-reference-no-separate-vault-on-sepolia
- Mint tx: rehearsal-reference-see-b06-pack-section-3
- `MINTER_ROLE` revoke tx: rehearsal-reference-see-b06-pack-section-3
- `DEFAULT_ADMIN_ROLE` renounce tx: rehearsal-reference-see-b06-pack-section-3

## Post-ceremony authority graph
- Governor: 0x99aA690870a0Df973B97e63b63c2A8375a80188e
- Timelock: 0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E
- Treasury: 0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E
- Distribution vault: 0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E
- Remaining privileged EOAs: none

## Verification checklist
- [ ] Full supply minted exactly once
- [ ] Mint target was single distribution vault
- [ ] `MINTER_ROLE` revoked
- [ ] `DEFAULT_ADMIN_ROLE` renounced
- [ ] Final role graph captured
- [ ] Explorer verification complete
- [ ] Launch signoff attached
