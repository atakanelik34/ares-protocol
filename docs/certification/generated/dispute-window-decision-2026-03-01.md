# ARES Dispute Window Decision Record

Status date: March 1, 2026  
Artifact class: Base/L2 dispute-fairness decision  
Decision status: Accepted for mainnet readiness planning

## Purpose
This artifact freezes the target dispute voting window for mainnet launch planning.

## Current Testnet Baseline
Current deployment/default baseline has used shorter dispute windows for testnet and demo practicality.

## Accepted Mainnet Target
Mainnet readiness target:
- `AresDispute.votingPeriod = 14 days`

## Why 14 Days
A 14-day window is accepted because it:
- leaves meaningful room for participation even if inclusion degrades for hours or a day
- gives operations time to detect and communicate degraded sequencing conditions
- avoids the optics and fairness risk of extremely tight dispute windows on an L2

## What This Does Not Claim
A 14-day dispute window does **not** mathematically eliminate all fairness issues under censorship, no-inclusion, or sequencer outage.

It is accepted because it is:
- operationally defensible
- materially safer than a short window
- compatible with a conservative launch posture

## Launch Rule
Mainnet dispute configuration must not be signed off below `14 days` unless a stricter fault model and fairness analysis justifies a smaller window.
