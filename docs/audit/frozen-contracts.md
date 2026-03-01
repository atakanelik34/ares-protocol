# Frozen Contracts

## Primary launch-critical audit scope
- `contracts/core/AresRegistry.sol`
- `contracts/core/AresScorecardLedger.sol`
- `contracts/core/AresARIEngine.sol`
- `contracts/core/AresDispute.sol`
- `contracts/core/AresApiAccess.sol`
- `contracts/token/AresToken.sol`
- `contracts/token/AresGovernor.sol`
- `contracts/erc8004-adapters/ERC8004IdentityAdapter.sol`
- `contracts/erc8004-adapters/ERC8004ReputationAdapter.sol`
- `contracts/erc8004-adapters/ERC8004ValidationAdapter.sol`

## Important review notes
- `AresGovernor` is now parameterized for mainnet deployment and must be reviewed as a configurable launch surface.
- `AresDispute` mainnet target profile uses a 14-day voting period to mitigate Base delayed/no-inclusion fairness risk.
- `AresToken` launch topology assumes single-vault genesis mint plus irreversible authority closure.

## Supplemental but non-primary scope
- `contracts/script/DeployAres.s.sol`
- `contracts/script/DeployGovernance.s.sol`
- `contracts/script/HandoffGovernance.s.sol`
- files under `deploy/contracts/`
