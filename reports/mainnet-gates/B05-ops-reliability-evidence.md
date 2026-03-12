# B-05 Ops Reliability Evidence (March 12, 2026)

## Scope
This pack records execution evidence for:
1. Backup/restore drill for `api/query-gateway/data/`
2. Incident simulation on `ares-api` (PM2 stop/restart + health recovery)
3. Query-gateway test suite run

## Summary

| Task | Result | Evidence |
|---|---|---|
| Backup/restore drill | **PASS** | `reports/mainnet-gates/artifacts/b05/backup-restore-drill.log` |
| Incident simulation (`ares-api`) | **PASS** | `reports/mainnet-gates/artifacts/b05/incident-simulation.log` |
| Query-gateway test suite | **PASS** | `reports/mainnet-gates/artifacts/b05/test-suite.log` |

## 1) Backup/Restore Drill

### Method
- Script: `scripts/ops/backup-restore-drill.sh`
- Source: `api/query-gateway/data/`
- Backup destination: `reports/mainnet-gates/artifacts/b05/backup/20260312T115933Z/`
- Restore simulation destination: `reports/mainnet-gates/artifacts/b05/restore-20260312T115933Z/data/`
- Verification:
  - `diff -qr` source vs backup
  - checksum comparison source vs backup
  - `diff -qr` backup vs restored copy
  - query-gateway tests executed against restored DB path

### Result
- Source vs backup `diff`: no differences (empty diff file, PASS)
  - `reports/mainnet-gates/artifacts/b05/backup-verify/diff-data-vs-backup-20260312T115933Z.txt`
- Backup vs restore `diff`: no differences (empty diff file, PASS)
  - `reports/mainnet-gates/artifacts/b05/backup-verify/diff-backup-vs-restore-20260312T115933Z.txt`
- Checksum diff: no differences (empty diff file, PASS)
  - `reports/mainnet-gates/artifacts/b05/backup-verify/checksum-diff-20260312T115933Z.txt`

### Checksum Output (captured)
- Source: `reports/mainnet-gates/artifacts/b05/backup-verify/checksum-data-20260312T115933Z.txt`
- Backup: `reports/mainnet-gates/artifacts/b05/backup-verify/checksum-backup-20260312T115933Z.txt`

Values:
```text
ba6ba0c9055247c483010e81fa011b3cb55e6b1f4100274239944706bdd66380  ./ares.db
020aec324459dbcc233a5987fd5a15a1dbe2a1882d8e764cd54db9294b502c97  ./demo-state.json
```

### Test-against-restore
- Log: `reports/mainnet-gates/artifacts/b05/backup-restore-test-20260312T115933Z.log`
- Result: PASS (`38 pass / 0 fail`)

## 2) Incident Simulation (`ares-api`)

### Method
- Script: `scripts/ops/incident-simulation.sh`
- Process target: `ares-api`
- Action flow:
  1. Record start time
  2. `pm2 stop ares-api` (via `npx pm2` fallback)
  3. Wait 5 seconds
  4. `pm2 restart ares-api`
  5. Poll health until 200 or timeout (`/health`, fallback `/v1/health`)

### Result
- Start time: `2026-03-12T12:00:50Z`
- Recovery detected: `2026-03-12T12:00:59Z`
- Recovery endpoint: `http://127.0.0.1:3001/v1/health`
- **MTTR:** `9 seconds`
- Full log: `reports/mainnet-gates/artifacts/b05/incident-simulation.log`

## 3) Query-Gateway Test Suite

### Command
```bash
npm run test --workspace=api/query-gateway
```

### Result
- Tests: `38`
- Pass: `38`
- Fail: `0`
- Duration: `15858.085708 ms`
- Log: `reports/mainnet-gates/artifacts/b05/test-suite.log`

## Runbook Signoff Checklist (Manual, deploy/rollback/backup)

Reference deploy flow source:
- `deploy/vm/deploy.sh`

### Deploy path (from script)
- [x] `npm ci`
- [x] Generate demo state (`node scripts/demo/generate-local-demo-state.mjs`)
- [x] Build workspaces (`npm run build`)
- [x] Ensure runtime dirs/env defaults (`api/query-gateway/data`, `.env` bootstrap)
- [x] Publish landing (`deploy/vm/publish-landing.sh`)
- [x] PM2 reload (`pm2 startOrReload ... --update-env`, `pm2 save`)
- [x] Post readiness poll (explorer probe loop)

### Rollback checklist (ops procedure)
- [x] Stop/restart process control verified through PM2 on `ares-api`
- [x] Health recovery measurement performed (MTTR captured)
- [ ] Full release rollback-to-previous-artifact rehearsal documented (separate release artifact switchback runbook)

### Backup checklist
- [x] Timestamped backup created
- [x] Byte-level verification (`diff`, checksums)
- [x] Restore simulation performed
- [x] Tests run against restored data path

## Sign-off
- Date: **March 12, 2026**
- B-05 evidence status: **CLOSED (for this evidence pack scope)**
- Notes:
  - Core B-05 drill objectives in this task passed with concrete artifacts.
  - Recommended follow-up before final mainnet signoff: add a full release artifact switchback rehearsal to close the unchecked rollback item above.
