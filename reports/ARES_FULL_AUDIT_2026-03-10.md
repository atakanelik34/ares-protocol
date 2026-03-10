# ARES Protocol Full Audit Report (Phase 0-8)

- Date: March 10, 2026
- Methodology: `enterprise-web3-external-auditor`
- Branch context: `codex/ares-full-audit-20260310`
- Canonical artifact: `reports/ARES_FULL_AUDIT_2026-03-10.md`

## Executive Summary (EN)
ARES was audited end-to-end across on-chain contracts, ERC-8004 and ERC-8183 adapters, backend/API surfaces, deployment/CI workflows, secret surface, git history, and local SQLite data paths.

Current result:
- Critical: 0
- High: 0
- Medium: 3
- Low: 3
- Info: several non-blocking notes

Security gates passed for this cycle:
- `forge test --root ./contracts`: 106/106 pass
- `npm run docs:validate`: pass
- `npm test`: pass

Interop status:
- ERC-8183 integration is functionally correct with passing hook lifecycle tests (fund gate, reject snapshot, onlyACP, evaluator rate-limit).
- ERC-8004 adapters remain green with no regression after ERC-8183 integration.

Release decision:
- Mainnet: **NO-GO**
- Continued testnet operation: **GO WITH CONDITIONS**

## Yonetici Ozeti (TR)
ARES; kontratlar, adapterlar (ERC-8004 + ERC-8183), Fastify backend, CI/deploy, secret yuzeyi, git gecmisi ve SQLite veri katmani dahil kapsamli olarak denetlendi.

Sonuc:
- Critical: 0
- High: 0
- Medium: 3
- Low: 3

Bu tur teknik gate'leri yesil:
- `forge test --root ./contracts` (106/106)
- `npm run docs:validate` (pass)
- `npm test` (pass)

Karar:
- Mainnet: **NO-GO**
- Testnet surekliligi: **GO WITH CONDITIONS**

---

## Scope and Evidence

### In-Scope Surfaces
- Core contracts: `AresRegistry`, `AresScorecardLedger`, `AresARIEngine`, `AresDispute`, `AresToken`, `AresGovernor`
- Adapters: ERC-8004 set + ERC-8183 set (`AresACPHook`, `AresACPAdapter`, `AresEvaluator`)
- Interfaces and Foundry tests
- Backend: `api/query-gateway` (auth, webhook, subgraph, scoring, store)
- Deployment scripts and GitHub workflows
- `.env` secret surface and git history credential traces
- SQLite DB files (`ares.db` variants)
- Public docs consistency/security claims

### MCP + Tool Evidence Snapshot
- Filesystem MCP:
  - full tree mapping, in-scope file inventory
  - secret pattern scan on `.env/.json/.yml/.yaml`
- Git MCP:
  - recent 30 commits analyzed
  - blame on high-risk files
  - historical credential trace checks (`git log -S`)
- Semgrep MCP:
  - full repo scan: 12 findings, 3 parse errors
  - contracts scan clean for critical solidity rules in current config
- Foundry MCP + forge:
  - local dynamic validation and full suite pass
- SQLite MCP:
  - table schema review (`waitlist`, `auth_nonce`, `goldsky_ingest`)
  - row count + write-path taint checks
- Live RPC checks (Base Sepolia):
  - governance role-handoff verification script passed in strict deployer-revoked mode
  - live governance/dispute parameters confirmed via `cast call`

---

## Phase-by-Phase Execution (0 to 8)

### Phase 0 - Recon and Inventory
Actions:
- Mapped contracts/backend/deploy/workflow/docs surfaces.
- Scanned secret patterns across config and env surfaces.
- Enumerated DB files and env files.

Key outputs:
- Contract source surfaces identified under `contracts/core`, `contracts/token`, `contracts/erc8004-adapters`, `contracts/erc8183-adapters`, `contracts/interfaces`.
- Backend source under `api/query-gateway/src` and tests under `api/query-gateway/test`.
- Local secret-like values observed in local `.env` files (redacted below), not in tracked `.env.example` files.

