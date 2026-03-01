# ARES Security Suite Baseline

Status date: March 1, 2026  
Artifact class: Executable Security Suite / Workstream 2  
Environment: local repository baseline

## Purpose
This artifact records the current executable security baseline for ARES based on the live repository test suite.

It is not the final certification-grade suite.  
It is the measured starting point for the mainnet certification effort.

---

## Commands Executed

```bash
cd /Users/busecimen/Downloads/AresProtocol/contracts
forge test -vv
forge coverage
```

Toolchain basis:
- Foundry
- Solc `0.8.24`
- optimizer enabled in normal test path
- coverage path disables optimizer/viaIR for measurement accuracy

---

## Test Suite Result

### Summary
- suites run: `11`
- tests run: `58`
- passed: `58`
- failed: `0`
- skipped: `0`

### Suites passing
- `AresRegistry.t.sol`
- `AresScorecardLedger.t.sol`
- `AresARIEngine.t.sol`
- `AresDispute.t.sol`
- `AresApiAccess.t.sol`
- `AresAuthorityInvariants.t.sol`
- `AresLedgerAuthorityInvariants.t.sol`
- `AresTokenGovernor.t.sol`
- `ERC8004Adapter.t.sol`
- `ERC8004ValidationAdapter.t.sol`
- `AresCoreInvariants.t.sol`

### Coverage of behavior currently demonstrated by tests
- registry stake lifecycle, cooldown, and wallet linking guardrails
- score range enforcement, duplicate prevention, tampered-signature rejection, dispute-role invalidation guardrails, unauthorized scorer rejection, and missing-agent rejection
- ARI tier boundaries, correction path, chunked decay saturation, governance setter validation, and repeated state sync through invariants
- dispute invalidation, accepted/rejected challenger payout branches, quorum-shortfall behavior, finalize/vote guardrails, adapter entrypoints, and governance parameter updates
- API access plan purchase, treasury split updates, disabled-plan protection, and authority-surface guardrails
- Governor lifecycle from propose to execute on a local timelock harness
- token treasury rotation, constructor/privilege guardrails, burn, burnFrom, fee accounting, and governor metadata/timelock bindings
- ERC-8004 identity metadata/wallet approval paths and unauthorized mutation rejection
- ERC-8004 reputation bridge guardrails, owner/operator exclusion, evidence mismatch rejection, and ledger bridge success path
- validation adapter request/response/finalize forwarding behavior
- stateful invariant runs for ARI bounds, dispute-triggered invalidation correctness, pending-withdrawal backing, action-count upper bounds, registry resolution stability, token treasury authority, fee split boundedness, plan well-formedness, access-expiry monotonicity, and scorer authorization mutation safety

---

## Invariant Harness Result

### Summary
- invariant suites: `3`
- invariant tests: `11`
- runs per invariant: `256`
- total calls per invariant: `128000`
- invariant reverts: `0`

### Current invariant set
- `invariant_accessExpiryNeverRegressesForTrackedRecipients`
- `invariant_apiAccessFeeSplitRemainsBounded`
- `invariant_ariRemainsBoundedAndTiered`
- `invariant_finalizedAcceptedDisputesInvalidateLedgerActions`
- `invariant_pendingDisputeWithdrawalsRemainBacked`
- `invariant_recordedActionsUpperBoundValidActions`
- `invariant_registryResolutionRemainsStable`
- `invariant_disabledScorersCannotProduceSuccessfulWrites`
- `invariant_trackedAuthorizationMirrorMatchesLedgerState`
- `invariant_tokenTreasuryRemainsNonZeroAndAuthorized`
- `invariant_trackedPlansRemainWellFormed`

Interpretation:
ARES now has a multi-suite stateful invariant baseline across core protocol flows, token/API authority flows, and scorer authorization mutation flows. This is still not the final certification-grade invariant pack, but it moves the suite out of purely scenario-based testing.

---

## Coverage Result

### Repository-wide measured totals
- line coverage: `79.72%` (`857/1075`)
- statement coverage: `78.71%` (`906/1151`)
- branch coverage: `76.05%` (`200/263`)
- function coverage: `83.03%` (`137/165`)

### Frozen launch-critical contract subset
This subset excludes deploy scripts and test harness files and includes:
- `core/*`
- `erc8004-adapters/*`
- `token/*`

