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
- suites run: `8`
- tests run: `24`
- passed: `24`
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

### Coverage of behavior currently demonstrated by tests
- registry stake lifecycle, cooldown, and wallet linking guardrails
- score range enforcement, duplicate prevention, and unauthorized scorer rejection
- ARI tier boundaries, correction path, and chunked decay saturation
- dispute invalidation, rejected challenge payout path, and finalize/vote guardrails
- API access plan purchase, treasury split updates, and disabled-plan protection
- Governor lifecycle from propose to execute on a local timelock harness
- token treasury rotation, burn, burnFrom, and fee accounting paths
- ERC-8004 selector snapshots and core/adapter desync boundary
- owner feedback prohibition in reputation adapter
- validation adapter request/response/finalize forwarding behavior

---

## Coverage Result

### Repository-wide measured totals
- line coverage: `64.99%` (`555/854`)
- statement coverage: `62.58%` (`577/922`)
- branch coverage: `43.88%` (`104/237`)
- function coverage: `64.52%` (`80/124`)

### Frozen launch-critical contract subset
This subset excludes deploy scripts and test harness files and includes:
- `core/*`
- `erc8004-adapters/*`
- `token/*`

Measured totals for that subset:
- line coverage: `79.67%` (`533/669`)
- statement coverage: `78.54%` (`560/713`)
- branch coverage: `48.37%` (`104/215`)
- function coverage: `70.09%` (`75/107`)

### Measured by file

| File | Line % | Branch % | Func % | Assessment |
|---|---:|---:|---:|---|
| `core/AresARIEngine.sol` | 75.16 | 58.82 | 52.38 | meaningful core coverage, still shallow on long-sequence state |
| `core/AresApiAccess.sol` | 100.00 | 66.67 | 100.00 | direct functional coverage now present |
| `core/AresDispute.sol` | 79.22 | 45.10 | 62.50 | materially improved but still below branch target |
| `core/AresRegistry.sol` | 95.83 | 55.56 | 93.33 | strongest core module so far |
| `core/AresScorecardLedger.sol` | 100.00 | 57.14 | 100.00 | strong direct coverage with negative paths |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 55.00 | 25.00 | 38.46 | partial only; still needs adversarial depth |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 32.56 | 23.08 | 33.33 | weakest currently tested launch-critical module |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 100.00 | 57.14 | 100.00 | direct executable coverage now present |
| `token/AresGovernor.sol` | 77.78 | 100.00* | 77.78 | lifecycle exercised, but branch metric not meaningful on `0/0` paths |
| `token/AresToken.sol` | 93.75 | 50.00 | 90.00 | strong token-path baseline, mint finality still not proven |

`*` Branch percentage on files with `0/0` branch classes is not itself a certification signal.

---

## Interpretation Against Certification Framework

### What improved
1. Direct executable coverage now exists for `AresApiAccess`.
2. Direct executable coverage now exists for `ERC8004ValidationAdapter`.
3. Governance lifecycle behavior is now exercised through `AresTokenGovernor.t.sol`.
4. Core suite expanded from `12` tests across `5` suites to `24` tests across `8` suites.
5. Repository-wide line coverage improved from `46.63%` to `64.99%`.
6. Repository-wide branch coverage improved from `23.63%` to `43.88%`.

### What still fails against certification target
Certification target in the framework is `>= 95%` line and branch coverage on frozen critical contracts, plus certification-grade invariant/fuzz depth.

Current baseline does **not** satisfy that target.

### Current blocker reasons
1. Branch depth remains materially below target across launch-critical contracts.
2. `ERC8004ReputationAdapter` and `ERC8004IdentityAdapter` remain under-covered.
3. `AresDispute` branch depth is still not sufficient for certification confidence.
4. Current suite is scenario-based, not stateful invariant-driven.
5. Mint finality and mainnet token authority are still policy-level, not executable finality proofs.
6. Coverage output still includes anchor warnings, so frozen-subset interpretation must remain explicit.

---

## Coverage Tool Caveat
`forge coverage` emitted many anchor warnings. The run still completed and produced usable totals, but this artifact should be treated as:
- valid as a baseline measurement
- not yet sufficient as the final launch coverage pack

Required follow-up:
- keep the frozen critical contract list explicit
- move from scenario coverage to invariant/fuzz evidence
- produce uncovered-path justification for residual blind spots

---

## Required Next Actions
1. Add stateful invariant suites for Registry/Ledger/Engine/Dispute.
2. Deepen branch-heavy adversarial tests for `AresDispute`.
3. Add direct negative-path and replay-path tests for `ERC8004IdentityAdapter` and `ERC8004ReputationAdapter`.
4. Add governance authority invariants beyond the local happy-path lifecycle.
5. Produce token mint-finality evidence once mainnet token architecture is frozen.
6. Re-run coverage on every major security-suite expansion and update the frozen-subset totals.

---

## Verdict
Current security-suite baseline verdict: `BLOCKED`

Reason:
The suite is now materially stronger and covers more of the launch-critical surface, but it remains below the certification threshold required for a mainnet-ready verdict.