### Phase 1 - Threat Model and Asset Prioritization
Priority assets:
1. `AresDispute` correctness + economics
2. `AresScorecardLedger` signature trust path
3. ERC-8183 hook/evaluator authority boundaries
4. Webhook ingest/auth path (`/v1/indexer/goldsky/raw-logs`)
5. Governance/timelock control plane

### Phase 2 - Static Review + Cross-Contract Call Graph
Performed line-by-line review of core + adapter contracts and high-risk backend routes.

#### Architecture and Trust Boundaries (Cross-Contract Call Graph)
| Caller | Callee | Function | Trust assumption | Mutable/Substitutable risk |
|---|---|---|---|---|
| `AresScorecardLedger` | `AresRegistry` | `resolveAgentId`, `isRegisteredAgent` | Registry address immutable in constructor | Low (immutable) |
| `AresScorecardLedger` | `AresARIEngine` | `applyActionScore` | Engine immutable, role-gated write | Low (immutable) |
| `AresDispute` | `AresScorecardLedger` | `getAction`, `invalidateAction` | Ledger immutable, dispute role required | Low (immutable) |
| `AresDispute` | `AresARIEngine` | `invalidateActionContribution` | Engine immutable, dispute role required | Low (immutable) |
| `AresApiAccess` | `AresToken` | `burn` | Token immutable; burn path trusted | Low (immutable) |
| `AresApiAccess` | ERC20 token | `safeTransfer`, `safeTransferFrom` | Treasury/vault addresses governance-settable | Medium (governance mutable destination) |
| `ERC8004IdentityAdapter` | `AresRegistry` | `registerAgent`, `operatorOf` | Core registry immutable | Low |
| `ERC8004ReputationAdapter` | `ERC8004IdentityAdapter` | `ownerOf`, `getApproved`, `isApprovedForAll`, `getAgentWallet` | Identity adapter immutable | Low |
| `ERC8004ReputationAdapter` | `AresRegistry` | `operatorOf` | Registry immutable | Low |
| `ERC8004ReputationAdapter` | `AresScorecardLedger` | `recordActionScore` | Ledger immutable; signature/authorization enforces scorer | Low |
| `ERC8004ValidationAdapter` | `AresDispute` | `disputeActionFromAdapter`, `validatorJoinFromAdapter`, `voteFromAdapter`, `finalize` | Dispute address immutable, adapter authorization on dispute side | Low |
| `AresACPHook` | ACP (`IAresACPCompat`) | `getJobProvider`, `getJobState` | Single immutable ACP target | Low (single-address lock) |
| `AresACPHook` | `AresRegistry` | `resolveAgentId`, `isRegisteredAgent` | Immutable registry, fail-open on lookup failure | Medium (availability failure => policy bypass path) |
| `AresACPHook` | `AresARIEngine` | `getARIByAgentId` | Immutable engine, fail-open on lookup failure | Medium (availability failure => gate bypass path) |
| `AresACPHook` | `AresScorecardLedger` | `recordActionScore` | Immutable ledger, wrapped in try/catch | Low |
| `AresEvaluator` | ACP (`IAresACPCompat`) | `complete`, `reject` | Immutable ACP target + oracle role + per-block quota | Low |

Required ERC-8183 paths present and verified:
- `AresACPHook -> AresRegistry`
- `AresACPHook -> AresARIEngine`
- `AresACPHook -> AresScorecardLedger`
- `AresEvaluator -> ACP`

### Phase 3 - Dynamic Validation
Commands and results:
- `forge test --root ./contracts` -> **106/106 pass**
- `npm run docs:validate` -> **pass**
- `npm test` -> **pass**

Behavior gates confirmed green:
- low-ARI provider blocked on fund
- high-ARI provider allowed
- reject snapshot classification uses pre-state and clears mapping
- onlyACP enforced
- evaluator per-oracle rate-limit enforced
- ERC-8004 suites remain green

### Phase 4 - SQLite and Taint Analysis
Reviewed DB schema and backend write paths.

Observed tables:
- `waitlist`
- `auth_nonce`
- `goldsky_ingest`

