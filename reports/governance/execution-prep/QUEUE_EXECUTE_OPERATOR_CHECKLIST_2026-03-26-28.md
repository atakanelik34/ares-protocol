# ARES Governance Queue/Execute Operator Checklist (Base Sepolia)

- Scope: B-01/B-02 + B-03 governance lifecycle
- Network: Base Sepolia (`84532`)
- Governor: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`
- Timelock: `0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E`
- Proposal IDs:
  - B-01/B-02: `58654035350196392900949207696152763655652189042590194943354964272374651090926`
  - B-03: `102745141475066169865705909421050107559936801418546675182434592432068222986157`

## 1. Queue Day Pre-flight (2026-03-26)

### 1.1 Environment and chain sanity

```bash
cd /Users/busecimen/Downloads/AresProtocol
set -a && source .env && set +a
cast chain-id --rpc-url "$BASE_SEPOLIA_RPC_URL"
cast block-number --rpc-url "$BASE_SEPOLIA_RPC_URL"
```

Expected:
- `chain-id = 84532`
- block number returns without error

### 1.2 Governance preflight (must pass state gates)

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all
```

Expected output requirements:
- B-01/B-02: `state: 4 (Succeeded)`
- B-03: `state: 4 (Succeeded)`
- `queueWindowOpen: YES` for both proposals
- No payload mismatch errors

Go/No-Go decision gate:
- `GO` only if both proposals are `Succeeded (4)`.
- `NO-GO` if any proposal is not `Succeeded (4)`.

### 1.3 Save preflight evidence before queue

```bash
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
mkdir -p reports/governance/execution-prep/evidence
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all \
  > "reports/governance/execution-prep/evidence/${TS}-preflight-before-queue.log" 2>&1 || true
```

## 2. Queue Steps (2026-03-26)

### 2.1 Queue B-01/B-02

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/queue-proposals.mjs --proposal=b01b02 --broadcast
```

Expected output:
- Contains `state: 4 (Succeeded)` preflight section
- Contains `queued tx=0x... block=...`
- Process exits `0`

### 2.2 Queue B-03

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/queue-proposals.mjs --proposal=b03 --broadcast
```

Expected output:
- Contains `state: 4 (Succeeded)` preflight section
- Contains `queued tx=0x... block=...`
- Process exits `0`

### 2.3 Post-queue verification

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all
```

Expected output requirements:
- B-01/B-02: `state: 5 (Queued)`
- B-03: `state: 5 (Queued)`
- `queuedEtaUtc` is populated for both
- `executeWindowOpen: NO` until timelock ETA

### 2.4 Archive queue evidence

```bash
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
mkdir -p reports/governance/execution-prep/evidence
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all \
  > "reports/governance/execution-prep/evidence/${TS}-preflight-after-queue.log" 2>&1 || true
```

Then fill queue template:
- `/Users/busecimen/Downloads/AresProtocol/reports/governance/execution-prep/QUEUE_EXECUTION_EVIDENCE_2026-03-26.md`

## 3. Execute Day Pre-flight (2026-03-28)

### 3.1 Environment and chain sanity

```bash
cd /Users/busecimen/Downloads/AresProtocol
set -a && source .env && set +a
cast chain-id --rpc-url "$BASE_SEPOLIA_RPC_URL"
cast block-number --rpc-url "$BASE_SEPOLIA_RPC_URL"
```

Expected:
- `chain-id = 84532`
- block number returns without error

### 3.2 Execute preflight (must pass)

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all
```

Expected output requirements:
- B-01/B-02: `state: 5 (Queued)`
- B-03: `state: 5 (Queued)`
- `executeWindowOpen: YES` for both proposals

Go/No-Go decision gate:
- `GO` only if both proposals are `Queued (5)` and execute window is open.
- `NO-GO` otherwise.

### 3.3 Save preflight evidence before execute

