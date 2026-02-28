# Governance Handoff Runbook (Sepolia -> Mainnet Readiness)

Status date: February 27, 2026

## Scope
This runbook covers authority migration from deployer EOA to Timelock/Governor flow.

It is designed for:
- Pre-mainnet rehearsal on Base Sepolia
- Final authority handoff before mainnet declaration

Rationale: handoff is an operationally sensitive step; apply deterministic scripts + explicit verification.

---

## Preconditions
- Core contracts already deployed (`deploy/contracts/addresses.base-sepolia.json`)
- `BASE_SEPOLIA_RPC_URL` configured
- `ARES_DEPLOYER_KEY` configured
- Foundry + cast installed

---

## Step 1) Deploy Governance Layer
Deploy Timelock + Governor using token address from core deployment:

```bash
./deploy/contracts/deploy-governance-sepolia.sh
```

Output:
- `contracts/latest-governance.json`
- `deploy/contracts/governance.base-sepolia.json`

Config knobs:
- `GOVERNANCE_MIN_DELAY` (default: `2 days`)
- `GOVERNANCE_OPEN_EXECUTOR` (default: `true`)
- `GOVERNANCE_KEEP_BOOTSTRAP_ROLES` (default: `false`)
- `GOVERNANCE_RENOUNCE_TIMELOCK_ADMIN` (default: `false`)

Rationale: default keeps setup reversible while still establishing Governor as proposer/canceller.

---

## Step 2) Apply Role Handoff
Run handoff against core + adapter + token roles:

```bash
./deploy/contracts/handoff-governance-sepolia.sh
```

Default policy is conservative (keeps deployer roles).
For hard handoff mode (close to mainnet):

```bash
HANDOFF_KEEP_DEPLOYER_ADMIN=false \
HANDOFF_KEEP_DEPLOYER_GOVERNANCE=false \
HANDOFF_KEEP_DEPLOYER_MINTER=false \
HANDOFF_GRANT_TIMELOCK_MINTER=true \
HANDOFF_KEEP_DEPLOYER_TIMELOCK_ADMIN=false \
HANDOFF_KEEP_DEPLOYER_TIMELOCK_PROPOSER=false \
HANDOFF_KEEP_DEPLOYER_TIMELOCK_CANCELLER=false \
./deploy/contracts/handoff-governance-sepolia.sh
```

Rationale: two-phase approach avoids accidental lockout during rehearsal while enabling strict final cutover.

---

## Step 3) Verify Governance State
Generate governance state report:

```bash
node deploy/contracts/verify-governance-state.mjs --strict
```

For strict final cutover validation:

```bash
node deploy/contracts/verify-governance-state.mjs --strict --require-deployer-revoked
```

Expected:
- Governor has Timelock proposer/canceller roles
- Timelock has admin/governance roles on managed contracts
- Token admin (and optionally minter) delegated to Timelock
- Deployer roles removed (if `--require-deployer-revoked`)

Live status (Base Sepolia, Feb 27, 2026):
- Hard handoff executed
- `docs/demo/governance-state-sepolia.json` generated
- `docs/demo/governance-state-sepolia-revoke-check.json` generated (strict revoked check passing)
- Governance proposal smoke test generated:
  - `docs/demo/governance-proposal-smoke-sepolia.json`

---

## Managed Contracts in Handoff Scope
- `AresRegistry`
- `AresARIEngine`
- `AresScorecardLedger`
- `AresDispute`
- `AresApiAccess`
- `ERC8004IdentityAdapter`
- `ERC8004ReputationAdapter`
- `ERC8004ValidationAdapter`
- `AresToken` (`DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`)

---

## Rollback & Safety Notes
- Do not revoke deployer roles until governance verification passes.
- Keep Timelock admin on deployer during rehearsal; renounce only in hard cutover.
- Archive JSON reports for each handoff run.

TODO (mainnet policy decision):
- Decide whether `EXECUTOR_ROLE` remains open (`address(0)`) or restricted.
- Decide whether `MINTER_ROLE` remains with timelock only or split with treasury module.

Rationale: these are governance-policy choices, not purely technical defaults.
