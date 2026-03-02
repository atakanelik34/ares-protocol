# Token Finality Rehearsal Runbook

## Objective
Rehearse the exact artifact path required to prove ARES token mint finality on mainnet.

This is not a live mint ceremony.
It is a packaging and evidence rehearsal.

## Inputs
- canonical templates in `docs/certification/templates/`
- final signer/authority plan from `docs/certification/authority/`
- token topology assumption: single-vault genesis mint

## Rehearsal sequence
1. Generate a rehearsal bundle with `init-token-finality-rehearsal.mjs`.
2. Review the generated `README.md` and confirm the bundle names map to launch-day responsibilities.
3. Fill the bundle with rehearsal values or placeholders that reflect the intended mainnet topology.
4. Validate the bundle in draft mode.
5. Review every required field that still depends on launch-day execution:
   - token address
   - vault address
   - mint tx hash
   - minter revoke tx hash
   - admin renounce tx hash
   - final role graph
   - signer approvals
6. Convert unresolved fields into launch-day owners/actions.
7. Record any ambiguity that would block a same-day ceremony.

## Draft vs strict validation
- Draft mode allows placeholders but ensures structure and field presence.
- Strict mode is the launch-day mode and rejects unresolved placeholders.

## Launch-day success condition
The pack is rehearsal-complete when the only remaining unknowns are actual launch-day tx hashes, live contract addresses, and signer signatures.

## Failure modes
- bundle generated but missing files
- inconsistent authority references across JSON/Markdown artifacts
- finality sequence documented in one file but omitted in another
- unresolved ownership ambiguity between timelock, vault, treasury, and multisig
- placeholders still present when running strict mode
