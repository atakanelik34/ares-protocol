# Buyback + Burn Policy (v2.1)

## Revenue Split Target
Protocol revenue split target:
- `25%` buyback + burn
- `40%` treasury
- `35%` staker reward pool

## Execution Policy
- execution style: TWAP-oriented market operations
- slippage guardrails and pacing constraints
- governance-adjustable burn share bounds

## Burn Share Bounds
- lower bound policy: `5%`
- nominal policy target: `25%`
- upper bound policy: `40%`

## Disclosure Rules
- parameter changes must be governance-visible
- accounting/reporting should be periodic and auditable

## Sprint Boundary
No new buyback execution contract is introduced in this sprint.
This is a policy specification for mainnet-prep implementation.
