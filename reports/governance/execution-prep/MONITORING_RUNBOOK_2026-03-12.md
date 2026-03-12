# Governance Monitoring Runbook (Phase 1)

- Date: 2026-03-12
- Cadence: every 6 hours until queue windows open

## Command

```bash
/usr/local/bin/node scripts/governance/monitor-preflight.mjs --proposal=all --cadence-hours=6
```

Outputs:
- `reports/governance/execution-prep/monitoring/preflight-<timestamp>.json`
- `reports/governance/execution-prep/monitoring/preflight-<timestamp>.md`
- rolling latest:
  - `reports/governance/execution-prep/monitoring/latest-preflight.json`
  - `reports/governance/execution-prep/monitoring/latest-preflight.md`

## Gate Rules

- Queue is allowed only when proposal state is `Succeeded (4)`.
- Execute is allowed only when proposal state is `Queued (5)` and timelock ETA is reached.

## Contingency

- If any proposal state is `Defeated (3)` or `Canceled (2)`:
  1. Stop queue/execute runbook.
  2. Mark blocker board row as `FAILED GOVERNANCE ATTEMPT`.
  3. Prepare replacement governance proposal plan with updated tx/evidence IDs.

## Current Snapshot Reference

- `reports/governance/execution-prep/monitoring/latest-preflight.json`
- Last known result (2026-03-12): both proposals are `Active (1)`.
