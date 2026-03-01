# ARES Token Mint Finality Baseline

Status date: March 1, 2026  
Artifact class: Token and TGE Implementation Sync / Workstream 4 + Workstream 6 bridge  
Environment: local executable baseline

## Purpose
This artifact records the current executable proof for ARES token mint finality and explains what still remains missing before mainnet signoff.

ARES does not yet have a deployed mainnet token finality record.  
It now does have a mechanically proven mint-finality ceremony path.

---

## Evidence Used
- `contracts/token/AresToken.sol`
- `contracts/test/AresTokenGovernor.t.sol`
- `docs/token-architecture.md`
- `docs/tokenomics.md`

---

## What Is Now Mechanically Proven

### 1. Revoking `MINTER_ROLE` alone is insufficient
Local tests now prove that simply revoking the minter role from the current admin does **not** create finality, because the same default admin can re-grant the role and mint again.

Evidence:
- `testMintRoleRevocationAloneDoesNotCreateFinality`

Interpretation:
ARES now has an executable proof that partial ceremony is unsafe and must not be treated as finality.

### 2. A one-way mint-finality ceremony exists
Local tests now prove the following sequence is one-way:
1. mint final supply
2. revoke `MINTER_ROLE`
3. renounce `DEFAULT_ADMIN_ROLE`

After that sequence:
- `grantRole(MINTER_ROLE, ...)` reverts
- `mint(...)` reverts

Evidence:
- `testMintFinalityCeremonyBecomesOneWayAfterAdminRenounce`

Interpretation:
ARES can achieve structural mint finality without changing runtime token code, but only if the full ceremony is executed and evidenced at launch.

Important note:
`AresToken` does not contain an intrinsic hard-cap constant. The effective hard cap is created operationally by minting the fixed final supply and then permanently closing the mint path through the finality ceremony.

---

## What Is Still Missing

### 1. Mainnet deployment artifact set
The ceremony is proven locally, but the actual launch evidence does not yet exist.

Missing:
- final mainnet token address
- mint transaction hash
- `MINTER_ROLE` revoke transaction hash
- `DEFAULT_ADMIN_ROLE` renounce transaction hash
- final total supply proof

### 2. Canonical launch parameter file
ARES still needs the final launch-side source of truth for:
- exact minted supply
- treasury address registry
- vesting/distributor addresses, if used
- TGE role assignment table

### 3. Launch authority signoff
The final mint ceremony cannot be treated as complete until it is:
- executed
- verified
- signed off in the launch package

---

## Current Verdict
Current token mint finality verdict: `PASS WITH ASSUMPTIONS`

Assumptions:
1. Mainnet launch follows the full three-step finality ceremony.
2. No alternative admin or privileged mint path is introduced in the mainnet deployment graph.
3. Launch artifacts capture the mint, revoke, and renounce transactions.

Reason:
ARES now has executable proof that a one-way finality ceremony exists and that partial revocation is unsafe. The remaining gap is launch execution evidence, not lack of a finality mechanism.

---

## Launch Rule
Mainnet launch MUST NOT be signed off unless the launch package includes all of:
- final token address
- minted total supply
- `MINTER_ROLE` revoke proof
- `DEFAULT_ADMIN_ROLE` renounce proof
- role graph after ceremony

If any one of these is missing, token finality must be treated as unresolved.

---

## Required Next Actions
1. Create the canonical mainnet token launch parameter file.
2. Define the final treasury and vesting/distributor registry.
3. Produce a launch-day token finality report with the exact transaction proofs.
4. Link this artifact into the final signoff package.
