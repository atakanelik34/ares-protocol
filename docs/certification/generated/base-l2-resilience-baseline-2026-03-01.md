# ARES Base / L2 Resilience Baseline

Status date: March 1, 2026  
Artifact class: Base/L2 resilience / Workstream 5  
Environment: current repository logic and Base launch assumptions

## Purpose
This artifact records what ARES can currently say about Base-specific timing and liveness sensitivity.

It is not a full fault-injection report.  
It is the current bounded baseline linking contract timing behavior to L2 launch assumptions.

---

## Evidence Used
- `contracts/core/AresARIEngine.sol`
- `contracts/core/AresDispute.sol`
- `contracts/test/AresARIEngine.t.sol`
- `docs/mainnet-certification-framework-v1.md`

---

## What Is Mechanically True

### 1. ARI decay is bucketed by full-day intervals
`AresARIEngine` computes elapsed time in whole-day buckets:

`elapsedDays = (block.timestamp - lastUpdate) / 1 days`

Implication:
- sub-day timestamp drift does not continuously distort ARI
- timing noise smaller than one full day changes ARI only at bucket boundaries

Evidence:
- engine code
- `testChunkedDecaySaturation`
- `testDecayVolumeAndCorrection`

### 2. High `daysSince` remains deterministic
`AresARIEngine` caps elapsed-day saturation at `10,000` days and then uses deterministic chunked fixed-point exponentiation.

Implication:
- extreme elapsed-time values cannot create unbounded arithmetic behavior
- long-gap sync behavior remains deterministic

### 3. Dispute expiry is timestamp-based and bounded by configured voting period
`AresDispute` sets:
- `deadline = block.timestamp + votingPeriod`

Implication:
- dispute fairness depends on inclusion and timestamp behavior near the deadline
- the contract does not independently compensate for sequencer downtime or censorship

---

## Current Risk Read

### ARI Timing Sensitivity
- low for ordinary timestamp drift smaller than one day
- non-zero at day-boundary edges
- no evidence currently suggests economically material ARI distortion from small timestamp variance alone

### Dispute Timing Sensitivity
- non-trivial near deadline edges
- no executable no-inclusion or sequencer-outage fairness report exists yet
- protocol currently relies on conservative dispute window sizing and governance parameter discipline, not a formal L2 outage compensation mechanism

### Sequencer / Inclusion Risk
- ARES cannot currently claim that sequencer downtime or censorship never changes dispute fairness
- this remains assumption-bound until a dedicated Base fault model is produced

---

## Current Verdict
Current Base/L2 resilience verdict: `BLOCKED`

Reason:
ARES has bounded timing behavior in ARI math, but has not yet produced a certification-grade report for dispute fairness under delayed inclusion, sequencer outage, or timestamp-edge stress.

---

## Minimum Conditions To Unblock
1. Produce a Base fault model artifact with explicit assumptions.
2. Define acceptable economic delta under timing drift.
3. Simulate no-inclusion and delayed-inclusion dispute windows.
4. Document launch policy for sequencer outage and dispute fairness handling.


## No-inclusion simulation status
- Contract-level timing harness: `contracts/test/AresDisputeL2Timing.t.sol`
- Generated simulation pack: `base-no-inclusion-simulation-2026-03-01.md` and `base-no-inclusion-scenarios-2026-03-01.json`
- Accepted mainnet dispute voting window target: `14 days`
- Residual statement: bounded and operationally mitigated, not mathematically eliminated
