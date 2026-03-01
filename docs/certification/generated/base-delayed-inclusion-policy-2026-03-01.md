# ARES Base Delayed-Inclusion and Sequencer-Outage Policy

Status date: March 1, 2026  
Artifact class: Base/L2 resilience support artifact  
Environment: launch policy baseline for dispute fairness

## Purpose
This artifact defines the minimum launch policy ARES must use when Base inclusion is degraded or sequencer liveness becomes uncertain.

It is not a substitute for a full Base fault model.
It is the operational policy bridge required because `AresDispute` uses timestamp-based deadlines.

---

## Evidence Used
- `contracts/core/AresDispute.sol`
- `docs/certification/generated/base-l2-resilience-baseline-2026-03-01.md`
- `docs/mainnet-certification-framework-v1.md`

---

## Current Mechanical Constraint
`AresDispute` sets `deadline = block.timestamp + votingPeriod`.

Implication:
- dispute fairness depends on timely inclusion near the deadline
- if Base inclusion becomes degraded, the contract does not autonomously extend fairness windows

---

## Launch Policy Requirements

### Mandatory operator actions
1. If Base sequencer health is materially degraded near dispute deadline windows, ARES operations must enter heightened review mode.
2. New dispute deadlines close to a known outage or inclusion anomaly must be flagged for manual fairness review.
3. Governance must retain the ability to widen dispute windows for future disputes before mainnet if empirical fault testing shows the current window is too tight.
4. No mainnet fairness claim may be made without explicitly stating that delayed inclusion remains an L2 assumption boundary.

### Required review thresholds
ARES should treat the following as launch-significant until stronger fault testing exists:
- extended no-inclusion interval around dispute expiry
- sequencer outage event overlapping active dispute windows
- repeated delayed inclusion that changes practical voter opportunity near deadline

---

## Current Verdict
Current delayed-inclusion policy verdict: `PASS WITH ASSUMPTIONS`

Reason:
ARES now has an explicit operational policy for timestamp-based dispute fairness, but it does not yet have a certification-grade outage simulation proving the policy is economically sufficient.

---

## Minimum Conditions To Unblock Full Base/L2 Certification
1. Produce a Base fault model with explicit acceptable timing delta.
2. Simulate no-inclusion and delayed-inclusion conditions near dispute expiry.
3. Decide whether current dispute window sizing is sufficient or must be widened before mainnet.
4. Attach this policy to the launch signoff package.
