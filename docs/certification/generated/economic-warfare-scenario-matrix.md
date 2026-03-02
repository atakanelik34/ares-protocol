# ARES Economic Warfare Scenario Matrix

Status date: March 2, 2026  
Artifact class: Economic Simulation Pack / Workstream 3  
Status: quantified scenario registry with one residual blocker

## Purpose
This artifact defines the required economic attack scenarios for ARES and records their current modeling status.

This matrix is the scenario inventory. The auditor-facing quantified output now lives in:
- `docs/certification/generated/economic-warfare-report-2026-03-02.md`
- `docs/certification/generated/economic-warfare-scenarios-2026-03-02.json`

---

## Modeled Attacker Profiles
- `P1`: low-capital attacker (`~1 ETH` equivalent)
- `P2`: moderate-capital attacker (`~100 ETH` equivalent)
- `P3`: high-capital attacker (`~10,000 ETH` equivalent)
- `P4`: effectively unlimited flash-liquidity attacker

---

## Scenario Output Standard
Each finalized scenario includes:
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

---

## Current scenario matrix

| Scenario ID | Scenario | Current Status | Notes |
|---|---|---|---|
| ECO-01 | Dispute spam griefing | PASS WITH ASSUMPTIONS | bounded negative under current slash policy unless review externalities dominate |
| ECO-02 | Self-recycle challenger loop | PASS WITH ASSUMPTIONS | not shown positive on current model, but closed-form proof still absent |
| ECO-03 | Slash rounding arbitrage | PASS | dust-only under current integer math and treasury remainder routing |
| ECO-04 | Front-run or reorder around dispute finalization | PASS WITH ASSUMPTIONS | one-dispute fairness distortion remains possible at deadline edge |
| ECO-05 | Sybil agent creation | PASS WITH ASSUMPTIONS | stake gate and ARI thresholds raise cost meaningfully |
| ECO-06 | Governance capture through concentrated voting power | BLOCKED | dominant residual economic blocker |
| ECO-07 | Timestamp-edge exploitation on disputes | PASS WITH ASSUMPTIONS | bounded at deadline edge, not system-wide |
| ECO-08 | MEV reordering around disputes | PASS WITH ASSUMPTIONS | scenario-dependent, bounded by stake and outcome scope |

---

## Interpretation
ARES no longer lacks an economic scenario pack. The remaining economic blocker is concentrated on governance capture and its dependence on final launch distribution, turnout, signer quality, and audit judgment.

---

## Remaining gap
1. final governance residual-risk acceptance
2. external auditor review of the quantified economic pack
3. launch-day distribution and signer assumptions converted into final evidence
