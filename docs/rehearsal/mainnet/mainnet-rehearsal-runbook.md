# Mainnet Rehearsal Runbook

Status date: March 2, 2026  
Purpose: decision-complete rehearsal order before live mainnet execution

## Preflight
- freeze commit hash
- confirm launch authority package exists
- confirm token finality rehearsal pack exists
- confirm monitoring green
- confirm rollback owner and communication owner

## Deployment sequence
1. validate env completeness
2. deploy governance surfaces
3. deploy token and vault topology
4. capture deployment manifest
5. verify contracts on explorer
6. record role graph snapshot

## Verification sequence
1. validate deployment manifest
2. validate role matrix parity
3. confirm token finality ceremony inputs
4. confirm smoke checks across docs/API/explorer update plan

## Rollback trigger
Rollback rehearsal should be considered if:
- constructor parameter mismatch is detected
- authority graph diverges from expected topology
- verification fails on launch-critical contracts
- manifest cannot be completed deterministically
