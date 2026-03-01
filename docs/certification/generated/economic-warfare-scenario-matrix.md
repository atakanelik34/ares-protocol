# ARES Economic Warfare Scenario Matrix

Status date: March 1, 2026  
Artifact class: Economic Simulation Pack / Workstream 3  
Status: Preliminary scenario registry, not final EV certification

## Purpose
This artifact defines the required economic attack scenarios for ARES and records their current modeling status.

This is a scenario matrix and decision scaffold.  
It is not yet a final economic-certification report because several scenarios still lack quantified EV outputs and accepted residual-risk treatment.

---

## Modeled Attacker Profiles
- `P1`: low-capital attacker (`~1 ETH` equivalent)
- `P2`: moderate-capital attacker (`~100 ETH` equivalent)
- `P3`: high-capital attacker (`~10,000 ETH` equivalent)
- `P4`: effectively unlimited flash-liquidity attacker

---

## Scenario Output Standard
Each finalized scenario must include:
- scenario ID
- attacker profile
- capital range
- dependency assumptions
- EV estimate
- repeatability
- time-to-extract
- maximal extractable damage
- mitigation status
- final verdict

Current artifact status for most rows below: qualitative/preliminary only.

---

## Scenario Matrix

| Scenario ID | Scenario | Attacker Profile | Current Risk Read | Current Mitigation Read | Current Status |
|---|---|---|---|---|---|
| ECO-01 | Dispute spam griefing against valid agents | P1-P3 | Possible if dispute opening cost is too low relative to downstream review burden | Stake-weighted challenge model and minimum challenger stake exist | Partial |
| ECO-02 | Self-recycling challenger loop | P1-P3 | Possible if same actor can repeatedly externalize little cost and recycle extracted value | Slashing and loser-cost paths exist, but full EV model not yet produced | Partial |
| ECO-03 | Slash rounding arbitrage | P1-P2 | Possible if payout math or rounding creates repeatable edge | Core design intends bounded distributions; exact EV proof missing | Partial |
| ECO-04 | Front-run or reorder around dispute finalization | P2-P4 | Depends on deadline, ordering sensitivity, and claim economics | Finalize path exists; timing-adversarial analysis missing | Partial |
| ECO-05 | Sybil agent creation to distort reputation surfaces | P1-P3 | Relevant if min stake and external credibility costs are too low | Stake-gated registry reduces trivial spam but cost curve not quantified | Partial |
| ECO-06 | Governance capture through concentrated voting power | P3-P4 | Launch-critical risk if token distribution and quorum settings permit capture; low-turnout passing threshold remains material under current settings | Governor/timelock model exists and governance capture baseline now exists; actual capture-cost analysis not complete | Blocked |
| ECO-07 | Flash-loan voting amplification | P4 | Snapshot semantics reduce post-snapshot vote injection, but same-window liquidity and concentration assumptions remain open | Post-snapshot mint/delegation resistance is now mechanically tested; final flash-loan/capture model still missing | Blocked |
| ECO-08 | Timestamp-edge exploitation on ARI or dispute windows | P2-P4 | L2 timing behavior can change deadlines or economic fairness at the edges | Chunked decay and delay assumptions exist; quantified delta bounds absent | Blocked |
| ECO-09 | MEV reordering around score/dispute transactions | P2-P4 | Relevant if reorderable actions create asymmetric settlement outcome | No quantified MEV sensitivity report yet | Blocked |
| ECO-10 | Paid API access abuse or fee-path exploitation | P1-P3 | Depends on access pricing, session controls, and bypass paths | Access-control surface exists; economic abuse model not quantified | Partial |
| ECO-11 | Adapter abuse to create cheap external reputation noise | P1-P2 | Relevant if adapter path can influence perceived trust without canonical cost | Core/adapter separation reduces canonical risk; reputational externality still needs analysis | Partial |
| ECO-12 | Validator collusion in low-quorum disputes | P2-P3 | Relevant if low participation lets coordinated stake dominate cheaply | Dispute params exist; quorum/collusion model not fully simulated | Blocked |

---

## Preliminary Read by Domain

### Better-positioned scenarios
- sybil creation is partially resisted by stake-gated registration
- owner/operator feedback abuse is partially constrained in adapter layer
- challenger-loser cost exists in dispute design

### Weakest currently modeled scenarios
- governance capture
- flash-loan voting amplification
- dispute collusion economics
- MEV reorder sensitivity
- timing-edge economic delta on Base

---

## Required Quantitative Follow-Up

### Must be produced before mainnet signoff
1. Dispute spam cost curve
2. Challenger loop EV model
3. Governance capture cost model under final token distribution
4. Flash-loan voting analysis under final token/vote architecture
5. Timing drift economic delta bound
6. MEV reorder sensitivity report
7. Low-quorum validator collusion model

### Recommended output format
Use one table per scenario with:
- assumptions
- attack sequence
- cost inputs
- reward inputs
- EV result
- repeatability
- mitigation options
- residual risk owner

---

## Current Verdict
Current economic-warfare certification verdict: `BLOCKED`

Reason:
The scenario set is now enumerated and structured, but ARES does not yet have the quantified EV outputs required to claim that no profitable exploit has been found under modeled assumptions.
