# ARES Mainnet Authority Package

Status date: March 1, 2026  
Package status: Planned / execution pending

## Purpose
This package freezes the intended authority model for mainnet launch.

## Authority Principles
- protocol authority is exercised through Governor + Timelock
- multisig is not a hidden protocol super-admin
- no single EOA holds launch-critical authority after launch ceremony
- deployment coordination authority is not equivalent to protocol authority

## Chosen Mainnet Model
### Governance graph
- Governor: proposal lifecycle owner
- Timelock: execution authority for governed protocol actions
- Core contracts: admin/governance roles assigned to Timelock
- Token admin: closed by launch-day finality ceremony

### Multisig graph
- Safe threshold: `3/5`
- purpose: launch coordination, treasury/ops approvals, signer-confirmed ceremony checkpoints
- prohibition: no direct bypass path to mutate protocol state outside timelock-governor process

## Required Companion Artifacts
- `role-matrix.md`
- `signer-matrix.md`
- `signer-replacement-playbook.md`
- `compromised-signer-playbook.md`
- `launch-authority-registry.json`
