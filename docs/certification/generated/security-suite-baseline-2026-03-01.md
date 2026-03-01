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
- suites run: `5`
- tests run: `12`
- passed: `12`
- failed: `0`
- skipped: `0`

### Suites passing
- `AresRegistry.t.sol`
- `AresScorecardLedger.t.sol`
- `AresARIEngine.t.sol`
- `AresDispute.t.sol`
- `ERC8004Adapter.t.sol`

### Coverage of behavior currently demonstrated by tests
- registry stake lifecycle and wallet linking
- score range enforcement
- EIP-712 score write happy path
- ARI tier boundaries
- ARI decay/correction path
- chunked decay saturation
- dispute invalidation happy path
- ERC-8004 selector snapshots and core/adapter desync boundary
- owner feedback prohibition in reputation adapter

---

## Coverage Result

### Measured totals
- line coverage: `46.63%` (`388/832`)
- statement coverage: `45.41%` (`411/905`)
- branch coverage: `23.63%` (`56/237`)
- function coverage: `40.34%` (`48/119`)

### Measured by file

| File | Line % | Branch % | Func % | Assessment |
|---|---:|---:|---:|---|
| `core/AresARIEngine.sol` | 75.16 | 58.82 | 52.38 | meaningful but below certification target |
| `core/AresApiAccess.sol` | 0.00 | 0.00 | 0.00 | uncovered |
| `core/AresDispute.sol` | 60.39 | 25.49 | 50.00 | partial only |
| `core/AresRegistry.sol` | 86.46 | 18.52 | 80.00 | strong line coverage, weak branch depth |
| `core/AresScorecardLedger.sol` | 100.00 | 35.71 | 100.00 | strongest current module |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 55.00 | 25.00 | 38.46 | partial |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 32.56 | 23.08 | 33.33 | weak |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 0.00 | 0.00 | 0.00 | uncovered |
| `token/AresGovernor.sol` | 0.00 | 100.00* | 0.00 | effectively uncovered |
| `token/AresToken.sol` | 40.62 | 33.33 | 40.00 | partial |

`*` Branch percentage on effectively uncovered files is not meaningful where tool output reports `0/0` classes.

---

## Interpretation Against Certification Framework

### What passed
- baseline functional tests are green
- launch-critical core paths have at least some direct coverage
- no immediate regression failure in current repository state

### What failed against certification target
Certification target in the framework is `>= 95%` line and branch coverage on frozen critical contracts, plus certification-grade invariant/fuzz depth.

Current baseline does **not** satisfy that target.

### Current blocker reasons
1. `AresApiAccess` has no direct coverage.
2. `ERC8004ValidationAdapter` has no direct coverage.
3. `AresGovernor` has no meaningful executable coverage in the certification sense.
4. `AresDispute` branch coverage is too low for launch confidence.
5. `AresToken` and adapter modules remain materially under-covered.
6. Existing test suite is mostly scenario-based, not invariant-driven.

---

## Coverage Tool Caveat
`forge coverage` emitted many anchor warnings. The run still completed and produced usable totals, but this artifact should be treated as:
- valid as a baseline measurement
- insufficient as the final launch coverage pack

Required follow-up:
- freeze critical contract list
- separate launch-critical contracts from scripts
- improve branch-aware measurement discipline
- add explicit uncovered-path justification list

---

## Required Next Actions
1. Add tests for `AresApiAccess`.
2. Add tests for `ERC8004ValidationAdapter`.
3. Add governance lifecycle tests for `AresGovernor`.
4. Add branch-heavy adversarial tests for `AresDispute`.
5. Add token authority and mint-path tests for `AresToken`.
6. Add stateful invariant suites for Registry/Ledger/Engine/Dispute.
7. Re-run coverage after freezing the critical contract list.

---

## Verdict
Current security-suite baseline verdict: `BLOCKED`

Reason:
The suite is functionally healthy but materially below the certification threshold required for a mainnet-ready verdict.