Findings:
- Query paths use prepared statements (`?` placeholders) for inserts/updates.
- No direct string-concatenated SQL in request-controlled write paths.
- Replay table (`webhook_replay`) implemented in gateway DB path; SQLite MCP attached to root `ares.db` showed limited schema subset, so auxiliary DB files were verified via CLI too.

### Phase 5 - Economic Attack Simulation (AresDispute)
Live Base Sepolia parameters observed:
- `minChallengerStake = 10 ARES`
- `minValidatorStake = 5 ARES`
- `quorum = 1 ARES`
- `slashingBps = 1000 (10%)`
- `votingPeriod = 259200 sec (3 days)`

#### 1) Minimum stake manipulation
- Minimum capital to open dispute + cast one colluding accept vote: **15 ARES**.
- Because `quorum=1 ARES` and minimum participation is already >= 15 ARES, quorum is trivially met.
- Result: economically feasible to force accepted disputes for disputable actions when counterpart participation is absent.

#### 2) Slash amount griefing (stake drain)
- Direct draining of target agent stake is **not** possible via current dispute logic (slashing applies to challenger/validators, not target agent stake).
- However, repeated accepted disputes can invalidate actions and reduce ARI (reputation griefing).

#### 3) Dispute spam economics
- Concurrent spam cost scales ~`15 ARES * N disputes` capital lock for 3 days each.
- Sequential spam can reuse ~15 ARES but requires repeated dispute windows.
- No explicit per-target cooldown/rate-limit in contract; only active-dispute-per-action lock exists.

#### 4) ARI -100 manipulation break-even (deterministic model)
Based on live formula/weights/decay and accepted-dispute invalidations:
- Typical mid/high profile target needs roughly **6 to 21 accepted disputes** for ~100 ARI drop depending action count/profile.
- Parallel capital estimate: **90 to 315 ARES** (using 15 ARES per concurrent dispute).
- Sequential path: **15 ARES** rolling capital but **18 to 63+ days** depending required dispute count.

Economic classification:
- At current parameters this attack is **economically feasible** for determined adversaries against high-value targets.
- Raised as Medium finding (M-01).

### Phase 6 - Semgrep + Manual Triage
Semgrep full-scan summary:
- 12 findings, 3 parse errors

Actionable/security-relevant:
- release workflow shell interpolation warnings
- SSE CORS reflection warning

Triaged as:
- Medium: webhook dual fallback (manual + code evidence)
- Low: SSE CORS reflection
- Low: workflow interpolation hardening
- Info/accepted: several generic sanitizer/regex/nginx heuristics with low exploitability in current context

### Phase 7 - Git History and Change-Surface Audit
- Last 30 commits reviewed; key security closures identified:
  - `ebf5d24` dispute hardening
  - `50f6373` webhook HMAC + replay
  - `fe7dd5e` ERC-8183 integration
- `git blame` confirms expected ownership/change windows on high-risk lines.
- Historical secret checks:
  - local current secret values tested with `git log -S`: no evidence of those exact current values in history
  - one historical hardcoded **test private key** existed in `5daea16` (`api/query-gateway/test/auth.test.js`, line 27 in that commit), removed in current head

### Phase 8 - Decision and Signoff
Decision:
- Mainnet: **NO-GO**
- Continued testnet: **GO WITH CONDITIONS**

Main blockers:
- M-01 dispute economics hardening not yet in conservative posture
- M-02 webhook auth still allows dual token fallback
- M-03 live governance params below conservative mainnet target

---

## Findings Matrix

### Critical
- None.

### High
- None.

### Medium

#### M-01 - Dispute economics allow practical ARI-manipulation campaigns
- Severity: Medium
- Evidence:
  - `contracts/core/AresDispute.sol:44-48`
  - `contracts/core/AresDispute.sol:163`
  - `contracts/core/AresDispute.sol:181`
  - `contracts/core/AresDispute.sol:241-253`
  - `contracts/core/AresDispute.sol:260-263`
  - live Base Sepolia values read via `cast` (Mar 10, 2026)
- Exploit steps:
  1. Select target action with `VALID` status.
  2. Open dispute with minimum challenger stake.
  3. Join one colluding validator and vote accept.
  4. Finalize after deadline; action invalidated and ARI contribution removed.
  5. Repeat per action to push target ARI down.
