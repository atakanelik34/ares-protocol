# ARES Mainnet Go/No-Go Checklist

Status date: February 28, 2026  
Current stage: Testnet-live infrastructure on Base Sepolia

## Purpose
This checklist defines the hard launch gates for Base mainnet.  
Any unchecked **Critical Gate** means **No-Go**.

Rationale: avoid “feature-complete” bias and ship only when governance + security + ops are verifiably ready.

---

## Gate 1: Governance Authority (Critical)
- [ ] Timelock + Governor deployed and verified.
- [ ] Core/admin contracts delegated to Timelock (`DEFAULT_ADMIN_ROLE` + `GOVERNANCE_ROLE` where applicable).
- [ ] Token admin delegated to Timelock.
- [ ] Timelock proposer/canceller set to Governor.
- [ ] Bootstrap deployer privileges revoked according to launch policy.
- [ ] Governance state report generated and archived.

Evidence:
- `deploy/contracts/governance.base-sepolia.json`
- `deploy/contracts/verify-governance-state.mjs` output

Rationale: mainnet control must be exercised by governance executor (Timelock), not deployer EOA.

---

## Gate 2: Security Readiness (Critical)
- [ ] External audit completed.
- [ ] High/Critical findings fully remediated.
- [ ] Foundry tests pass (`forge test`) including adapter + dispute + ARI correction coverage.
- [ ] Fuzz/invariant pass on key modules (Registry/Ledger/Engine/Dispute).
- [ ] API auth replay protections validated (nonce TTL + single-use).

Evidence:
- Audit report links
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

Evidence:
- `/api/v1/health`, `/api/v1/leaderboard`, `/api/v1/actions` checks
- Explorer smoke output

Rationale: trust protocol must present consistent data across all integration surfaces.

---

## Gate 5: Token/TGE Finalization (Pre-launch Critical)
- [ ] Mainnet supply + distribution policy frozen.
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

## Current Snapshot (Feb 27, 2026)
- Testnet infra: **Live**
- Contracts on Base Sepolia: **Live**
- Governance layer on Base Sepolia: **Timelock + Governor deployed and verified**
- Handoff mode currently applied: **Hard handoff complete** (deployer roles revoked; strict `--require-deployer-revoked` verification passing)
- Governance smoke test: **Proposal created on-chain** (`docs/demo/governance-proposal-smoke-sepolia.json`)
- Demo dataset: **40 agents / 500 actions / 20 disputes**
- Production recovery project: **`<YOUR_GCP_PROJECT>`**
- Production recovery VM: **`ares-vm-01`**
- DNS/SSL cutover: **Complete**
- Legacy compromised projects: **Deleted**
- Monitoring/alerting: **Configured** (notification email verification pending)
- Secret rotation: **Completed on production host**
- Mainnet declaration: **No-Go (pending governance hardening + audit closure)**
