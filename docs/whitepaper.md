# Whitepaper Alignment & Current State (v1.4)

## Scope of This Document

This file is an implementation-alignment snapshot for the repository state and live infrastructure, keeping language aligned with the project whitepaper narrative.

## Core Alignment

### Protocol Identity
- ARES is infrastructure, not an end-user app.
- Canonical authority remains in ARES core contracts.

### Agent Identity Model
- Core AgentID is canonical, stake-gated, and non-transferable.
- AgentID type is `uint256`.
- Operational wallet linking exists at core level.

### ARI Scoring Model
- ARI remains in `0..1000`.
- Dimension weights preserved as `[0.30, 0.25, 0.20, 0.15, 0.10]`.
- Time decay + volume confidence mechanics are preserved.
- Fixed-point math is used for on-chain practicality.

### Dispute Model
- Stake-weighted dispute flow exists.
- Invalidated actions are excluded from valid-action contribution.
- Correction-aware behavior is present in scoring pipeline semantics.

### ERC-8004 Positioning
- ARES uses an adapter-driven compatibility approach.
- Core does not rely on adapter ownership for authority.
- Status language remains: **published (Aug 2025), draft/proposed, gaining adoption**.

## Current Delivery Status

Live now (Base Sepolia):
- Core contracts deployed
- API Gateway live
- Explorer live
- Demo dataset continuity live

Not yet finalized for mainnet declaration:
- External audit closure
- Final governance hardening/authority lock
- Final token/TGE parameter lock

## Mainnet Readiness Delta

Required before mainnet go-live:
1. Governance handoff finalization and role freeze policy
2. Security audit + remediation closure
3. Operational runbook completion (monitoring, rollback, incident response)
4. Final launch checklist signoff

## Notes
- This document intentionally avoids unverifiable adoption claims.
- It reflects implementation state; not a replacement for the full narrative whitepaper.
