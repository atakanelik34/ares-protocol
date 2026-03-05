# ARES Roadmap (Execution Status)

## Current Phase

**Phase 1.7 - Security Closure + Launch Control Plane (ACTIVE)**

As of Mar 5, 2026, ARES is operating a live Base Sepolia stack with contracts, API, explorer, and certification/audit control plane, plus implemented security closure patches for the latest external audit findings.

## Milestone Status

### Completed
- Core contracts implemented and tested in Foundry
- Base Sepolia deployments executed and verified in workflow
- API Gateway (`/api/v1/*`) live under canonical path (`/api`)
- Explorer live with realtime stream + paginated history
- Demo data pipeline proved and expanded (`40 agents / 500 actions / 20 disputes`, with finalized + pending dispute mix)
- ERC-8004 adapter-driven architecture integrated at protocol level
- External audit round completed and findings captured (`EXT-001..004`)
- Security closure code batch applied (dispute hardening, webhook HMAC dual-mode, Next patch, CI critical gate)

### In Progress
- Dispute v2 live cutover rehearsal and deployment evidence pack
- Webhook auth migration (`dual` -> sender HMAC rollout -> enforced `hmac`)
- Final authority freeze package with real signer identities/Safe details
- Mainnet launch runbook closure (incident, rollback, restore-drill evidence)

### Pending (Mainnet Blockers)
- Independent closure verification signoff for remediated audit findings
- Final token/TGE parameter lock and execution proof set
- Mainnet deployment rehearsal sign-off
- Final launch approval package and mainnet committee signoff

## Phase Plan

### Phase 2 - Mainnet Readiness (next)
- Dispute/webhook cutover completion with evidence
- Authority freeze + token finality ceremony rehearsal finalization
- Mainnet deployment checklist completion and signoff assembly
- Public launch communications pack

### Phase 3 - Mainnet Activation
- Base mainnet deployment
- Token/governance activation (according to finalized policy)
- Integration onboarding wave-1

### Phase 4 - Expansion
- Higher integration throughput
- Superchain interoperability roadmap execution
- Data/network effects scaling

## Notes
- Dates are target-based and may shift based on security and ecosystem dependencies.
- Mainnet launch quality bar is security-first, not date-first.
