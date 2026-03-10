# ARES Architecture

ARES is an infrastructure primitive on Base for agent identity, scoring, and trust decisions.

## Core vs adapter split
- ARES core contracts implement protocol-native logic: stake-gated non-transferable AgentID, scorecards, ARI, disputes, and governance.
- ERC-8004 interoperability is exposed via **spec-accurate adapters**.
- Adapter ownership never overrides core authority.

## Core modules
- `AresRegistry`: canonical `uint256` agent IDs, non-transferable, operator accountability, multi-wallet links.
- `AresScorecardLedger`: source-of-truth action scores across 5 dimensions (0..200 each).
- `AresARIEngine`: ARI computation (0..1000) with fixed-point decay and volume confidence.
- `AresDispute`: stake-weighted challenge and correction flow.
- `AresApiAccess`: optional paid API access extension.

## ERC-8004 adapter modules
- `ERC8004IdentityAdapter`
- `ERC8004ReputationAdapter`
- `ERC8004ValidationAdapter`

These adapters implement ERC-8004 interface shape for discovery/integration. Core state remains authoritative.

## ERC-8183 adapter modules
- `AresACPHook`
- `AresACPAdapter`
- `AresEvaluator`

These adapters integrate ARES with ERC-8183 ACP jobs:
- `AresACPHook` enforces reputation-aware policy at hook points and records outcome signals into `AresScorecardLedger`.
- `AresACPAdapter` exposes read-only ARI and registration checks for ACP/integrator use.
- `AresEvaluator` allows authorized ARES oracles to resolve jobs on ACP with per-oracle per-block rate limits.

Current boundary:
- One known ACP deployment is targeted directly (immutable ACP address in hook/evaluator).
- No ACP shim is deployed in this phase.
- `IAresACPCompat` is the abstraction boundary for future ACP variants.

Trust-boundary notes:
- ACP remains escrow/job-state authority.
- ARES remains identity/reputation authority.
- Hook failures are fail-open for ARES lookup paths unless explicit policy violation is confirmed (e.g., low ARI gate).

## Authority contract
- Core authority = `AresRegistry.operatorOf(agentId)` + staked state.
- Adapter transfer is discovery metadata only.
- `isDesynced(adapterAgentId)` surfaces mismatch between adapter owner and core operator.

## ERC-8004 status language
ERC-8004 was published in August 2025 and is currently in draft/proposed status, gaining adoption.
