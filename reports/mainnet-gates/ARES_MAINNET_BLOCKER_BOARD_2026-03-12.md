# ARES Mainnet Live Blocker Board (March 12, 2026)

## Current Decision
- **Mainnet:** `NO-GO`
- **Testnet continuation:** `GO WITH CONDITIONS`

## Live Snapshot (as of March 12, 2026)
- Network: Base Sepolia
- Governor: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`
- Timelock: `0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E`
- Block at capture: `38773840`
- Proposal states:
  - B-01/B-02 proposal: `Active (1)`
  - B-03 proposal: `Active (1)`
- Current live governance/dispute params (still pre-remediation profile):
  - `proposalThreshold = 0`
  - `quorumNumerator = 4`
  - `timelock minDelay = 172800` (48h)
  - `minChallengerStake = 10 ARES`
  - `minValidatorStake = 5 ARES`
  - `dispute votingPeriod = 3 days`
  - `dispute quorum = 1 ARES`
  - `slashingBps = 1000`

## Closed / No Longer Blocking
- **B-04 Data-plane rollout:** `CLOSED`
  - `/api/v1/scores` and `/api/v1/disputes` are live and returning `200`.
- **B-05 Ops reliability pack:** `CLOSED` (current scope)
  - Evidence pack delivered: `reports/mainnet-gates/B05-ops-reliability-evidence.md`
  - Backup/restore drill: PASS
  - Incident simulation + MTTR: PASS
  - Query-gateway test suite: PASS
- **Webhook production auth mode:** effective `hmac` in production, `dual` only non-prod.

## Remaining Mainnet Blockers (Live)

| ID | Status | Why It Blocks Mainnet | Earliest On-Chain Closure Window | What We Can Do Today (No Waiting) |
|---|---|---|---|---|
| **B-01/B-02** Governance parameter uplift (`threshold/quorum + dispute params`) | `IN PROGRESS` (proposal active, voted) | Mainnet conservative profile is not live yet (`threshold=0`, `quorum=4`, dispute low-cost profile still active). | Queue earliest: **2026-03-26 07:23:22 TRT**. Execute earliest: **2026-03-28 07:23:22 TRT**. | 1) Monitoring snapshots now active under `reports/governance/execution-prep/monitoring/`. 2) Queue/execute scripts + evidence templates are ready. 3) On window day only broadcast tx + archive receipts. |
| **B-03** Dispute v2 cutover final role rewire/revoke | `IN PROGRESS` (proposal active, voted) | Old-side role revoke and final role migration are governance-gated and not executed yet. | Queue earliest: **2026-03-26 08:46:32 TRT**. Execute earliest: **2026-03-28 08:46:32 TRT**. | 1) Pre-cutover role topology assertion now automated (`scripts/governance/check-b03-role-topology.mjs`). 2) Post-execute run in `post` mode and archive proof. 3) Finalize B-03 evidence with tx hashes and role table. |
| **B-06** Token/TGE finalization proof | `OPEN` | Token/TGE is documented, but execution/finality proof set is not finalized for launch. | Depends on final launch ceremony, not current governance window only. | 1) Freeze distribution manifest + checksum. 2) Prepare/review mint-finality and role-revoke transaction plan. 3) Run Sepolia dry-run ceremony and generate rehearsal evidence bundle. |
| **B-07** External audit closure attestation | `OPEN` | Round-1 audit exists, but independent closure attestation on deployment target is still open. | Depends on external reviewer timeline. | 1) Build closure package (findings -> fixes -> tests -> on-chain checks). 2) Send to auditor with explicit attestation ask. 3) Schedule signoff call and track required deltas in one list. |
| **B-08** Final launch signoff | `OPEN` | Launch committee/package signoff depends on B-01..B-07 closures. | After blockers above close. | 1) Prepare final signoff memo template now. 2) Define objective pass/fail gates and required attachments. 3) Pre-assign signers and decision meeting window. |

## Recommended Today-First Execution Order
1. **Governance watch -> execute pipeline:** keep 6h preflight snapshots; execute queue/execute on window day with no script edits.
2. **Audit closure package (B-07):** send attestation-ready bundle to external reviewer and capture response.
3. **Token/TGE readiness (B-06):** complete final mainnet ceremony proof population on top of prepared strict-valid bundle.
4. **Launch signoff (B-08):** convert memo from NO-GO to GO only after all hard-gate evidence is attached.

## Prompt Starters (Ready To Use Today)

### Prompt A — Governance execution prep
```text
Create production-ready queue/execute scripts for B-01/B-02 and B-03 proposals on Base Sepolia.
Requirements:
- Read proposal IDs and compute operation hashes.
- Add strict preflight checks: proposal state must be Succeeded before queue, Queued before execute.
- Print exact calldata, targets, values, description hash, and expected earliest execution timestamp.
- Save outputs under reports/governance/execution-prep/.
- Do not execute queue/execute yet; prep only.
```

### Prompt B — B-05 follow-up hardening (optional)
```text
Run a follow-up B-05 hardening pass on top of the existing evidence pack.
Tasks:
1) full release artifact switchback (rollback-to-previous-release) rehearsal
2) alert trigger/notification drill with proof
3) attach runbook signoff approvals
Deliverables:
- reports/mainnet-gates/B05-ops-reliability-evidence.md (append follow-up section)
- reports/mainnet-gates/artifacts/b05/followup/
```

### Prompt C — B-07 attestation package
```text
Build external audit closure attestation package from current repo + on-chain state.
Include:
- finding-to-fix matrix
- commit evidence
- test evidence
- on-chain parameter evidence
- open residual risk list
Output:
- reports/audit/ARES_EXTERNAL_CLOSURE_ATTESTATION_PACK_2026-03-12.md
```

### Prompt D — B-06 token/TGE readiness prep
```text
Prepare token/TGE finalization readiness pack (no mainnet tx execution).
Include:
- frozen distribution manifest with checksums
- role-revoke and mint-finality transaction plan
- Sepolia rehearsal script and expected outputs
Output:
- reports/mainnet-gates/B06-token-tge-readiness-pack.md
```

## Notes
- Dates above are block-time estimates and should be rechecked near queue/execute.
- This board is intentionally execution-oriented: each blocker has a no-wait action set for today.
