# ARES Dispute Economics Remediation Note (March 10, 2026)

## Purpose
This note links Medium finding `M-01` remediation to updated conservative dispute parameters and quantifies the expected cost increase for ARI-manipulation campaigns.

Reference baseline:
- `reports/ARES_FULL_AUDIT_2026-03-10.md` (Phase 5 simulation)
- baseline parameters: `10 / 5 / 1 / 3d / 1000bps`
- baseline minimum concurrent capital per dispute: `15 ARES`

Target conservative profile:
- `minChallengerStake = 1000 ARES`
- `minValidatorStake = 500 ARES`
- `quorum = 2500 ARES`
- `votingPeriod = 14 days`
- `slashingBps = 2000`
- governance artifact: `deploy/contracts/remediation-conservative-payloads.base-sepolia.json`

## Break-even Uplift (ARI -100 campaign)
Audit baseline estimated that a typical target needed `6..21` accepted disputes for an approximately `-100` ARI move.

Using the same dispute-count envelope:

- Baseline parallel capital:
  - `6 * 15 = 90 ARES`
  - `21 * 15 = 315 ARES`
- Conservative profile parallel capital:
  - `6 * 1500 = 9,000 ARES`
  - `21 * 1500 = 31,500 ARES`
- Capital uplift factor: `100x`

Sequential campaign timing impact:
- Baseline (`3d` window): `18..63 days`
- Conservative profile (`14d` window): `84..294 days`
- Time uplift factor: `~4.67x`

## Interpretation
- The campaign remains theoretically possible, but required capital and time rise materially.
- This closes immediate low-cost manipulation posture and reclassifies M-01 from "economically practical now" to "requires materially larger adversarial budget after parameter uplift."
- Final closure requires live on-chain execution proof of the conservative payload and a post-change rerun of the economic simulation.
