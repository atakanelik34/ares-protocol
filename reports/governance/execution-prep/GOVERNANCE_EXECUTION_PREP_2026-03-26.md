# Governance Execution Prep (Base Sepolia)

- Generated: 2026-03-12T12:34:30Z
- Network: Base Sepolia (84532)
- Governor: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`
- Timelock: `0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E`
- Scope: execution-day preparation only (`queue` / `execute` not sent in this prep pass)

Companion artifacts:
- `reports/governance/execution-prep/BASELINE_FREEZE_2026-03-12.md`
- `reports/governance/execution-prep/MONITORING_RUNBOOK_2026-03-12.md`
- `reports/governance/execution-prep/monitoring/latest-preflight.json`

## 1) Proposal Runtime Snapshot (prep time)

| Proposal | ID | Current state (2026-03-12) | Queue earliest (TRT) | Execute earliest (TRT) |
|---|---:|---|---|---|
| B-01/B-02 | `58654035350196392900949207696152763655652189042590194943354964272374651090926` | `1 (Active)` | `2026-03-26 07:23:22 TRT` | `2026-03-28 07:23:22 TRT` |
| B-03 | `102745141475066169865705909421050107559936801418546675182434592432068222986157` | `1 (Active)` | `2026-03-26 08:46:32 TRT` | `2026-03-28 08:46:32 TRT` |

Reference UTC:
- B-01/B-02 queue: `2026-03-26T04:23:20Z`, execute: `2026-03-28T04:23:20Z`
- B-03 queue: `2026-03-26T05:46:30Z`, execute: `2026-03-28T05:46:30Z`

## 2) Exact Proposal Material

### B-01/B-02

- Proposal ID: `58654035350196392900949207696152763655652189042590194943354964272374651090926`
- Proposal created tx: `0x89714fb818a12135d88d0d52749bf428b18c043bff7908e4f9e5c5f99b171dd0`
- Description:
  - `ARES B-01+B-02 Conservative Params Proposal (2026-03-10T04:23:13.919Z)`
- Description hash:
  - `0x0382e11fcbb0d317393237adf2a0bfe81f2fd5c77244f87e7edbda24b9e9598b`

Targets / values / calldatas:
1. target: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`  
   value: `0`  
   calldata: `0xece40cc100000000000000000000000000000000000000000000d3c21bcecceda1000000`
2. target: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`  
   value: `0`  
   calldata: `0x06f3f9e60000000000000000000000000000000000000000000000000000000000000006`
3. target: `0x66168715B5A760d775a9672255bd49087063613f`  
   value: `0`  
   calldata: `0x2336ed4700000000000000000000000000000000000000000000003635c9adc5dea0000000000000000000000000000000000000000000000000001b1ae4d6e2ef50000000000000000000000000000000000000000000000000000000000000001275000000000000000000000000000000000000000000000000878678326eac90000000000000000000000000000000000000000000000000000000000000000007d0000000000000000000000000b7c54e5fb3bf2ab308f69889081742a1c87d3b5e`

### B-03

- Proposal ID: `102745141475066169865705909421050107559936801418546675182434592432068222986157`
- Proposal created tx: `0xce0afc99a1544a994e326115137cab453369d601acafbd1a1f22d6e4383c1791`
- Description:
  - `ARES B-03 Dispute v2 Cutover Proposal (2026-03-10T05:46:23.680Z)`
- Description hash:
  - `0x8ca8ad00c2d9909561a97b1a4839dcedbb01e1cb05d8f0253a00e02b86db64f2`

Targets / values / calldatas:
1. target: `0xf87343a973f75A2CBa9Fb93616fA8331e5fFf2B1`  
   value: `0`  
   calldata: `0x2f2ff15dc785f0e55c16138ca0f8448186fa6229be092a3a83db3c5d63c9286723c5a2c4000000000000000000000000be8ceddf63626f5a3d817c06dbf8e28d00293214`
2. target: `0xc78E9Bf65Ab6DB5F638Cb4448dc5eBcB7c6e99F3`  
   value: `0`  
   calldata: `0x2f2ff15dc785f0e55c16138ca0f8448186fa6229be092a3a83db3c5d63c9286723c5a2c4000000000000000000000000be8ceddf63626f5a3d817c06dbf8e28d00293214`
3. target: `0x66168715B5A760d775a9672255bd49087063613f`  
   value: `0`  
   calldata: `0x40a5792f0000000000000000000000007af6e906d5108d53abf5f025a38be4b0e0cd0ae30000000000000000000000000000000000000000000000000000000000000000`
4. target: `0xf87343a973f75A2CBa9Fb93616fA8331e5fFf2B1`  
   value: `0`  
   calldata: `0xd547741fc785f0e55c16138ca0f8448186fa6229be092a3a83db3c5d63c9286723c5a2c400000000000000000000000066168715b5a760d775a9672255bd49087063613f`
5. target: `0xc78E9Bf65Ab6DB5F638Cb4448dc5eBcB7c6e99F3`  
   value: `0`  
   calldata: `0xd547741fc785f0e55c16138ca0f8448186fa6229be092a3a83db3c5d63c9286723c5a2c400000000000000000000000066168715b5a760d775a9672255bd49087063613f`

## 3) Scripts Added

- `scripts/governance/preflight-check.mjs`
  - Reads live on-chain proposal state and prints queue/execute readiness.
- `scripts/governance/queue-proposals.mjs`
  - Hard gate: state must be `Succeeded (4)` before queue.
- `scripts/governance/execute-proposals.mjs`
  - Hard gate: state must be `Queued (5)` and ETA window must be open before execute.
- Shared module:
  - `scripts/governance/_common.mjs`

Safety behavior:
- Default mode is dry-run (no transactions).
- On failed state gate, scripts print clear error and exit non-zero.
- Broadcast requires explicit `--broadcast`.

## 4) Execution-Day Runbook

### A. Queue day (March 26, 2026 TRT)

1. Preflight all proposals:

```bash
/usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all
```

2. Queue B-01/B-02 (only after state is `4`):

```bash
/usr/local/bin/node scripts/governance/queue-proposals.mjs --proposal=b01b02 --broadcast
```

3. Queue B-03:

```bash
/usr/local/bin/node scripts/governance/queue-proposals.mjs --proposal=b03 --broadcast
```

4. Re-run preflight and confirm both are `5 (Queued)`.

### B. Execute day (March 28, 2026 TRT)

1. Preflight all proposals:

```bash
/usr/local/bin/node scripts/governance/preflight-check.mjs --proposal=all
```

2. Execute B-01/B-02 (only after state is `5` and execute window is open):

```bash
/usr/local/bin/node scripts/governance/execute-proposals.mjs --proposal=b01b02 --broadcast
```

3. Execute B-03:

```bash
/usr/local/bin/node scripts/governance/execute-proposals.mjs --proposal=b03 --broadcast
```

4. Final verify:

```bash
/usr/local/bin/node deploy/contracts/verify-governance-state.mjs --strict --profile=conservative
```

## 5) Important Notes

- This prep pass intentionally did **not** send queue or execute transactions.
- If preflight state check fails, do not force broadcast.
- Keep RPC stable and re-run preflight immediately before each broadcast action.
