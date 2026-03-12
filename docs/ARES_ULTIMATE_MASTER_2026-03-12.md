# ARES Protocol Ultimate Master Document

Version: 2026-03-12  
Owner: ARES core team  
Audience: Founders, protocol engineers, external auditors, launch committee, strategic partners

---

## 1) Executive Snapshot

ARES Protocol is a **testnet-live, reputation-first coordination infrastructure** for agentic systems on Base ecosystem rails.

Current verified posture:
- **Mainnet decision:** `NO-GO`
- **Testnet continuation:** `GO WITH CONDITIONS`
- **Why not GO yet:** governance parameter uplift and dispute cutover are proposed but not executed; token/TGE finality remains in readiness phase; external closure attestation still pending.

What is already real:
- Deployed core contracts on Base Sepolia
- Live API and explorer surfaces
- ERC-8004 adapters in production path
- ERC-8183 integration shipped and tested
- Dispute + scoring + identity loop functioning on testnet

---

## 2) What ARES Is (and Why It Matters)

ARES solves one core problem for autonomous systems:
- wallet identity alone is not enough,
- score alone is not enough,
- and policy alone is not enough.

ARES combines:
1. **Identity anchoring** (`AresRegistry`)
2. **Behavior ledgering** (`AresScorecardLedger`)
3. **Reputation computation** (`AresARIEngine`)
4. **Correction/dispute layer** (`AresDispute`)
5. **Access + integrations** (API and adapters)
6. **Governance and token control plane** (`AresGovernor`, `AresToken`, timelock)

This turns reputation from a static badge into a continuously updated system with correction semantics.

---

## 3) Live Deployment Footprint (Base Sepolia)

### Core addresses
- `AresToken`: `0x89f8748435b048e0f2944376cb793cf193b87af4`
- `AresRegistry`: `0x8df897ed117078983d9a097ee731104b6a7b843f`
- `AresARIEngine`: `0xc78e9bf65ab6db5f638cb4448dc5ebcb7c6e99f3`
- `AresScorecardLedger`: `0xf87343a973f75a2cba9fb93616fa8331e5fff2b1`
- `AresDispute`: `0x66168715b5a760d775a9672255bd49087063613f`
- `AresApiAccess`: `0xb390966a42bf073627617cde9467c36bcecdbca2`
- `ERC8004IdentityAdapter`: `0x6949a0edf05cb4f7624ca69ac2a612cdcc969c19`
- `ERC8004ReputationAdapter`: `0xd8c5c115a26ca426762c91d8a0bcd703d258fc0f`
- `ERC8004ValidationAdapter`: `0x7af6e906d5108d53abf5f025a38be4b0e0cd0ae3`

### Governance addresses
- `TimelockController`: `0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E`
- `AresGovernor`: `0x99aA690870a0Df973B97e63b63c2A8375a80188e`

Source of truth:
- `deploy/contracts/addresses.base-sepolia.json`
- `deploy/contracts/governance.base-sepolia.json`

---

## 4) Protocol Architecture (Trust Boundaries)

### On-chain boundary
- Registry: canonical identity/operator map
- Ledger: signed behavioral event intake and persistence
- ARI Engine: deterministic score computation from ledger state
- Dispute: action-level correction pathway with quorum/stake rules
- Governor/Timelock: mutable policy control under governance process

### Off-chain boundary
- Query gateway/API: read models, challenge/verify auth, webhook ingest
- Subgraph/indexing: projection availability and consistency
- Dashboard/explorer: operator and partner visibility layer

### Security principle
- off-chain is a data plane, not root-of-trust for canonical score state;
- canonical authority and reputation truth remain contract-bound.

---

## 5) Standards & Integration Surfaces

### ERC-8004
- Identity/reputation/validation adapter surfaces are live.
- Existing adapter suite remains green post ERC-8183 additions.

### ERC-8183 (shipped)
- `AresACPHook`
- `AresACPAdapter`
- `AresEvaluator`

Key safeguards:
- `onlyACP` boundary on hook callbacks
- reject snapshot classification to avoid post-state ambiguity
- evaluator per-oracle per-block rate limit
- fail-open where lifecycle safety requires non-blocking behavior

Audit status:
- implementation audit report exists with no open P0/P1.

---

## 6) API / Product Surfaces (Current)

Relevant live routes include:
- `/v1/agents`
- `/v1/scores`
- `/v1/disputes`
- auth/access endpoints
- stream/actions SSE

Security posture highlights:
- production webhook auth mode is effectively `hmac` (dual mode non-prod only)
- nonce/session auth controls present
- replay checks for webhook paths present

---

## 7) Security & Audit Posture

Primary artifacts:
- `reports/ARES_FULL_AUDIT_2026-03-10.md`
- `reports/ARES_ERC8183_IMPLEMENTATION_AUDIT_2026-03-10.md`
- `reports/audit/ARES_EXTERNAL_CLOSURE_ATTESTATION_PACK_2026-03-12.md`

Current closure map (high-level):
- Closed (code-level): M-02, L-01, L-02, L-03, ERC-8183 F-001
- In progress (governance execution dependent): M-01, M-03

Important: no mainnet readiness claim is made without on-chain execution evidence.

---

## 8) Governance Lifecycle (B-01/B-02 and B-03)

