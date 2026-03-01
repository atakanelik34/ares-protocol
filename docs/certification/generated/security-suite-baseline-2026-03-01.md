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
- tests run: `71`
- passed: `71`
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
- post-snapshot minting and post-snapshot delegation cannot retroactively create quorum or passing power for an existing proposal
- token treasury rotation, constructor/privilege guardrails, burn, burnFrom, fee accounting, governor metadata/timelock bindings, governed-target timelock enforcement, and mint-finality ceremony proof
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
- line coverage: `80.56%` (`870/1080`)
- statement coverage: `79.64%` (`919/1154`)
- branch coverage: `86.04%` (`228/265`)
- function coverage: `84.43%` (`141/167`)

### Frozen launch-critical contract subset
This subset excludes deploy scripts and test harness files and includes:
- `core/*`
- `erc8004-adapters/*`
- `token/*`

Measured totals for that subset:
- line coverage: `98.21%` (`657/669`)
- statement coverage: `97.48%` (`695/713`)
- branch coverage: `95.35%` (`205/215`)
- function coverage: `98.13%` (`105/107`)

### Measured by file

| File | Line % | Branch % | Func % | Assessment |
|---|---:|---:|---:|---|
| `core/AresARIEngine.sol` | 96.73 | 94.12 | 100.00 | normalization/cap and constructor/view guardrails are now covered; residual gap is narrow and non-foundational |
| `core/AresApiAccess.sol` | 100.00 | 100.00 | 100.00 | constructor/role guards and stateful authority invariants now fully cover the module |
| `core/AresDispute.sol` | 98.70 | 90.20 | 100.00 | dispute settlement branches are now deep and broadly covered; remaining gap is certification-grade randomized settlement proof, not direct branch reachability |
| `core/AresRegistry.sol` | 98.96 | 96.30 | 100.00 | constructor/withdraw-zero-pending and over-withdraw guardrails close most residual branch risk |
| `core/AresScorecardLedger.sol` | 100.00 | 100.00 | 100.00 | constructor/governance guardrails plus scorer-mutation invariants now fully cover the module |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 100.00 | 90.00 | 100.00 | constructor guardrails close most remaining branch risk; residual blind spots are narrow |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 100.00 | 100.00 | 100.00 | constructor and bridge/guardrail coverage now fully close measured branch surface |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 100.00 | 100.00 | 100.00 | constructor and zero-stake response branches are now covered |
| `token/AresGovernor.sol` | 88.89 | 100.00* | 88.89 | lifecycle plus metadata/interface/timelock bindings are exercised; branch metric not meaningful on `0/0` paths |
| `token/AresToken.sol` | 93.75 | 100.00 | 90.00 | constructor and privilege guardrails are now fully branched, but mint finality still is not proven |

`*` Branch percentage on files with `0/0` branch classes is not itself a certification signal.

---

## Interpretation Against Certification Framework

### What improved
1. Repository-wide line coverage improved from `80.09%` to `80.56%`.
2. Repository-wide branch coverage improved from `79.09%` to `86.04%`.
3. Frozen launch-critical line coverage improved from `97.61%` to `98.21%`.
4. Frozen launch-critical branch coverage improved from `86.98%` to `95.35%`.
5. `AresApiAccess` now has full measured line/statement/branch/function coverage.
6. `AresScorecardLedger` now has full measured line/statement/branch/function coverage.
7. `AresDispute` branch coverage crossed into certification-grade territory on direct measured paths (`90.20%`).
8. `AresRegistry` branch coverage crossed into certification-grade territory on direct measured paths (`96.30%`).
9. `AresARIEngine` branch coverage is now `94.12%`, materially narrowing one of the last major core blind spots.
10. A third invariant suite now proves disabled scorers cannot produce successful writes under repeated governance toggles and keeps the authorization mirror synchronized.

### What now satisfies the certification gate
The framework target for the frozen launch-critical contract set is `>= 95%` line and branch coverage, plus certification-grade invariant/fuzz depth.

The raw **coverage gate** for the frozen launch-critical contract set is now satisfied.

### Current blocker reasons
1. Current invariant suites now cover core, authority, scorer mutation, dispute payout backing, and part of governance snapshot semantics, but they still do not cover full governance capture economics.
2. Mint finality mechanism is now executable locally, but mainnet ceremony evidence is still missing.
3. `AresDispute` and `ERC8004IdentityAdapter` still retain meaningful residual branch blind spots even though the frozen aggregate gate now passes.
4. Coverage output still includes anchor warnings, so frozen-subset interpretation must remain explicit.

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
1. Extend invariants and generated reports from governance snapshot semantics into full governance capture resistance.
2. Deepen remaining branch-heavy tests for `AresDispute` and `ERC8004IdentityAdapter` to reduce residual blind spots.
3. Add governance authority invariants beyond the local lifecycle harness and current authority-surface invariants.
4. Produce launch-day token mint-finality evidence once mainnet token architecture is frozen.
5. Re-run coverage on every major security-suite expansion and update the frozen-subset totals.

---

## Verdict
Current security-suite baseline verdict: `PASS WITH ASSUMPTIONS`

Reason:
The suite now satisfies the frozen launch-critical raw coverage gate and has meaningful stateful invariant depth. Governance-capture executable evidence remains incomplete, and token mint finality now depends on deployment-time ceremony proof rather than an unresolved absence of mechanism.
