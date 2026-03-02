# ARES Security Suite Baseline

Status date: March 2, 2026  
Artifact class: Executable Security Suite / Workstream 2  
Environment: local repository baseline

## Purpose
This artifact records the current executable security baseline for ARES based on the live repository test suite.

It is not the final certification-grade suite.  
It is the current measured baseline for the mainnet certification effort.

---

## Commands Executed

```bash
cd /Users/busecimen/Downloads/AresProtocol/contracts
forge test -vv
forge coverage --report summary
```

Toolchain basis:
- Foundry
- Solc `0.8.24`
- optimizer enabled in normal test path
- coverage path disables optimizer/viaIR for measurement accuracy

---

## Test Suite Result

### Summary
- suites run: `15`
- tests run: `88`
- passed: `88`
- failed: `0`
- skipped: `0`

### Suites passing
- `AresARIEngine.t.sol`
- `AresApiAccess.t.sol`
- `AresAuthorityInvariants.t.sol`
- `AresCoreInvariants.t.sol`
- `AresDispute.t.sol`
- `AresDisputeL2Timing.t.sol`
- `AresDisputeSettlementRandomized.t.sol`
- `AresGovernanceCaptureInvariants.t.sol`
- `AresLedgerAuthorityInvariants.t.sol`
- `AresRegistry.t.sol`
- `AresScorecardLedger.t.sol`
- `AresTokenGovernor.t.sol`
- `ERC8004Adapter.t.sol`
- `ERC8004AdapterResidual.t.sol`
- `ERC8004ValidationAdapter.t.sol`

### Invariant-oriented checks
- invariant-oriented tests: `14`
- current invariant set spans:
  - core ARI/dispute/registry consistency
  - authority mutation bounds
  - scorer authorization safety
  - governance snapshot stability
  - timelock delay floor

### Coverage of behavior currently demonstrated by tests
- registry stake lifecycle, cooldown, wallet linking, zero-pending withdraw, and over-withdraw guardrails
- score range enforcement, duplicate prevention, tampered-signature rejection, unauthorized scorer rejection, missing-agent rejection, and dispute-role invalidation protection
- ARI tier boundaries, correction path, chunked decay saturation, governance setter validation, normalization/cap branches, and repeated state sync through invariants
- dispute invalidation, accepted/rejected challenger payout branches, quorum-shortfall behavior, finalize/vote guardrails, adapter entrypoints, randomized settlement baseline, and governance parameter updates
- API access plan purchase, treasury split updates, disabled-plan protection, constructor guardrails, and authority-surface invariants
- Governor lifecycle from propose to execute on a local timelock harness
- post-snapshot minting and post-snapshot delegation cannot retroactively create quorum or passing power for an existing proposal
- token treasury rotation, constructor/privilege guardrails, burn, burnFrom, fee accounting, governor metadata/timelock bindings, governed-target timelock enforcement, and mint-finality ceremony proof
- ERC-8004 identity metadata/wallet approval paths, unauthorized mutation rejection, and residual adapter edge guards
- ERC-8004 reputation bridge guardrails, owner/operator exclusion, evidence mismatch rejection, and ledger bridge success path
- validation adapter request/response/finalize forwarding behavior
- dispute deadline behavior under delayed inclusion, no inclusion in final `1h/6h/24h`, exact-deadline rejection, and 14-day mainnet-target fairness baseline

---

## Coverage Result

### Repository-wide measured totals
- line coverage: `79.27%` (`906/1143`)
- statement coverage: `79.53%` (`956/1202`)
- branch coverage: `86.04%` (`228/265`)
- function coverage: `81.22%` (`147/181`)

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
| `core/AresARIEngine.sol` | 96.73 | 94.12 | 100.00 | normalization/cap and constructor/view guardrails are covered; residual gap is narrow |
| `core/AresApiAccess.sol` | 100.00 | 100.00 | 100.00 | fully covered on measured launch-critical paths |
| `core/AresDispute.sol` | 98.70 | 90.20 | 100.00 | branch surface is deep; remaining gap is completeness depth rather than obvious missing reachability |
| `core/AresRegistry.sol` | 98.96 | 96.30 | 100.00 | branch coverage is in certification-grade territory |
| `core/AresScorecardLedger.sol` | 100.00 | 100.00 | 100.00 | fully covered on measured launch-critical paths |
| `erc8004-adapters/ERC8004IdentityAdapter.sol` | 100.00 | 90.00 | 100.00 | residual blind spots are narrow and adapter-scoped |
| `erc8004-adapters/ERC8004ReputationAdapter.sol` | 100.00 | 100.00 | 100.00 | fully covered on measured launch-critical paths |
| `erc8004-adapters/ERC8004ValidationAdapter.sol` | 100.00 | 100.00 | 100.00 | fully covered on measured launch-critical paths |
| `token/AresGovernor.sol` | 88.89 | 100.00* | 88.89 | lifecycle and binding paths are covered; branch metric is not meaningful on `0/0` paths |
| `token/AresToken.sol` | 93.75 | 100.00 | 90.00 | privilege and ceremony guardrails covered; live mainnet finality proofs still absent |

`*` Branch percentage on files with `0/0` branch classes is not itself a certification signal.

---

## Interpretation Against Certification Framework

### What this now proves
1. The frozen launch-critical raw coverage gate is satisfied.
2. ARES has moved beyond scenario-only testing into a mixed suite of deterministic tests, invariants, randomized settlement checks, and L2 timing harnesses.
3. Governance snapshot semantics now have direct executable evidence.
4. Token finality and authority closure are no longer blocked by missing workflow structure.

### What remains open
1. Governance capture is still not eliminated by technical tests alone.
2. `AresDispute` and `ERC8004IdentityAdapter` retain narrow residual blind spots that must remain named for audit.
3. Mainnet token finality still depends on live ceremony proofs.

---

## Coverage Tool Caveat
`forge coverage` still emits anchor warnings. The run completed and produced usable totals.

Interpretation rule:
- repository-wide totals are useful context
- the frozen launch-critical subset is the controlling certification signal
- uncovered-path justification must stay explicit

---

## Required Next Actions
1. Preserve frozen coverage gate in all future changes.
2. Carry governance-capture invariants and economic artifacts into external audit.
3. Keep residual branch-gap report synchronized with any new audit-driven tests.
4. Replace workflow placeholders with live launch evidence on mainnet day.

---

## Verdict
Current security-suite baseline verdict: `PASS WITH ASSUMPTIONS`

Reason:
The suite satisfies the frozen launch-critical raw coverage gate and now has meaningful invariant, randomized settlement, and L2 timing depth. Remaining blockers are external-audit, governance-residual-risk, and live launch-evidence problems rather than missing baseline test infrastructure.
