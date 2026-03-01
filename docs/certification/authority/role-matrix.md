# ARES Role Matrix

Status date: March 1, 2026

| Surface | Role / Authority | Current Sepolia Posture | Mainnet Target |
|---|---|---|---|
| TimelockController | proposer | Governor | Governor |
| TimelockController | canceller | Governor | Governor |
| TimelockController | admin | timelock graph / revoke-checked | no deployer residual admin |
| AresRegistry | DEFAULT_ADMIN_ROLE | Timelock on governed posture | Timelock |
| AresRegistry | GOVERNANCE_ROLE | Timelock on governed posture | Timelock |
| AresARIEngine | DEFAULT_ADMIN_ROLE | Timelock on governed posture | Timelock |
| AresARIEngine | GOVERNANCE_ROLE | Timelock on governed posture | Timelock |
| AresScorecardLedger | DEFAULT_ADMIN_ROLE | Timelock on governed posture | Timelock |
| AresScorecardLedger | GOVERNANCE_ROLE | Timelock on governed posture | Timelock |
| AresDispute | DEFAULT_ADMIN_ROLE | Timelock on governed posture | Timelock |
| AresDispute | GOVERNANCE_ROLE | Timelock on governed posture | Timelock |
| AresApiAccess | DEFAULT_ADMIN_ROLE | Timelock on governed posture | Timelock |
| Adapters | DEFAULT_ADMIN_ROLE / GOVERNANCE_ROLE | Timelock-governed | Timelock |
| AresToken | MINTER_ROLE | exists pre-launch | revoked in finality ceremony |
| AresToken | DEFAULT_ADMIN_ROLE | exists pre-launch | renounced in finality ceremony |
| Safe 3/5 | launch coordination | not canonical protocol authority | limited to treasury/ops/ceremony approvals |
