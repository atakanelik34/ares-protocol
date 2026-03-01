# ARES Base No-Inclusion / Delayed-Inclusion Simulation Baseline

Status date: March 1, 2026  
Artifact class: Base/L2 resilience simulation artifact

## Purpose
This artifact converts the previous delayed-inclusion narrative into a concrete, reviewable timing-behavior report.

## Evidence Used
- `contracts/test/AresDisputeL2Timing.t.sol`
- `docs/certification/generated/base-no-inclusion-scenarios-2026-03-01.json`
- `docs/certification/generated/dispute-window-decision-2026-03-01.md`

## What Is Mechanically Proven
1. A vote included before the deadline is counted.
2. A vote at the exact deadline is rejected.
3. A vote arriving after the deadline is rejected regardless of operator intent.
4. Finalization after deadline locks the outcome; delayed post-deadline voting cannot recover it.
5. A 14-day dispute window still allows successful participation after a one-day degraded-inclusion gap if inclusion resumes before expiry.

## Interpretation
ARES still cannot claim that sequencer downtime or no-inclusion never affects dispute fairness.

ARES can now claim something narrower and defensible:
- dispute timing behavior is explicit
- deadline-edge failure modes are known
- a 14-day window materially improves fairness margin
- delayed inclusion risk is bounded and operationally mitigated, not mathematically eliminated

## Launch Conclusion
For mainnet readiness, Base/L2 fairness should be described as:
- **bounded and operationally mitigated**
- **not mathematically eliminated**

## Recommended Verdict Impact
This artifact is sufficient to move Base/L2 resilience from purely blocked narrative into `PASS WITH ASSUMPTIONS`, provided the 14-day dispute window decision is retained.
