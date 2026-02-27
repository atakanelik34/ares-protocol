# ARES Tokenomics v2.1 (Seed Cap Locked)

This document is the canonical tokenomics reference for ARES Protocol as of February 27, 2026.

Scope note:
- Seed is locked to a **$400K cap** in this sprint.
- Strategic tranche is **out of scope** for this version.
- This sprint delivers docs/product/API alignment and deterministic arithmetic validation, not new token contract behavior.

## 1. Executive Summary
- Token: `$ARES`
- Network target: Base mainnet (post-audit/governance gate)
- Total supply: `1,000,000,000 ARES` fixed target model
- Seed model (v2.1): `80,000,000 ARES @ $0.005`, cap = `$400,000`
- TGE circulating target: `80,000,000 ARES` (`8%`)
- Seed TGE unlock: `0` (full 6-month cliff)

Reference artifacts:
- Constants: [`docs/tokenomics.constants.json`](/Users/busecimen/Downloads/AresProtocol/docs/tokenomics.constants.json)
- Validation output: [`docs/tokenomics-validation.json`](/Users/busecimen/Downloads/AresProtocol/docs/tokenomics-validation.json)

## 2. Core Principle: Fixed Supply + One-Time Mint Architecture
- Economic model assumes fixed supply at `1B ARES`.
- Mainnet architecture target is one-time mint to vault/distribution contracts, then minter revoke.
- This sprint does **not** change deployed token behavior; this is documented as a mainnet architecture note.

See also: [`docs/token-architecture.md`](/Users/busecimen/Downloads/AresProtocol/docs/token-architecture.md)

## 3. Final Allocation Table
| Category | % | Tokens |
|---|---:|---:|
| Protocol Treasury | 22% | 220,000,000 |
| Ecosystem & Developer Grants | 20% | 200,000,000 |
| Community & Airdrop | 18% | 180,000,000 |
| Team | 18% | 180,000,000 |
| Staking Rewards Pool | 8% | 80,000,000 |
| Early Investors (Seed) | 8% | 80,000,000 |
| Liquidity Reserve | 4% | 40,000,000 |
| Advisors | 2% | 20,000,000 |
| **Total** | **100%** | **1,000,000,000** |

## 4. Vesting Schedule by Category
- Protocol Treasury: governance-controlled emissions
- Ecosystem & Developer Grants: `40M` activation tranche + `160M` staged emissions
- Community & Airdrop: `12M` phase-1 TGE instant + `168M` phased/merit emissions
- Team: 1-year cliff + 4-year linear vesting
- Staking Rewards Pool: `16M` early rewards float + `64M` years 2-4 emissions
- Early Investors (Seed): 6-month cliff + 24-month linear vesting
- Liquidity Reserve: `12M` TGE + `28M` 12-month linear vesting
- Advisors: 1-year cliff + 2-year linear vesting

## 5. Revenue Distribution (Triple Engine)
Protocol revenue (API/access/registry economics) target split:
- Buyback + Burn: `25%`
- Treasury: `40%`
- Staker APY Pool: `35%`

The model is policy-bound, governance-adjustable, and implemented progressively with mainnet modules.

See: [`docs/buyback-burn-policy.md`](/Users/busecimen/Downloads/AresProtocol/docs/buyback-burn-policy.md)

## 6. Agent Staking Model (Tier-Based)
| Agent Tier | Minimum Stake (ARES) | Unstake Delay | Default Slash |
|---|---:|---:|---:|
| PROVISIONAL | 100 | 30 days | 10% |
| ESTABLISHED | 500 | 60 days | 20% |
| TRUSTED | 2,000 | 90 days | 30% |
| ELITE | 10,000 | 180 days | 50% |

Slash distribution policy default:
- `50%` to successful challenger(s)
- `50%` burn/treasury route (governance-set)

Mainnet note: exact values remain governance parameters, not immutable constants in this sprint.

## 7. Anti-Dump Policy Boundary
ARES anti-dump policy is intentionally positioned as legal/contractual policy and vesting mechanics, not generalized transfer hooks.

Mandatory phrasing:
- **contractual obligations, not on-chain transfer restrictions.**

See: [`docs/anti-dump-policy.md`](/Users/busecimen/Downloads/AresProtocol/docs/anti-dump-policy.md)

## 8. TGE Parameters (v2.1)
- Total supply model: `1,000,000,000`
- TGE circulating target: `80,000,000` (`8%`)
- Seed price: `$0.005`
- Seed cap: `$400,000`
- Seed max token amount: `80,000,000`
- Seed TGE unlock: `0`

Planned TGE composition (`80M`):
- Ecosystem activation: `40M`
- Community phase-1 instant: `12M`
- Staking early float: `16M`
- Liquidity instant tranche: `12M`

See: [`docs/tge-parameters.md`](/Users/busecimen/Downloads/AresProtocol/docs/tge-parameters.md)

## 9. Staking APY Model (Formula-Only Policy)
APY policy expression:

`APY = (monthlyProtocolRevenue * 0.35 * 12) / totalStakedARES`

Risk and disclosure:
- illustrative, revenue-dependent, non-guaranteed
- not a fixed-return promise
- governance can update payout policy ranges

## 10. Community Airdrop Criteria (Sybil-Resistant)
Phase-based framework with AgentID/accountability constraints:
- AgentID-based eligibility and activity proofs
- staking/activity thresholds
- merit-weighted participation scoring
- one-agent-one-claim semantics in claim logic design

See full criteria: [`docs/airdrop-criteria.md`](/Users/busecimen/Downloads/AresProtocol/docs/airdrop-criteria.md)

## 11. Partner Allocation Policy
Partner allocation is performance-bound, not unconditional.
- Reserved capacity can be staged by integration quality and delivered activity.
- Unused/underperforming allocations can return to community/ecosystem pools by governance policy.

## 12. Waitlist to TGE Tier Pipeline (Product Policy)
Current product-tier intent mapping:
- `tier1`: form completion, standard access review
- `tier2`: testnet agent + activity proof, priority review
- `tier3`: partner integration path, strategic review

Important:
- this is a product policy pipeline
- this sprint stores metadata in waitlist API
- no on-chain enforce in this sprint

## 13. Progressive Decentralization
Governance maturity path is tracked in:
- [`docs/governance.md`](/Users/busecimen/Downloads/AresProtocol/docs/governance.md)

Power decay note:
- planned as separate mainnet-prep module
- not implemented in this sprint

## 14. Governance Parameter Surface
Governance-owned policy parameters include:
- fee split bounds
- burn policy bounds
- staking threshold/slash bounds
- vesting execution policies
- treasury emission rules

## 15. Open Items (Mainnet-Prep, Not This Sprint)
- one-time mint + minter revoke operational execution
- vesting contract suite final implementation
- buyback execution module (TWAP/MEV-aware)
- airdrop claim contract rollout
- power decay governance extension
- final legal templates for investor/partner contractual controls

## Validation Guarantees in Repo
This sprint ships deterministic validation artifacts:
- arithmetic constants in `tokenomics.constants.json`
- reproducible report in `tokenomics-validation.json`
- CI check via `scripts/tokenomics/calc-tokenomics.mjs`
