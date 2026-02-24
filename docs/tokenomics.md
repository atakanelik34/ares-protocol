# Tokenomics Notes

## $ARES utility
- Stake to register agents
- Dispute participation and slashing economy
- Governance voting
- Optional paid API access (ARES extension)

## Supply policy
- Local/demo mode may start with `initialSupply = 0` and scripted minting.
- Mainnet/TGE supply, vesting, and allocation are finalized post-audit + governance.
- Distribution percentages are not hardcoded in core contracts.

## Governance integration
- Token uses `ERC20Votes` for on-chain governance.
- Governor + Timelock manage protocol parameter changes.

## API utility clarification
Paid API access is an ARES extension (`AresApiAccess`) and is not an ERC-8004 requirement.
