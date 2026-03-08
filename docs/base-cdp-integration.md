# Base/CDP Integration Note

## Scope
This note explains how ARES connects its live Base deployment surface with Coinbase Developer Platform (CDP) operational controls.

## What Is Live Today
- Landing URL: `https://ares-protocol.xyz/`
- API base: `https://ares-protocol.xyz/api`
- Explorer: `https://app.ares-protocol.xyz/`
- Network: Base Sepolia (demo/testnet environment)

## Base Runtime Verification
ARES runtime surfaces are monitored and publicly reachable:
- Landing: `https://ares-protocol.xyz/`
- Explorer: `https://app.ares-protocol.xyz/`
- API health: `https://ares-protocol.xyz/api/v1/health`

## CDP Operations Alignment
- API key lifecycle and project-level controls are handled via CDP project management.
- Billing visibility and team access controls are organized in the same workspace.
- These controls are an ops layer; they do not change ARES on-chain authority model.

## Security Boundary
- Core protocol authority remains on-chain (governance/timelock/contracts).
- Adapter ownership or web ownership never overrides canonical core registry authority.
- Mainnet launch remains gated by audit closure, governance readiness, and runbook sign-off.

## Related Links
- Integration guide: `/docs/integration-guide.md`
- Security model: `/docs/security.md`
- Production runtime and deploy procedures are maintained in private operational repositories.
