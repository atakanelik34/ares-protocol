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

## Known Open Items
- External audit round-1 is completed; independent closure attestation on deployment target is still open.
- Production anti-bot/captcha policy tuning remains open.
- Wallet-AgentID binding verification requirement documented in the integration guide and known-risks pack. On-chain enforcement exists via `operatorOf()`. Off-chain integrator responsibility is explicitly stated.
- Production webhook ingress now enforces `hmac` mode. `dual` remains only for non-production transition/testing environments.
- Historical test private key literal found in legacy commit history is attested as non-operational and forbidden for reuse in any environment; CI banned-literal guard is active.
