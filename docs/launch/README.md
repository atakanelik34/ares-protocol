# ARES Launch-Day Support Pack

This directory is the launch-operator entrypoint for mainnet day.

It is intentionally separate from:
- `docs/audit/` for the external reviewer
- `docs/certification/` for control-plane status
- `docs/rehearsal/mainnet/` for pre-launch rehearsal

## Directory contents
- `launch-day-checklist.md`: launch gating checklist
- `launch-day-address-registry.template.json`: canonical address registry for launch day
- `launch-day-smoke-checks.md`: immediate post-launch checks
- `launch-day-communications.md`: communications sequence and evidence publication order

## Dependency order
Launch-day execution assumes all of the following already exist:
1. external audit closeout
2. signer freeze strict-valid bundle
3. token finality strict-valid bundle
4. governance residual-risk signoff
5. mainnet rehearsal closure
