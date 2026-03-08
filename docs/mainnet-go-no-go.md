# ARES Mainnet Go/No-Go Checklist

Status date: March 5, 2026  
Current stage: Testnet-live infrastructure with security-closure batch applied (Base Sepolia)

## Purpose
This checklist defines the hard launch gates for Base mainnet.  
Any unchecked **Critical Gate** means **No-Go**.

Rationale: avoid “feature-complete” bias and ship only when governance + security + ops are verifiably ready.

---

## Gate 1: Governance Authority (Critical)
- [ ] Timelock + Governor deployed and verified.
- [ ] Conservative governance profile deployed (`proposalThreshold=1,000,000 ARES`, `quorum=6%`, `timelock>=48h`).
- [ ] Core/admin contracts delegated to Timelock (`DEFAULT_ADMIN_ROLE` + `GOVERNANCE_ROLE` where applicable).
- [ ] Token admin delegated to Timelock.
- [ ] Timelock proposer/canceller set to Governor.
- [ ] Bootstrap deployer privileges revoked according to launch policy.
- [ ] Governance state report generated and archived.

Evidence:
- `deploy/contracts/governance.base-sepolia.json`
- `deploy/contracts/verify-governance-state.mjs` output
- Sepolia hard-handoff proof: `docs/demo/governance-state-sepolia-revoke-check.json`

Rationale: mainnet control must be exercised by governance executor (Timelock), not deployer EOA.

---

## Gate 2: Security Readiness (Critical)
- [x] External audit completed.
- [x] High/Critical findings fully remediated in code snapshot.
- [x] Foundry tests pass (`forge test`) including adapter + dispute + ARI correction coverage.
- [x] Fuzz/invariant pass on key modules (Registry/Ledger/Engine/Dispute).
- [x] API auth replay protections validated (nonce TTL + single-use).
- [ ] Dispute v2 cutover rehearsal completed (new dispute + new validation adapter + old-claim continuity).
- [ ] Webhook auth migration completed (`dual` -> sender HMAC ready -> `hmac` enforced).

Evidence:
- `/Users/busecimen/reports/audit_20260305_051253_ares_overall_external.md`
- Security closure commits on `codex/security-closure-ext-001-004`:
  - `ebf5d24` (`AresDispute` settlement/liveness fixes)
  - `50f6373` (webhook HMAC + dependency patch)
  - `c8f7131` (CI critical advisory gate + rollout docs)
- CI green test logs

Rationale: mainnet risk is dominated by authority and economic attack surface.

---

## Gate 3: Operations & Reliability (Critical)
- [ ] Production runbooks finalized (incident, rollback, key compromise).
- [ ] Monitoring + alerting active (API, explorer, chain RPC, DB).
- [ ] Backup/restore drill completed.
- [ ] Rate limiting + abuse controls validated in production config.

Evidence:
- Runbook docs
- Alert test screenshots/logs

Rationale: launch risk includes operational failures, not only contract bugs.

---

## Gate 4: Data Plane Integrity (Critical)
- [ ] Subgraph and API data paths consistent for leaderboard, score, actions, disputes.
- [ ] Explorer shows live and historical data from canonical pipeline.
- [ ] Demo/test data separated from production policies.
- [ ] Dispute response semantics expose `NO_QUORUM` vs `REJECTED` separation for consumers.

Evidence:
- `/api/v1/health`, `/api/v1/leaderboard`, `/api/v1/actions` checks
- Explorer smoke output

Rationale: trust protocol must present consistent data across all integration surfaces.

---

## Gate 5: Token/TGE Finalization (Pre-launch Critical)
- [ ] Mainnet supply + distribution policy frozen.
- [ ] Single-vault launch topology frozen and evidenced.
- [ ] Vesting/distributor contracts finalized (if used).
- [ ] Governance-approved fee policy (burn/treasury/validator split) confirmed.
- [ ] Public docs synchronized with on-chain parameters.

Rationale: prevent launch with ambiguous token economics.

---

## Pre-Base-Batches (Application) Scope
For Base Batches application window (before March 9, 2026), target:
- `Go` for **testnet-live proof**.
- `No-Go` for **mainnet launch** until Gates 1–5 are fully complete.

Rationale: strongest application posture is proven testnet traction + credible gated path to mainnet.

---

## Current Snapshot (Mar 5, 2026)
- Testnet infra: **Live**
- Contracts on Base Sepolia: **Live**
- Governance layer on Base Sepolia: **Timelock + Governor deployed and verified**
- Handoff mode currently applied: **Hard handoff complete** (deployer roles revoked; strict `--require-deployer-revoked` verification passing)
- Governance smoke test: **Proposal created on-chain** (proof archived in private operational records)
- Demo dataset: **40 agents / 500 actions / 20 disputes**
- External audit (round-1): **Completed**
- Security findings EXT-001/002/003/004: **Implemented in current code snapshot**
- Webhook auth mode target: **`dual -> hmac` migration still open**
- Production recovery project: **Redacted (managed via `GCP_PROJECT_ID` in ops runbooks)**
- Production recovery VM: **`ares-vm-01`**
- DNS/SSL cutover: **Complete**
- Legacy compromised projects: **Deleted**
- Monitoring/alerting: **Configured** (notification email verification pending)
- Secret rotation: **Completed on production host**
- Accepted mainnet governance target: **Conservative (`1M threshold / 6% quorum / 48h timelock`)**
- Accepted mainnet dispute window target: **14 days**
- Mainnet declaration: **No-Go (pending dispute-v2 live cutover evidence, HMAC-only webhook enforcement, final authority freeze, token finality execution proofs, and launch signoff)**
