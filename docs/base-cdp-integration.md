# Base/CDP Integration Note

## Scope
This note explains how ARES connects its live Base deployment surface with Coinbase Developer Platform (CDP) operational controls.

## What Is Live Today
- Landing URL: `https://ares-protocol.xyz/`
- API base: `https://ares-protocol.xyz/api`
- Explorer: `https://app.ares-protocol.xyz/`
- Network: Base Sepolia (demo/testnet environment)

## Base Build Verification
ARES landing includes:

```html
<meta name="base:app_id" content="699e959541ea1c8768c7b035" />
```

This allows URL ownership verification in Base Build style onboarding flows.

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
- Production deploy notes: `/docs/production-deploy-gcp.md`