- Blast radius:
  - Target reputation degradation, ranking distortion, trust-signal manipulation.
- Remediation:
  - Increase quorum and minimum stakes for mainnet profile.
  - Add anti-spam controls (per-agent epoch caps, challenger bond burn for failed disputes, minimum distinct validator count).
  - Add governance policy guardrails for dispute params.

#### M-02 - Webhook `dual` mode allows HMAC bypass via token fallback
- Severity: Medium
- Evidence:
  - `api/query-gateway/src/index.js:2216-2231`
- Exploit steps:
  1. Attacker obtains/leaks webhook token.
  2. Sends payload with invalid/missing HMAC under `dual` mode.
  3. Token fallback path authorizes request.
- Blast radius:
  - Unauthorized ingest, projection pollution, leaderboard/action integrity impact.
- Remediation:
  - Enforce `hmac` mode in production.
  - Remove token fallback after migration window.
  - Apply replay protections uniformly regardless of auth mode.

#### M-03 - Live governance posture below conservative mainnet target
- Severity: Medium
- Evidence:
  - `contracts/script/DeployGovernance.s.sol:32-33`
  - live chain reads (Mar 10, 2026):
    - `proposalThreshold() = 0`
    - `quorumNumerator() = 4`
- Exploit steps:
  1. Any account can submit proposals due zero threshold.
  2. Lower quorum configuration reduces attack cost vs conservative launch model.
- Blast radius:
  - Governance spam risk and lower capture-resistance if deployed unchanged to production.
- Remediation:
  - Apply conservative launch params (e.g., threshold 1M ARES, quorum 6%, 48h delay) before mainnet.
  - Keep strict role-revoked verification as mandatory gate.

### Low

#### L-01 - SSE endpoint reflects request origin into CORS header
- Severity: Low
- Evidence:
  - `api/query-gateway/src/index.js:1899-1910`
- Exploit steps:
  1. Third-party site opens SSE endpoint from browser.
  2. Server reflects arbitrary `Origin` into `Access-Control-Allow-Origin`.
- Blast radius:
  - Cross-origin consumption of stream (mainly public data abuse / data-harvest expansion).
- Remediation:
  - Use fixed allowlist for SSE origin policy; avoid raw reflection.

#### L-02 - Workflow dispatch input interpolation hardening gap
- Severity: Low
- Evidence:
  - `.github/workflows/release-repo.yml:30-37`
  - `.github/workflows/release-sdk-typescript.yml:35-40`
- Exploit steps:
  1. Malicious shell metacharacters in workflow input.
  2. Unquoted interpolation inside `run:` block can alter command semantics.
- Blast radius:
  - Primarily privileged maintainer/operator misuse path; still avoidable hardening debt.
- Remediation:
  - Bind inputs via `env:` and quote references in shell.

#### L-03 - Historical test private key literal exists in old commit history
- Severity: Low
- Evidence:
  - historical commit `5daea16`, file `api/query-gateway/test/auth.test.js`, line 27 (old revision)
- Exploit steps:
  1. Adversary scrapes old git history.
  2. Reuses leaked test key if ever reused operationally.
- Blast radius:
  - Low in current state (removed from HEAD), but hygiene risk persists in history.
- Remediation:
  - Ensure no reuse in any environment.
  - Optionally scrub history for strict compliance requirements.

### Informational Notes
- Local secret-like values exist in untracked `.env` files. In this report, all sensitive values are redacted.
- SQLite write paths reviewed are parameterized; no SQL-injection primitive found in inspected paths.
- ERC-8183 + ERC-8004 test suites pass together; no regression signal observed.

---

## Coverage Tracker ([R]/[P]/[S])
Legend:
- `[R]` Reviewed line-by-line
- `[P]` Partially reviewed or pattern-reviewed
- `[S]` Scanned/tool-only

