# ARES ERC-8183 Implementation Audit

Date: March 10, 2026  
Auditor mode: `enterprise-web3-external-auditor`  
Scope type: implementation security + interoperability review

## 1. Scope

Reviewed surfaces:
- `contracts/erc8183-adapters/AresACPHook.sol`
- `contracts/erc8183-adapters/AresACPAdapter.sol`
- `contracts/erc8183-adapters/AresEvaluator.sol`
- `contracts/interfaces/erc8183-spec/IACPHook.sol`
- `contracts/interfaces/erc8183-spec/IAresACPCompat.sol`
- `contracts/test/AresACPHook.t.sol`
- `docs/erc-8183-integration.md`
- `docs/architecture.md`

Interop focus:
- ERC-8183 hook lifecycle compliance (`beforeAction` / `afterAction`, selector/data decoding)
- Coexistence with existing ERC-8004 adapters (authority, ledger write behavior, regression impact)
- Adapter-only integration model (no changes in ARES core contracts)

## 2. Methodology and Evidence

Manual + static review:
- Line-by-line read of all new ERC-8183 contracts and tests.
- Authority model checks: `onlyACP`, `onlyRole`, immutable ACP dependency, oracle controls.
- Failure semantics checks: fail-open boundaries, state snapshot correctness.
- Score-write integrity checks: payload decode, signer dependency, action IDs.

Automated evidence:
- `semgrep` scan on `contracts/` (0 findings; 0 blocking)
- `forge test --root ./contracts --match-path test/AresACPHook.t.sol` (14/14 passed)
- `forge test --root ./contracts` (106/106 passed)
- `npm run docs:validate` (passed)
- `npm test` (passed across workspaces; SDK/subgraph placeholders remain noop/TODO as in baseline)

## 3. Findings

### F-001 — [HIGH] Unregistered provider could bypass `fund` reputation gate

Status: **Fixed**

Affected logic (pre-fix behavior):
- `AresACPHook._beforeFund` accepted `agentOk == false` as fail-open, without distinguishing:
  - external lookup failure (expected fail-open)
  - deterministic unregistered provider (should fail-closed)

Impact:
- A job with a provider wallet not registered in ARES could still transition through `fund`.
- This weakens the core reputation-gated funding policy and allows policy bypass.

Remediation implemented:
- Added explicit agent resolution state classification:
  - `Ok`
  - `LookupFailed`
  - `Unregistered`
- Enforced fail-closed for deterministic unregistered providers:
  - revert `ProviderNotRegistered(provider)` in `_beforeFund`
- Kept fail-open for genuine external lookup failures (registry availability issues), preserving lifecycle resilience objective.

Code references (fixed):
- `contracts/erc8183-adapters/AresACPHook.sol:220`
- `contracts/erc8183-adapters/AresACPHook.sol:227`
- `contracts/erc8183-adapters/AresACPHook.sol:232`
- `contracts/erc8183-adapters/AresACPHook.sol:412`
- `contracts/erc8183-adapters/AresACPHook.sol:423`

Regression proof:
- Added test `testFundBlocksUnregisteredProvider`:
  - `contracts/test/AresACPHook.t.sol:263`

Fixed in commit:
- `fe7dd5e`

### F-002 — [INFO] ACP compatibility is intentionally single-target and ABI-coupled in v1

Status: Accepted design assumption

Observation:
- `IAresACPCompat` is the abstraction boundary, but no shim is implemented yet.
- Current deployment assumes a single known ACP target with ABI compatibility.

Risk note:
- A non-compatible ACP variant requires a shim before production interop.

Recommendation:
- Keep current model for v1.
- Add shim contract only when second ACP implementation becomes a requirement.

### F-003 — [INFO] Oracle throughput guard in evaluator is present and tested

Status: Verified

Observation:
- `AresEvaluator` enforces per-oracle per-block resolution caps (`default = 1`) with governance update path.

Code references:
- `contracts/erc8183-adapters/AresEvaluator.sol:18`
- `contracts/erc8183-adapters/AresEvaluator.sol:49`
- `contracts/erc8183-adapters/AresEvaluator.sol:78`

Test evidence:
- `testOracleRateLimitRevertsWithinSameBlockAndResetsNextBlock`
- `testDifferentOraclesHaveIndependentPerBlockQuota`

## 4. ERC Interoperability Assessment

ERC-8183 lifecycle:
- Hook callback routing and data decoding for `fund`, `setProvider`, `submit`, `complete`, `reject` are implemented and tested.
- Reject pre-state snapshot (`Funded` vs `Submitted`) is captured before transition and consumed after transition, preventing post-transition ambiguity.

ERC-8004 coexistence:
- Full contract suite including ERC-8004 adapter tests remains green after ERC-8183 integration.
- No authority or ledger role regressions observed in existing invariant and adapter tests.

## 5. Final Verdict

- Open Critical findings: **0**
- Open High findings: **0**
- Open Medium findings: **0**
- Open Low findings: **0**
- Open Info findings: **2**

Conclusion:
- The ERC-8183 integration is in a shippable state for current v1 assumptions after closing F-001.
- Security gates requested for push (`no open P0/P1`) are satisfied.