Measured totals for that subset:
- line coverage: `97.01%` (`649/669`)
- statement coverage: `96.07%` (`685/713`)
- branch coverage: `83.26%` (`179/215`)
- function coverage: `96.26%` (`103/107`)

### Measured by file

| File | Line % | Branch % | Func % | Assessment |
|---|---:|---:|---:|---|
| `core/AresARIEngine.sol` | 94.12 | 79.41 | 95.24 | materially stronger; remaining blind spots are deep branch combinations, not basic correctness |
| `core/AresApiAccess.sol` | 100.00 | 100.00 | 100.00 | constructor/role guards and stateful authority invariants now fully cover the module |
| `core/AresDispute.sol` | 96.10 | 74.51 | 93.75 | materially stronger; payout/quorum branches are now covered, but deterministic settlement invariants remain |
| `core/AresRegistry.sol` | 98.96 | 77.78 | 100.00 | strong direct coverage plus adapter and missing-agent guardrails |
| `core/AresScorecardLedger.sol` | 100.00 | 100.00 | 100.00 | constructor/governance guardrails plus scorer-mutation invariants now fully cover the module |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 100.00 | 75.00 | 100.00 | metadata duplication and default view paths are now covered; only residual branch polish remains |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 100.00 | 80.77 | 100.00 | direct bridge and guardrail coverage now strong |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 100.00 | 100.00 | 100.00 | constructor and zero-stake response branches are now covered |
| `token/AresGovernor.sol` | 88.89 | 100.00* | 88.89 | lifecycle plus metadata/interface/timelock bindings are exercised; branch metric not meaningful on `0/0` paths |
| `token/AresToken.sol` | 93.75 | 100.00 | 90.00 | constructor and privilege guardrails are now fully branched, but mint finality still is not proven |

`*` Branch percentage on files with `0/0` branch classes is not itself a certification signal.

---

## Interpretation Against Certification Framework

### What improved
1. Repository-wide line coverage improved from `79.71%` to `79.72%`.
2. Repository-wide branch coverage improved from `75.00%` to `76.05%`.
3. Frozen launch-critical line coverage improved from `96.71%` to `97.01%`.
4. Frozen launch-critical branch coverage improved from `81.40%` to `83.26%`.
5. `AresApiAccess` now has full measured line/statement/branch/function coverage.
6. `AresScorecardLedger` now has full measured line/statement/branch/function coverage.
7. A third invariant suite now proves disabled scorers cannot produce successful writes under repeated governance toggles and keeps the authorization mirror synchronized.

### What still fails against certification target
Certification target in the framework is `>= 95%` line and branch coverage on frozen critical contracts, plus certification-grade invariant/fuzz depth.

Current baseline still does **not** satisfy that target.

### Current blocker reasons
1. Branch depth remains materially below target across launch-critical contracts.
2. `AresDispute`, `AresRegistry`, `ERC8004IdentityAdapter`, `ERC8004ReputationAdapter`, and `AresARIEngine` still have meaningful branch gaps relative to certification threshold.
3. Current invariant suites now cover core, authority, and scorer-mutation baselines, but they still do not cover governance capture or token mint finality.
4. Mint finality and mainnet token authority remain policy-level, not executable finality proofs.
5. Coverage output still includes anchor warnings, so frozen-subset interpretation must remain explicit.

---

## Coverage Tool Caveat
`forge coverage` emitted many anchor warnings. The run still completed and produced usable totals, but this artifact should be treated as:
- valid as a baseline measurement
- stronger than the previous baseline
- not yet sufficient as the final launch coverage pack

Required follow-up:
- keep the frozen critical contract list explicit
- extend invariant surface from current core/authority baselines to governance capture and mint finality
- produce uncovered-path justification for residual blind spots

---

## Required Next Actions
1. Extend invariant suites to cover governance capture resistance and token authority finality.
2. Deepen branch-heavy tests for `AresDispute`, `AresRegistry`, `ERC8004IdentityAdapter`, `ERC8004ReputationAdapter`, and `AresARIEngine`.
3. Add governance authority invariants beyond the local lifecycle harness and current authority-surface invariants.
4. Produce token mint-finality evidence once mainnet token architecture is frozen.
5. Re-run coverage on every major security-suite expansion and update the frozen-subset totals.

---

## Verdict
Current security-suite baseline verdict: `BLOCKED`

Reason:
The suite is now materially stronger, includes stateful invariants, and covers most launch-critical modules directly, but it remains below the certification threshold required for a mainnet-ready verdict.