### Contracts and Interfaces
- [R] `contracts/core/AresARIEngine.sol`
- [R] `contracts/core/AresApiAccess.sol`
- [R] `contracts/core/AresDispute.sol`
- [R] `contracts/core/AresRegistry.sol`
- [R] `contracts/core/AresScorecardLedger.sol`
- [R] `contracts/token/AresGovernor.sol`
- [R] `contracts/token/AresToken.sol`
- [R] `contracts/erc8004-adapters/ERC8004IdentityAdapter.sol`
- [R] `contracts/erc8004-adapters/ERC8004ReputationAdapter.sol`
- [R] `contracts/erc8004-adapters/ERC8004ValidationAdapter.sol`
- [R] `contracts/erc8183-adapters/AresACPAdapter.sol`
- [R] `contracts/erc8183-adapters/AresACPHook.sol`
- [R] `contracts/erc8183-adapters/AresEvaluator.sol`
- [R] `contracts/interfaces/IAresARIEngine.sol`
- [R] `contracts/interfaces/IAresDispute.sol`
- [R] `contracts/interfaces/IAresProtocol.sol`
- [R] `contracts/interfaces/IAresRegistry.sol`
- [R] `contracts/interfaces/IAresScorecardLedger.sol`
- [R] `contracts/interfaces/erc8004-spec/IERC8004IdentityRegistry.sol`
- [R] `contracts/interfaces/erc8004-spec/IERC8004ReputationRegistry.sol`
- [R] `contracts/interfaces/erc8004-spec/IERC8004ValidationRegistry.sol`
- [R] `contracts/interfaces/erc8183-spec/IACPHook.sol`
- [R] `contracts/interfaces/erc8183-spec/IAresACPCompat.sol`

### Foundry Tests
- [P] `contracts/test/AresACPHook.t.sol`
- [P] `contracts/test/AresARIEngine.t.sol`
- [P] `contracts/test/AresApiAccess.t.sol`
- [P] `contracts/test/AresAuthorityInvariants.t.sol`
- [P] `contracts/test/AresCoreInvariants.t.sol`
- [P] `contracts/test/AresDispute.t.sol`
- [P] `contracts/test/AresDisputeL2Timing.t.sol`
- [P] `contracts/test/AresDisputeSettlementRandomized.t.sol`
- [P] `contracts/test/AresGovernanceCaptureInvariants.t.sol`
- [P] `contracts/test/AresLedgerAuthorityInvariants.t.sol`
- [P] `contracts/test/AresRegistry.t.sol`
- [P] `contracts/test/AresScorecardLedger.t.sol`
- [P] `contracts/test/AresTokenGovernor.t.sol`
- [P] `contracts/test/ERC8004Adapter.t.sol`
- [P] `contracts/test/ERC8004AdapterResidual.t.sol`
- [P] `contracts/test/ERC8004ValidationAdapter.t.sol`

### Backend (Fastify/API)
- [P] `api/query-gateway/src/access.js`
- [R] `api/query-gateway/src/auth.js`
- [P] `api/query-gateway/src/goldsky.js`
- [R] `api/query-gateway/src/index.js`
- [R] `api/query-gateway/src/scoring.js`
- [R] `api/query-gateway/src/store.js`
- [P] `api/query-gateway/src/subgraph.js`
- [P] `api/query-gateway/test/access.test.js`
- [P] `api/query-gateway/test/auth.test.js`
- [P] `api/query-gateway/test/helpers.js`
- [P] `api/query-gateway/test/http.test.js`
- [P] `api/query-gateway/test/score.test.js`
- [P] `api/query-gateway/test/subgraph.test.js`
- [P] `api/query-gateway/test/tokenomics-consistency.test.js`
- [P] `api/query-gateway/test/waitlist.test.js`

