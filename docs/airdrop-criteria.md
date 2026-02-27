# ARES Community Airdrop Criteria (v2.1)

This document defines eligibility and emission logic for the `Community & Airdrop` allocation bucket (`180,000,000 ARES`).

## Design Goals
- reward measurable, verifiable contribution
- reduce Sybil attack surface
- align emissions with agent reputation quality

## Phase 1: Verified Agents (`60,000,000`)
Eligibility baseline:
- registered AgentID
- minimum effective stake threshold
- minimum on-chain action count
- one-agent-one-claim semantics

Emission profile:
- `12,000,000` immediate phase-1 unlock at TGE
- remaining phase-1 allocation vests linearly

## Phase 2: Protocol Participants (`60,000,000`)
Signal inputs:
- dispute participation quality
- validator/challenger contribution
- reliability and action quality consistency

Emission profile:
- staged, score-weighted emissions
- delayed unlock to discourage short-term farming

## Phase 3: Partner Ecosystem (`60,000,000`)
Allocation model:
- reserved by approved integration path
- released by measured delivery KPIs (usage/activity thresholds)
- unused reserve can be re-routed by governance

## Sybil Controls
- AgentID-backed identity gate
- minimum activity thresholds
- deterministic claim accounting
- anti-duplication checks at claim layer

## Governance Notes
All thresholds and scoring weights are governance-owned parameters.
This document defines policy intent, not immutable on-chain constants.
