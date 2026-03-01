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
- tests run: `39`
- passed: `39`
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
- ARI tier boundaries, correction path, chunked decay saturation, and repeated state sync through invariants
- dispute invalidation, accepted/rejected challenger payout branches, quorum-shortfall behavior, finalize/vote guardrails, adapter entrypoints, and governance parameter updates
- API access plan purchase, treasury split updates, and disabled-plan protection
- Governor lifecycle from propose to execute on a local timelock harness
- token treasury rotation, unauthorized mint/treasury guardrails, burn, burnFrom, fee accounting, and governor metadata/timelock bindings
- ERC-8004 identity metadata/wallet approval paths and unauthorized mutation rejection
- ERC-8004 reputation bridge guardrails, owner/operator exclusion, evidence mismatch rejection, and ledger bridge success path
- validation adapter request/response/finalize forwarding behavior
- stateful invariant runs for ARI bounds, action-count upper bounds, and registry resolution stability

---

## Invariant Harness Result

### Summary
- invariant suite: `AresCoreInvariants.t.sol`
- invariant tests: `3`
- runs per invariant: `256`
- total calls per invariant: `128000`
- invariant reverts: `0`

### Current invariant set
- `invariant_ariRemainsBoundedAndTiered`
- `invariant_recordedActionsUpperBoundValidActions`
- `invariant_registryResolutionRemainsStable`

Interpretation:
ARES now has a real stateful invariant baseline. This is still not the final certification-grade invariant pack, but it moves the suite out of purely scenario-based testing.

---

## Coverage Result

### Repository-wide measured totals
- line coverage: `76.27%` (`704/923`)
- statement coverage: `73.58%` (`738/1003`)
- branch coverage: `62.75%` (`155/247`)
- function coverage: `80.00%` (`108/135`)

### Frozen launch-critical contract subset
This subset excludes deploy scripts and test harness files and includes:
- `core/*`
- `erc8004-adapters/*`
- `token/*`

Measured totals for that subset:
- line coverage: `91.63%` (`613/669`)
- statement coverage: `89.76%` (`640/713`)
- branch coverage: `67.44%` (`145/215`)
- function coverage: `85.98%` (`92/107`)

### Measured by file

| File | Line % | Branch % | Func % | Assessment |
|---|---:|---:|---:|---|
| `core/AresARIEngine.sol` | 76.47 | 58.82 | 57.14 | improved through invariant-driven sync path, still shallow on long-sequence decay economics |
| `core/AresApiAccess.sol` | 100.00 | 66.67 | 100.00 | direct functional coverage present |
| `core/AresDispute.sol` | 96.10 | 74.51 | 93.75 | materially stronger; payout/quorum branches are now covered, but deterministic settlement invariants remain |
| `core/AresRegistry.sol` | 95.83 | 55.56 | 93.33 | strongest core module so far |
| `core/AresScorecardLedger.sol` | 100.00 | 71.43 | 100.00 | strong direct coverage with tampered-signature and invalidation guardrails |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 93.33 | 65.00 | 92.31 | substantial improvement; still some branch blind spots remain |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 100.00 | 80.77 | 100.00 | direct bridge and guardrail coverage now strong |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 100.00 | 57.14 | 100.00 | direct executable coverage present |
| `token/AresGovernor.sol` | 77.78 | 100.00* | 77.78 | lifecycle plus metadata/timelock bindings exercised; branch metric not meaningful on `0/0` paths |
| `token/AresToken.sol` | 93.75 | 66.67 | 90.00 | privilege and treasury guardrails improved, mint finality still not proven |

`*` Branch percentage on files with `0/0` branch classes is not itself a certification signal.

---

## Interpretation Against Certification Framework

### What improved
1. Repository-wide line coverage improved from `64.99%` to `76.27%`.
2. Repository-wide branch coverage improved from `43.88%` to `62.75%`.
3. Frozen launch-critical line coverage improved from `79.67%` to `91.63%`.
4. Frozen launch-critical branch coverage improved from `48.37%` to `67.44%`.
5. Ledger coverage now includes explicit tampered-payload rejection and dispute-role invalidation guardrails.
6. `AresDispute` branch depth improved substantially through accepted/rejected payout and quorum-shortfall testing.
7. A real stateful invariant harness now exists and executes reverts-free over long randomized sequences.

### What still fails against certification target
Certification target in the framework is `>= 95%` line and branch coverage on frozen critical contracts, plus certification-grade invariant/fuzz depth.

Current baseline still does **not** satisfy that target.

### Current blocker reasons
1. Branch depth remains materially below target across launch-critical contracts.
2. `AresRegistry`, `AresARIEngine`, `ERC8004IdentityAdapter`, and `ERC8004ValidationAdapter` still have meaningful branch gaps.
3. Current invariant suite is useful but narrow; it does not yet cover dispute settlement, scorer authorization mutation, or token authority finality.
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
1. Extend invariant suites to cover dispute settlement and score invalidation under repeated randomized action/dispute sequences.
2. Deepen branch-heavy tests for `AresRegistry`, `AresARIEngine`, `ERC8004IdentityAdapter`, and `ERC8004ValidationAdapter`.
3. Add governance authority invariants beyond the local lifecycle harness.
4. Produce token mint-finality evidence once mainnet token architecture is frozen.
5. Re-run coverage on every major security-suite expansion and update the frozen-subset totals.

---

## Verdict
Current security-suite baseline verdict: `BLOCKED`

Reason:
The suite is now materially stronger, includes stateful invariants, and covers most launch-critical modules directly, but it remains below the certification threshold required for a mainnet-ready verdict.
