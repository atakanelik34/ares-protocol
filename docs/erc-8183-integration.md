# ERC-8183 Integration (ARES)

This document describes how ARES integrates with ERC-8183 Agentic Commerce Protocol (ACP) as a native reputation layer.

## Integration scope
- ARES core contracts are unchanged:
  - `AresRegistry`
  - `AresScorecardLedger`
  - `AresARIEngine`
  - `AresDispute`
- New add-on adapters:
  - `AresACPHook`
  - `AresACPAdapter`
  - `AresEvaluator`
- Deployment model for this phase:
  - single known ACP contract address
  - no shim implementation now
  - `IAresACPCompat` is the compatibility boundary for future ACP variants

## Contracts

### `AresACPHook`
Implements ERC-8183 `IACPHook`:
- `beforeAction(jobId, selector, data)`
- `afterAction(jobId, selector, data)`

Security and execution model:
- `onlyACP` enforced with immutable ACP address.
- `ReentrancyGuard` on hook entry points.
- ARES external calls are wrapped in fail-open try/catch paths, except explicit policy violations.

Policy behavior:
- `beforeAction` on `fund`:
  - reads provider from ACP
  - resolves provider -> AgentID
  - reads ARI score
  - reverts with `InsufficientReputation(agentId, score, minRequired)` only when a confirmed score is below threshold
  - on lookup failures, emits diagnostics and allows flow (fail-open)
- `beforeAction` on `setProvider`:
  - optional registration enforcement (`enforceRegisteredProviderOnSetProvider`)
  - if enabled and provider is confirmed unregistered, reverts
  - if lookup infra fails, bypasses (fail-open)
- `beforeAction` on `reject`:
  - snapshots pre-reject state (`Funded` vs `Submitted`) by `jobId`

Outcome recording:
- `afterAction` on `submit`: writes neutral activity profile
- `afterAction` on `complete`: writes positive task-execution profile
- `afterAction` on `reject`:
  - uses pre-reject snapshot for classification
  - `Submitted -> RejectedAfterSubmit` profile
  - `Funded -> RejectedBeforeSubmit` profile
  - snapshot is cleared after use
  - if snapshot is missing, falls back to mild profile and emits `RejectSnapshotMissing`

### Score payload transport (`optParams`)
For `submit`, `complete`, and `reject`, ARES score write payload is carried in ACP `optParams`:

```solidity
struct ScorePayload {
  bytes32 actionId;
  uint64 timestamp;
  bytes scorerSignature;
}
```

Hook logic:
- decodes `ScorePayload` from `optParams`
- selects score vector from governance-settable outcome profiles
- writes to `AresScorecardLedger.recordActionScore(...)`

Signature note:
- `scorerSignature` must match ARES EIP-712 `ActionScore` domain and profile-selected scores.

### `AresACPAdapter`
Read-only adapter:
- `getAgentScore(address wallet) -> (uint256 ariScore, bool isRegistered)`
- `meetsReputationThreshold(address wallet, uint256 minScore) -> bool`
- `getAgentId(address wallet) -> uint256`

### `AresEvaluator`
On-chain evaluator for ACP resolution:
- authorized oracle addresses can call:
  - `resolveComplete(jobId, reason, optParams)`
  - `resolveReject(jobId, reason, optParams)`
- per-oracle rate limiting:
  - `maxResolutionsPerOraclePerBlock` (default `1`, governance-settable)
  - limits blast radius for oracle-key compromise in a single block

## Trust boundaries
- ACP remains source of truth for job lifecycle.
- ARES remains source of truth for identity and ARI scoring.
- Hook is policy and recording bridge; it does not own ACP escrow state.
- `claimRefund` remains ACP-level safety path (non-hookable in ERC-8183 spec).

## Operational assumptions
- Initial production target is one ACP deployment that is ABI-compatible with `IAresACPCompat`.
- If a second ACP variant is introduced, add a shim that implements `IAresACPCompat`; do not change `AresACPHook` logic.
