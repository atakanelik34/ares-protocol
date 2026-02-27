# ARI Scoring Model

## Fixed Model (Protocol Constants)
- Dimensions: 5
- Weights: `[0.30, 0.25, 0.20, 0.15, 0.10]`
- `dimension_score` range: `0..200`
- `time_decay = exp(-lambda * days_since_action)`
- `volume_confidence = min(1, valid_actions_count / 100)`
- Final ARI range: `0..1000`

## Engine State
Per agent state:
- `decayedSum[5]`
- `lastUpdate`
- `totalActionsCount`
- `validActionsCount`
- `firstActionAt`

## Fixed-Point Decay
- Decay uses fixed-point factors (`1e18` scale).
- Precomputed decay table is used for base horizons.
- Large horizon values are handled with chunked multiplication for deterministic behavior.
- `daysSince` is saturated for DoS-safe bounds (default `10000` days).

## Update Flow
On each new valid action:
1. `sync(agent)` applies elapsed decay.
2. New score vector is added to `decayedSum`.
3. `totalActionsCount` and `validActionsCount` increment.

## Dispute Correction Flow
When a scorecard is invalidated:
1. `sync(agent)` first.
2. Calculate `daysSince` from action timestamp.
3. Compute exact decay factor with fixed-point chunked math.
4. Subtract decayed contribution from each dimension (clamp at zero).
5. Decrement `validActionsCount` only.

## Tier Mapping
- UNVERIFIED: `0-99`
- PROVISIONAL: `100-299`
- ESTABLISHED: `300-599`
- TRUSTED: `600-849`
- ELITE: `850-1000`

## Tier-Based Stake Policy Reference (Mainnet Target)
| Tier | Minimum Stake (ARES) | Unstake Delay | Default Slash |
|---|---:|---:|---:|
| PROVISIONAL | 100 | 30 days | 10% |
| ESTABLISHED | 500 | 60 days | 20% |
| TRUSTED | 2,000 | 90 days | 30% |
| ELITE | 10,000 | 180 days | 50% |

Slash distribution policy reference:
- `50%` to successful challenger(s)
- `50%` burn/treasury route (governance policy)

## Governance Parameter Note
Mainnet governance parameter set controls final staking thresholds, slash rates, and fee routes.
This document records default policy direction and testnet-aligned behavior.
