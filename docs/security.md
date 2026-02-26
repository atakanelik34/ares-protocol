# Security Model

## Core controls
- Stake-gated registration for sybil friction.
- Authorized scorers + EIP-712 signatures.
- Score range enforcement (0..200 per dimension).
- Dispute and slashing for score integrity.

## Governance controls
- Parameter updates only through timelocked governance.
- Lambda, decay table, min stake, scorer authorization, dispute parameters are governable.

## API auth controls
- Challenge/verify signature flow for paid access.
- Single-use nonce with TTL (default 5 minutes).
- Nonce invalidation after verify.
- Optional/required on-chain `AresApiAccess.accessExpiry` verification before session token mint.
- Session expiry is clamped to on-chain access expiry when paid access is enabled.

## Dispute correction controls
- Action-level invalidation with deterministic correction.
- `validActionsCount` separated from `totalActionsCount` to prevent replayed inflation.

## Known TODOs
- External audit integration and formal verification artifacts.
- Production-ready anti-bot/captcha policy tuning.
