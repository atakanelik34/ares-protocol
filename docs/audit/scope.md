# Audit Scope

## Objective
Provide an external review of the launch-critical ARES smart contract system before mainnet deployment.

## Primary review objectives
1. Validate core authority and role boundaries.
2. Review economic correctness of registry, scoring, ARI update, dispute, token, and governance flows.
3. Review ERC-8004 adapter isolation from canonical state.
4. Review upgrade, timelock, and governance mechanics for bypass or privilege escalation paths.
5. Review mint finality assumptions and launch authority closure path.
6. Review Base/L2-specific timing assumptions that affect disputes and governance.

## In scope
Primary frozen contracts are listed in `frozen-contracts.md`.

## Supplemental review material
- deployment and governance handoff scripts
- test and certification artifacts
- API / explorer / docs as derived, non-canonical surfaces

## Out of scope
- legal structure
- token distribution legality
- marketing claims
- centralized infrastructure uptime guarantees
- signer identity verification outside documented process requirements

## Review expectations
The auditor should assume:
- ARES core contracts are canonical.
- adapters and off-chain layers are derived and must not override core authority.
- current certification artifacts are evidence inputs, not final proof.
