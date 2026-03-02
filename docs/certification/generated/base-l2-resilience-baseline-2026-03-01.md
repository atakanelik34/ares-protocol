# ARES Base / L2 Resilience Baseline

Status date: March 2, 2026  
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
- `contracts/test/AresDisputeL2Timing.t.sol`
- `docs/certification/generated/base-no-inclusion-simulation-2026-03-01.md`
- `docs/certification/generated/dispute-window-decision-2026-03-01.md`
- `docs/audit/base-l2-launch-acceptance.md`
- `docs/certification/generated/base-l2-acceptance-register-2026-03-02.json`

---

## What Is Mechanically True

### 1. ARI decay is bucketed by full-day intervals
`AresARIEngine` computes elapsed time in whole-day buckets:

`elapsedDays = (block.timestamp - lastUpdate) / 1 days`

Implication:
- sub-day timestamp drift does not continuously distort ARI
- timing noise smaller than one full day changes ARI only at bucket boundaries

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

### 4. No-inclusion behavior is now executable, not narrative-only
The timing harness proves:
- votes included before deadline count
- votes at exact deadline do not count
- votes landing after deadline do not reopen the outcome
- a 14-day dispute window materially improves fairness margin under delayed inclusion

---

## Current Risk Read

### ARI Timing Sensitivity
- low for ordinary timestamp drift smaller than one day
- non-zero at day-boundary edges
- no evidence currently suggests economically material ARI distortion from small timestamp variance alone

### Dispute Timing Sensitivity
- non-trivial near deadline edges
- bounded and operationally mitigated under the 14-day dispute window policy
- not mathematically eliminated

### Sequencer / Inclusion Risk
- ARES cannot claim that sequencer downtime or censorship never changes dispute fairness
- ARES can now claim that the edge behavior is explicit, bounded, and paired with an operational response policy

---

## Current Verdict
Current Base/L2 resilience verdict: `PASS WITH ASSUMPTIONS`

Reason:
ARES now has executable delayed-inclusion/no-inclusion evidence, a 14-day dispute-window decision, an auditor-facing launch acceptance note, and a machine-readable acceptance register. Residual fairness risk remains assumption-bound and still requires final launch signoff.

---

## Remaining gap
1. launch approver signoff on Base/L2 assumptions
2. any auditor-requested extension to no-inclusion or sequencer degradation testing
3. final launch package attachment
