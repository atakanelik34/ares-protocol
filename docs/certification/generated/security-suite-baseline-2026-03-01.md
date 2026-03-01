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
- suites run: `9`
- tests run: `47`
- passed: `47`
- failed: `0`
- skipped: `0`

### Suites passing
- `AresRegistry.t.sol`
- `AresScorecardLedger.t.sol`
- `AresARIEngine.t.sol`
- `AresDispute.t.sol`
- `AresApiAccess.t.sol`
- `AresTokenGovernor.t.sol`
- `ERC8004Adapter.t.sol`
- `ERC8004ValidationAdapter.t.sol`
- `AresCoreInvariants.t.sol`

### Coverage of behavior currently demonstrated by tests
- registry stake lifecycle, cooldown, and wallet linking guardrails
- score range enforcement, duplicate prevention, tampered-signature rejection, dispute-role invalidation guardrails, unauthorized scorer rejection, and missing-agent rejection
- ARI tier boundaries, correction path, chunked decay saturation, governance setter validation, and repeated state sync through invariants
- dispute invalidation, accepted/rejected challenger payout branches, quorum-shortfall behavior, finalize/vote guardrails, adapter entrypoints, and governance parameter updates
- API access plan purchase, treasury split updates, and disabled-plan protection
- Governor lifecycle from propose to execute on a local timelock harness
- token treasury rotation, unauthorized mint/treasury guardrails, burn, burnFrom, fee accounting, and governor metadata/timelock bindings
- ERC-8004 identity metadata/wallet approval paths and unauthorized mutation rejection
- ERC-8004 reputation bridge guardrails, owner/operator exclusion, evidence mismatch rejection, and ledger bridge success path
- validation adapter request/response/finalize forwarding behavior
- stateful invariant runs for ARI bounds, dispute-triggered invalidation correctness, pending-withdrawal backing, action-count upper bounds, and registry resolution stability

---

## Invariant Harness Result

### Summary
- invariant suite: `AresCoreInvariants.t.sol`
- invariant tests: `5`
- runs per invariant: `256`
- total calls per invariant: `128000`
- invariant reverts: `0`

### Current invariant set
- `invariant_ariRemainsBoundedAndTiered`
- `invariant_finalizedAcceptedDisputesInvalidateLedgerActions`
- `invariant_pendingDisputeWithdrawalsRemainBacked`
- `invariant_recordedActionsUpperBoundValidActions`
- `invariant_registryResolutionRemainsStable`

Interpretation:
ARES now has a real stateful invariant baseline. This is still not the final certification-grade invariant pack, but it moves the suite out of purely scenario-based testing.

---

## Coverage Result

### Repository-wide measured totals
- line coverage: `79.46%` (`770/969`)
- statement coverage: `77.55%` (`812/1047`)
- branch coverage: `69.80%` (`178/255`)
- function coverage: `86.81%` (`125/144`)

### Frozen launch-critical contract subset
This subset excludes deploy scripts and test harness files and includes:
- `core/*`
- `erc8004-adapters/*`
- `token/*`

Measured totals for that subset:
- line coverage: `96.71%` (`647/669`)
- statement coverage: `95.79%` (`683/713`)
- branch coverage: `75.81%` (`163/215`)
- function coverage: `95.33%` (`102/107`)

### Measured by file

| File | Line % | Branch % | Func % | Assessment |
|---|---:|---:|---:|---|
| `core/AresARIEngine.sol` | 94.12 | 79.41 | 95.24 | materially stronger; remaining blind spots are deep branch combinations, not basic correctness |
| `core/AresApiAccess.sol` | 100.00 | 66.67 | 100.00 | direct functional coverage present |
| `core/AresDispute.sol` | 96.10 | 74.51 | 93.75 | materially stronger; payout/quorum branches are now covered, but deterministic settlement invariants remain |
| `core/AresRegistry.sol` | 98.96 | 77.78 | 100.00 | strong direct coverage plus adapter and missing-agent guardrails |
| `core/AresScorecardLedger.sol` | 100.00 | 71.43 | 100.00 | strong direct coverage with tampered-signature and invalidation guardrails |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 100.00 | 75.00 | 100.00 | metadata duplication and default view paths are now covered; only residual branch polish remains |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 100.00 | 80.77 | 100.00 | direct bridge and guardrail coverage now strong |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 100.00 | 100.00 | 100.00 | constructor and zero-stake response branches are now covered |
| `token/AresGovernor.sol` | 77.78 | 100.00* | 77.78 | lifecycle plus metadata/timelock bindings exercised; branch metric not meaningful on `0/0` paths |
| `token/AresToken.sol` | 93.75 | 66.67 | 90.00 | privilege and treasury guardrails improved, mint finality still not proven |

`*` Branch percentage on files with `0/0` branch classes is not itself a certification signal.

---

## Interpretation Against Certification Framework

### What improved
1. Repository-wide line coverage improved from `76.27%` to `79.46%`.
2. Repository-wide branch coverage improved from `62.75%` to `69.80%`.
3. Frozen launch-critical line coverage improved from `91.63%` to `96.71%`.
4. Frozen launch-critical branch coverage improved from `67.44%` to `75.81%`.
5. `AresARIEngine` and `AresRegistry` now have materially stronger guardrail coverage through governance validation, adapter registration, and missing-agent paths.
6. `ERC8004ValidationAdapter` now has full measured branch coverage.
7. The invariant harness is now dispute-aware and enforces accepted-dispute invalidation plus pending-withdrawal backing.

### What still fails against certification target
Certification target in the framework is `>= 95%` line and branch coverage on frozen critical contracts, plus certification-grade invariant/fuzz depth.

Current baseline still does **not** satisfy that target.

### Current blocker reasons
1. Branch depth remains materially below target across launch-critical contracts.
2. `AresApiAccess`, `AresDispute`, `AresScorecardLedger`, `ERC8004IdentityAdapter`, and `AresToken` still have meaningful branch gaps relative to certification threshold.
3. Current invariant suite is now useful and dispute-aware, but it still does not cover scorer authorization mutation, governance authority, or token mint finality.
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
- extend invariant surface from core arithmetic to dispute/token/governance authority
- produce uncovered-path justification for residual blind spots

---

## Required Next Actions
1. Extend invariant suites to cover scorer authorization mutation, governance authority boundaries, and token authority finality.
2. Deepen branch-heavy tests for `AresApiAccess`, `AresDispute`, `AresScorecardLedger`, `ERC8004IdentityAdapter`, and `AresToken`.
3. Add governance authority invariants beyond the local lifecycle harness.
4. Produce token mint-finality evidence once mainnet token architecture is frozen.
5. Re-run coverage on every major security-suite expansion and update the frozen-subset totals.

---

## Verdict
Current security-suite baseline verdict: `BLOCKED`

Reason:
The suite is now materially stronger, includes stateful invariants, and covers most launch-critical modules directly, but it remains below the certification threshold required for a mainnet-ready verdict.
