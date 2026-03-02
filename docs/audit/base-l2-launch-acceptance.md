# Base / L2 Launch Acceptance

Status date: March 2, 2026  
Document class: auditor-facing L2 launch acceptance artifact  
Launch status: assumptions bounded, signoff pending

## Launch posture
ARES launch planning assumes Base as the initial production network.
L2 fairness is treated as bounded and operationally mitigated, not mathematically eliminated.

## Accepted assumptions
1. Disputes can be affected by delayed inclusion near deadline.
2. Votes that never land before deadline are not counted.
3. Finalization after deadline locks the outcome and late inclusion cannot reopen it.
4. A 14-day dispute voting window materially improves fairness relative to shorter windows.
5. Launch communications and protocol docs must not overstate L2 immunity.

## No-inclusion behavior
If no inclusion occurs in the final dispute window:
- the current onchain deadline remains authoritative;
- unlanded votes are ignored;
- the protocol does not attempt retroactive inclusion semantics;
- fairness mitigation is achieved by longer voting windows and operational response, not by rewriting chain finality.

## Acceptable timing delta
ARES accepts timing-edge variance only under the following launch assumptions:
- ARI score changes remain bounded under fixed-point daily decay;
- dispute fairness risk is operationally mitigated via a 14-day voting period;
- governance and docs explicitly state that delayed inclusion can affect edge outcomes.

## Sequencer outage policy
If Base experiences sequencer degradation or no-inclusion conditions that materially affect dispute fairness:
1. new launch-critical governance or sensitive dispute operations should pause operationally;
2. incident communications should be published;
3. dispute-window fairness impact should be reviewed before declaring the affected period closed.

## Auditor focus
The external auditor should evaluate whether:
- the 14-day dispute window is sufficient for the intended threat model;
- there are any hidden assumptions in deadline/finalize behavior;
- any additional launch-day warning or pause policy should be required.

## Mainnet signoff condition
This artifact is complete only when a launch approver explicitly accepts the Base/L2 delayed-inclusion policy as part of the final signoff package.