### Deploy and Infra
- [R] `deploy/contracts/README.md`
- [R] `deploy/contracts/addresses.base-sepolia.json`
- [P] `deploy/contracts/deploy-base-sepolia.sh`
- [P] `deploy/contracts/deploy-governance-sepolia.sh`
- [P] `deploy/contracts/extract-addresses.mjs`
- [P] `deploy/contracts/governance-proposal-smoke-sepolia.mjs`
- [R] `deploy/contracts/governance.base-sepolia.json`
- [P] `deploy/contracts/handoff-governance-sepolia.sh`
- [S] `deploy/contracts/refresh-addresses-from-latest.mjs`
- [S] `deploy/contracts/refresh-governance-addresses-from-latest.mjs`
- [P] `deploy/contracts/run-demo-sepolia.mjs`
- [P] `deploy/contracts/update-subgraph-addresses.mjs`
- [R] `deploy/contracts/verify-governance-state.mjs`
- [P] `deploy/nginx/api.ares-protocol.xyz.conf`
- [P] `deploy/nginx/app.ares-protocol.xyz.conf`
- [P] `deploy/nginx/ares-protocol.xyz.conf`
- [P] `deploy/nginx/docs.ares-protocol.xyz.conf`
- [P] `deploy/pm2/ecosystem.config.cjs`
- [S] `deploy/vm/bootstrap.sh`
- [S] `deploy/vm/configure-nginx.sh`
- [S] `deploy/vm/deploy.sh`
- [S] `deploy/vm/harden.sh`
- [S] `deploy/vm/publish-landing.sh`
- [S] `deploy/vm/sync-to-vm.sh`

### CI/CD Workflows
- [P] `.github/workflows/ci-contracts.yml`
- [P] `.github/workflows/ci-docs.yml`
- [P] `.github/workflows/ci-node.yml`
- [P] `.github/workflows/ci.yml`
- [R] `.github/workflows/release-repo.yml`
- [R] `.github/workflows/release-sdk-typescript.yml`
- [R] `.github/workflows/secret-scan.yml`

### Env / Secret Surface
- [R] `.env` (local, redacted)
- [P] `.env.example`
- [R] `api/query-gateway/.env` (local, redacted)
- [P] `api/query-gateway/.env.example`
- [R] `dashboard/agent-explorer/.env.local` (local, redacted)
- [P] `dashboard/agent-explorer/.env.example`
- [S] `dashboard/protocol-admin/.env.local`

### SQLite Surfaces
- [R] `ares.db`
- [R] `api/query-gateway/ares.db`
- [R] `api/query-gateway/data/ares.db`
- [R] `tmp/goldsky-local-check/test.db`

### Docs and Public Status Claims
- [R] `README.md`
- [R] `docs/architecture.md`
- [R] `docs/erc-8183-integration.md`
- [R] `docs/security.md`
- [R] `docs/mainnet-go-no-go.md`
- [P] `docs/roadmap.md`
- [P] `docs/governance.md`
- [P] `docs/tokenomics.md`

---

## Interop Assessment (ERC-8183 + ERC-8004)

### ERC-8183
Validated behaviors:
- `beforeAction/afterAction` lifecycle path
- `onlyACP` enforcement
- fund-time ARI gate and unregistered provider block
- reject pre-state snapshoting and post-action classification
- evaluator oracle ACL + per-oracle per-block limit

Result: no regression/failure observed in test suite.

### ERC-8004
Validated behaviors:
- identity/register flows
- reputation bridge controls and role checks
- validation adapter dispute forwarding

Result: no regression with ERC-8183 additions.

---

## Remediation Roadmap

### 24h Hotfix Window
1. Move production webhook auth to `hmac` mode; disable token fallback.
2. Add explicit monitoring/alert on unauthorized/failed webhook auth attempts.
3. Prepare governance transaction bundle to raise proposal threshold/quorum for launch profile.

### 7-Day Stabilization
1. Dispute economics hardening proposal (quorum/min stake uplift, anti-spam measures).
2. Run targeted economic simulation suite on updated parameters and publish decision artifact.
3. Harden release workflows by removing direct shell interpolation from untrusted inputs.

### 30-Day Hardening
1. Formalize dispute anti-griefing policy and enforce via contract params/governance checks.
2. Add continuous economic risk dashboard (cost-to-manipulate ARI metrics).
3. Optional history hygiene program for legacy secret/test-key traces if compliance requires.

---

## Final Release Decision
- Mainnet readiness: **NO-GO**
- Continued testnet operation: **GO WITH CONDITIONS**

Conditions to clear before mainnet:
1. Dispute economics parameter hardening accepted and executed.
2. Webhook auth path locked to HMAC-only with replay protection.
3. Governance launch parameters set to conservative target and verified on-chain.

