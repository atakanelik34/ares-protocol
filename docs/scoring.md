# ARI Scoring Model

## Fixed model (non-negotiable)
- Dimensions: 5
- Weights: `[0.30, 0.25, 0.20, 0.15, 0.10]`
- `dimension_score` range: `0..200`
- `time_decay = exp(-lambda * days_since_action)`
- `volume_confidence = min(1, valid_actions_count / 100)`
- Final ARI range: `0..1000`

## Engine state
Per agent:
- `decayedSum[5]`
- `lastUpdate`
- `totalActionsCount`
- `validActionsCount`
- `firstActionAt`

## Fixed-point decay implementation
- Uses 1e18 fixed-point factors.
- `precomputedDecay[d]` for base horizon.
- For large `d`, chunked exponentiation is used to avoid precision and capping errors.
- `daysSince` is saturated at `MAX_DAYS_SATURATION` (default 10000) for deterministic DoS-safe behavior.

## Update flow
On new valid action score:
1. `sync(agent)` to apply elapsed decay.
2. Add `scores[d]` to each `decayedSum[d]`.
3. Increment both `totalActionsCount` and `validActionsCount`.

## Dispute correction flow
When an action is invalidated:
1. `sync(agent)` first.
2. Compute `daysSince = floor((now - actionTimestamp) / 1 day)`.
3. Compute exact decay factor via chunked fixed-point math.
4. Subtract `scores[d] * decayFactor / 1e18` from each dimension with clamp-at-zero.
5. Decrement `validActionsCount` only.

## Normalization
- Weighted dimension aggregate stays bounded to 0..200 equivalent units.
- Apply volume confidence to suppress low-sample manipulation.
- Scale to 0..1000 and clamp.

## Tiers
- UNVERIFIED: 0-99
- PROVISIONAL: 100-299
- ESTABLISHED: 300-599
- TRUSTED: 600-849
- ELITE: 850-1000
