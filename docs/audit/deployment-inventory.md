# Deployment Inventory

## Environment
- Network: Base Sepolia
- Purpose: testnet-live infrastructure and certification evidence generation

## Current deployed contracts
- `AresRegistry`: `0x8df897ed117078983d9a097ee731104b6a7b843f`
- `AresScorecardLedger`: `0xf87343a973f75a2cba9fb93616fa8331e5fff2b1`
- `AresARIEngine`: `0xc78e9bf65ab6db5f638cb4448dc5ebcb7c6e99f3`
- `AresDispute`: `0x66168715b5a760d775a9672255bd49087063613f`
- `AresApiAccess`: `0xb390966a42bf073627617cde9467c36bcecdbca2`

## Governance state
Sepolia governance has been handed off and deployer privileges are documented in the demo governance artifacts under `docs/demo/`.

## Production runtime
- Public landing: `https://ares-protocol.xyz`
- Public docs: `https://ares-protocol.xyz/docs/`
- Public API: `https://ares-protocol.xyz/api/v1/health`
- Public explorer: `https://app.ares-protocol.xyz`

## Operational note
Production runtime is cleanly rebuilt on a fresh GCP project/VM after the previously compromised environment was abandoned. Infrastructure identifiers are masked in public ops docs by design.
