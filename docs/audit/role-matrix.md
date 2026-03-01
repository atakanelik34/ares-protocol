# Audit Role Matrix

## Canonical authority model
- Protocol governance authority: Governor + Timelock
- Canonical protocol state: core contracts only
- Adapters: never canonical authority
- Explorer/API/Subgraph: derived only

## Intended mainnet authority graph
- `Governor`: proposal creation and vote lifecycle
- `TimelockController`: executor and admin boundary for governed contracts
- `3/5 Safe`: launch coordination, treasury/ops controls where explicitly assigned, never hidden protocol bypass admin
- deployer EOAs: no launch-critical authority after final handoff

## Open executor policy
- Timelock executor remains open unless auditor requires change.
- Open execution must not create an admin bypass path.

## Launch critical rule
No single EOA may unilaterally:
- mint
- upgrade
- slash
- bypass timelock
- change governance-critical parameters
