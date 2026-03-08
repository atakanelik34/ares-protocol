# ARES Branch Consolidation and Mainnet Checklist

Last updated: 2026-03-08

## 1) Current Snapshot

- Local repo: `main` at `295ed3674706b0c3a08252f9486775802b4bf0b9`
- `origin/main`: `295ed3674706b0c3a08252f9486775802b4bf0b9`
- `internal/main`: `5879238d8c48f31974caa44c4dfbd29b04cd9458`
- Security closure line: `codex/security-closure-ext-001-004` at `5dbe43cc1fed29cad47828ff693abb2c7d6108da`

Divergence:
- `origin/main...internal/main`: `5/11` (both sides have unique commits)
- `main...codex/security-closure-ext-001-004`: `5/15`
- `internal/main...codex/security-closure-ext-001-004`: `0/4`

Interpretation:
- Security fixes are layered on top of `internal/main` (4 commits ahead), not on `main`.
- Public `main` does not contain dispute/webhook/dependency security closure commits.

## 2) Security-Critical Delta Not on Public Main

Missing on `main`:
- Dispute hardening in `contracts/core/AresDispute.sol`
  - action-validity guard
  - concurrent-dispute guard
  - no-quorum no-slash semantics
  - post-vote stake lock
  - `DisputeResolved` event
- Goldsky webhook HMAC + replay protections in `api/query-gateway/src/index.js`
- Next.js manifest upgrade and CI critical audit gate

Operational effect:
- Mainnet readiness remains blocked until these are merged and staged successfully.

## 3) Merge Simulation Result

Dry-run merge (`main` <-> `codex/security-closure-ext-001-004`) reports 29 conflict files.

Conflict-heavy zones:
- Public surface and repo governance files:
  - `.github/workflows/ci.yml`, `.gitignore`, `README.md`
- Security closure files:
  - `api/query-gateway/.env.example`
  - `api/query-gateway/src/index.js`
  - `api/query-gateway/src/goldsky.js`
  - `api/query-gateway/test/http.test.js`
  - `package-lock.json`
- Internal docs and runbooks that were removed in public `main` but exist in internal/security line.

Conclusion:
- Single-shot merge is high-friction.
- Safer path is commit-sequenced consolidation with explicit conflict policy.

## 4) Recommended Consolidation Strategy (Low-Risk Sequence)

### Phase A - Internal release line (source of truth)

1. Start from `codex/security-closure-ext-001-004`.
2. Create integration branch:
   - `codex/integration-main-internal-security-20260308`
3. Keep security closure commits as immutable base:
   - `ebf5d24`
   - `50f6373`
   - `c8f7131`
   - `5dbe43c`

Goal:
- Produce one internal release candidate with security closure + green verification.

### Phase B - Bring in public-main-only commits selectively

Do not merge `main` wholesale first.
Apply only required public-main commits and files intentionally:
- GitHub/public governance surface
- selected public docs pointers
- release workflow essentials

Rule:
- For conflict files tied to security closure (`AresDispute`, webhook auth, lockfile), keep integration branch versions unless a verified regression fix is needed.

### Phase C - Internal main promotion

1. PR from integration branch to `internal/main`.
2. Require green checks:
   - `forge test --root ./contracts`
   - `npm --workspace api/query-gateway test`
   - `npm --workspace dashboard/agent-explorer run build`
   - `npm --workspace sdk/typescript run build`
3. Manual checks:
   - `npm audit --workspace dashboard/agent-explorer --omit=dev --json` -> `critical=0`
   - webhook dual-mode auth path test

### Phase D - Public main sync

After internal main is stable:
1. Open controlled PR from internal release line to public `main`.
2. Keep public/private boundary policy:
   - do not re-introduce internal-only runbooks that public main intentionally excludes.
3. Run same verification matrix before merge.

## 5) Conflict Resolution Policy (Locked)

- `contracts/core/AresDispute.sol`: keep security-closure semantics.
- `contracts/test/AresDispute.t.sol`: keep no-quorum refund expectations.
- `api/query-gateway/src/index.js`: keep HMAC+timestamp+replay dual-mode implementation.
- `api/query-gateway/.env.example`: keep new HMAC/auth-mode envs.
- `package-lock.json`: regenerate only once at end (`npm ci`) after final manifest set is frozen.
- `docs/*`: keep public-safe subset on public main; preserve full operational docs on internal line.

## 6) Mainnet Gate Checklist (Exact Remaining Items)

### Gate G1 - Code and branch integrity
- [ ] Security closure merged into `internal/main`
- [ ] Security closure promoted to public `main` (or explicitly accepted as internal-only pre-mainnet branch with documented release source)
- [ ] CI critical advisory gate enabled on release path

### Gate G2 - Staging deployment and cutover rehearsal
- [ ] Deploy updated contracts stack to Base Sepolia rehearsal environment
- [ ] Rewire adapters/roles for new dispute contract references
- [ ] Run settlement smoke tests:
  - nonexistent action dispute rejected
  - concurrent dispute rejected
  - no-quorum full refund path
  - accepted/rejected economics unchanged where expected

### Gate G3 - Webhook trust hardening rollout
- [ ] `GOLDSKY_WEBHOOK_AUTH_MODE=dual` in staging with HMAC secret active
- [ ] Validate valid HMAC accepted, replay rejected, stale timestamp rejected
- [ ] Move to `hmac` mode in staging
- [ ] Promote same migration to production

### Gate G4 - Dependency and runtime posture
- [ ] Dashboard Next advisory closure verified (`critical=0` for explorer workspace)
- [ ] No manifest-lock mismatch (`npm ls` clean for `next`)
- [ ] Query-gateway production deps reviewed for reachable high-risk advisories

### Gate G5 - Governance and ops signoff
- [ ] Timelock/governor authority state re-verified
- [ ] Incident/rollback runbook signoff complete
- [ ] Launch committee GO decision recorded with exact commit hash and deploy artifact hashes

## 7) Go/No-Go Rule

- **NO-GO** until G1-G5 are all checked.
- **GO WITH CONDITIONS** only if unresolved items are documented with owner/date/risk acceptance.
- **GO** only after staging rehearsal and production cutover rehearsal both pass on the same release commit.
