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

## Authority contract
- Core authority = `AresRegistry.operatorOf(agentId)` + staked state.
- Adapter transfer is discovery metadata only.
- `isDesynced(adapterAgentId)` surfaces mismatch between adapter owner and core operator.

## ERC-8004 status language
ERC-8004 was published in August 2025 and is currently in draft/proposed status, gaining adoption.