### Proposal IDs
- B-01/B-02: `58654035350196392900949207696152763655652189042590194943354964272374651090926`
- B-03: `102745141475066169865705909421050107559936801418546675182434592432068222986157`

Current state (snapshot-backed):
- both are `Active (1)` as of 2026-03-12 monitoring runs.

Window targets:
- queue window: 2026-03-26 (TRT)
- execute window: 2026-03-28 (TRT)

Execution tooling:
- `scripts/governance/preflight-check.mjs`
- `scripts/governance/queue-proposals.mjs`
- `scripts/governance/execute-proposals.mjs`
- `scripts/governance/monitor-preflight.mjs`
- `scripts/governance/check-b03-role-topology.mjs`

Canonical prep/evidence:
- `reports/governance/execution-prep/GOVERNANCE_EXECUTION_PREP_2026-03-26.md`
- `reports/governance/execution-prep/BASELINE_FREEZE_2026-03-12.md`
- `reports/governance/execution-prep/MONITORING_RUNBOOK_2026-03-12.md`
- queue/execute evidence templates under same folder

---

## 9) Mainnet Blocker Matrix (Current)

### Closed
- B-04 Data-plane rollout
- B-05 Ops reliability (current scope)

### Open / Blocking
- B-01/B-02 governance param uplift execution
- B-03 dispute v2 final cutover execution
- B-06 token/TGE finality execution proofs
- B-07 external closure attestation response
- B-08 final launch signoff

Canonical board:
- `reports/mainnet-gates/ARES_MAINNET_BLOCKER_BOARD_2026-03-12.md`

---

## 10) B-06 Token/TGE Readiness (What Is Done vs Pending)

Done:
- tokenomics deterministic check run and frozen checksum manifest produced
- token finality rehearsal bundle generated, filled, strict-validated
- artifacts archived under `reports/mainnet-gates/artifacts/b06/`

Pending:
- final mainnet ceremony tx proofs (mint/revoke/renounce chain)
- final signer signature references and launch approvals

Canonical:
- `reports/mainnet-gates/B06-token-tge-readiness-pack.md`

---

## 11) B-07 External Attestation Ask

Ready-to-send package:
- `reports/audit/ARES_EXTERNAL_CLOSURE_ATTESTATION_PACK_2026-03-12.md`

Asks to reviewer:
1. confirm code-level remediations are sufficient,
2. confirm governance-execution closure path is acceptable,
3. identify any additional mandatory pre-mainnet controls.

---

## 12) B-08 Signoff Logic

Launch signoff is fail-closed:
- if any hard gate is open, decision remains `NO-GO`.

Only allowed outcomes:
- `GO`
- `GO WITH CONDITIONS` (non-safety-critical only)
- `NO-GO`

Canonical signoff memo:
- `reports/mainnet-gates/B08-final-launch-signoff.md`

---

## 13) Test/Validation Evidence (Recent Cycle)

Cycle evidence folder:
- `reports/mainnet-gates/artifacts/cycle-2026-03-12/`

Observed:
- `forge test --root ./contracts` -> pass
- `npm test` -> pass
- `npm run docs:validate` -> pass
- `verify-governance-state --strict --profile=conservative` -> fails **as expected before governance execute**

Interpretation:
- software quality gates pass,
- governance state gate intentionally remains open until execution windows are completed.

---

## 14) Near-Term Critical Path (No Fluff)

1. Keep 6h governance monitoring snapshots until both proposals become `Succeeded`.
2. Queue both proposals on queue day with receipt evidence.
3. Execute both proposals on execute day with receipt evidence.
4. Run strict governance verify and archive passing output.
5. Run B-03 post-cutover role topology check in `post` mode and archive proof.
6. Finalize B-06 with actual mainnet ceremony tx evidence.
7. Send B-07 pack and collect external attestation response.
8. Re-score B-08 gates and issue final launch decision.

---

## 15) Messaging for External Stakeholders

### One-line truthful positioning
ARES is a real, testnet-live reputation protocol with production-grade hardening progress, currently in disciplined pre-mainnet closure mode rather than speculative launch mode.

### What to avoid saying
- “mainnet-ready now”
- “all audits fully closed”
- “governance hardening is live” (until execute is complete)

### What is safe to say
- integration shipped quickly (ERC-8183 support live in repo)
- no open P0/P1 in current implementation audit context
- remaining blockers are known, explicit, and evidence-tracked

---

## 16) Master Index (Start Here)

1. Governance execution plan and exact calldata:
   - `reports/governance/execution-prep/GOVERNANCE_EXECUTION_PREP_2026-03-26.md`
2. Live blocker board:
   - `reports/mainnet-gates/ARES_MAINNET_BLOCKER_BOARD_2026-03-12.md`
3. B-06 token/TGE pack:
   - `reports/mainnet-gates/B06-token-tge-readiness-pack.md`
4. B-07 attestation pack:
   - `reports/audit/ARES_EXTERNAL_CLOSURE_ATTESTATION_PACK_2026-03-12.md`
5. B-08 launch signoff:
   - `reports/mainnet-gates/B08-final-launch-signoff.md`

---

## Final Position (March 12, 2026)

- Product maturity: strong on testnet
- Security maturity: materially improved and structured
- Governance maturity: process-correct, execution-pending
- Launch maturity: not yet ready for GO

Decision remains: **`NO-GO mainnet` until governance execute + finality proof + external attestation + signoff closure.**