```bash
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
mkdir -p reports/governance/execution-prep/evidence
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all \
  > "reports/governance/execution-prep/evidence/${TS}-preflight-before-execute.log" 2>&1 || true
```

## 4. Execute Steps (2026-03-28)

### 4.1 Execute B-01/B-02

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/execute-proposals.mjs --proposal=b01b02 --broadcast
```

Expected output:
- Contains `state: 5 (Queued)` preflight section
- Contains `executed tx=0x... block=...`
- Process exits `0`

### 4.2 Execute B-03

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/execute-proposals.mjs --proposal=b03 --broadcast
```

Expected output:
- Contains `state: 5 (Queued)` preflight section
- Contains `executed tx=0x... block=...`
- Process exits `0`

### 4.3 Post-execute preflight

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all
```

Expected output requirements:
- B-01/B-02: `state: 7 (Executed)`
- B-03: `state: 7 (Executed)`

## 5. Post-Execution Verification

### 5.1 Strict governance verify (must pass)

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node deploy/contracts/verify-governance-state.mjs --strict --profile=conservative
```

Expected passing output requirements:
- Exit code `0`
- Checks include:
  - `Governor: proposalThreshold >= 1000000000000000000000000` => `ok: true`
  - `Governor: quorumNumerator >= 6` => `ok: true`
  - `Timelock: minDelay >= 172800` => `ok: true`

### 5.2 B-03 post topology check (must pass)

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/check-b03-role-topology.mjs --mode=post
```

Expected output requirements:
- `PASS oldDisputeOldAdapterRole expected=false actual=false`
- `PASS ledgerOldDisputeRole expected=false actual=false`
- `PASS ledgerNewDisputeRole expected=true actual=true`
- `PASS ariOldDisputeRole expected=false actual=false`
- `PASS ariNewDisputeRole expected=true actual=true`
- Exit code `0`

## 6. Evidence Archival Commands

```bash
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
mkdir -p reports/governance/execution-prep/evidence

PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all \
  > "reports/governance/execution-prep/evidence/${TS}-preflight-final.log" 2>&1 || true

PATH=/usr/local/bin:$PATH /usr/local/bin/node deploy/contracts/verify-governance-state.mjs --strict --profile=conservative \
  > "reports/governance/execution-prep/evidence/${TS}-verify-governance-state.log" 2>&1 || true

PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/governance/check-b03-role-topology.mjs --mode=post \
  > "reports/governance/execution-prep/evidence/${TS}-b03-topology-post.log" 2>&1 || true
```

Update canonical evidence docs after receipts are known:
- `/Users/busecimen/Downloads/AresProtocol/reports/governance/execution-prep/QUEUE_EXECUTION_EVIDENCE_2026-03-26.md`
- `/Users/busecimen/Downloads/AresProtocol/reports/governance/execution-prep/EXECUTE_EVIDENCE_2026-03-28.md`

## 7. Abort / Rollback Decision Rules

| Condition | Decision | Action |
|---|---|---|
| Preflight state not `Succeeded (4)` on queue day | ABORT | Do not run `--broadcast`; continue monitoring snapshots |
| Preflight state not `Queued (5)` on execute day | ABORT | Do not run `--broadcast`; inspect queue receipts and ETA |
| `executeWindowOpen` is `NO` | ABORT | Wait until ETA is reached and rerun preflight |
| Payload mismatch error from governance scripts | ABORT | Stop immediately; investigate proposal payload integrity |
| Queue/execute tx status not success | ABORT | Do not proceed to next step; archive tx hash and investigate revert reason |
| Post-execute strict verify fails | NO-GO | Keep mainnet status `NO-GO`; do not mark B-01/B-02 closed |
| B-03 post topology check fails | NO-GO | Keep B-03 open; do not mark dispute cutover complete |

Operational rollback note:
- Governance queue/execute actions are timelock-governed state transitions and are not “rolled back” via local scripts.
- If a gate fails, stop progression and open remediation proposal path instead of forcing further transactions.
