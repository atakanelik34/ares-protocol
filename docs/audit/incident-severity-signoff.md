# Incident Severity Signoff

Status date: March 2, 2026  
Document class: operations certification artifact

## Severity model
- `SEV-1`: launch-blocking or fund/authority compromise risk
- `SEV-2`: user-visible availability or integrity degradation requiring same-day response
- `SEV-3`: degraded non-critical functionality or partial ops failure
- `SEV-4`: minor defect or documentation/observability gap

## Operational expectations
- `SEV-1`: immediate acknowledgement, launch freeze or operational pause considered
- `SEV-2`: same-day acknowledgement and remediation path
- `SEV-3`: scheduled response with issue owner
- `SEV-4`: tracked in backlog or ops hygiene queue

## Mainnet condition
ARES should not claim operational readiness without:
- an agreed severity model
- named incident owners
- communication and escalation expectations
- evidence that monitoring routes can reach operators

## Signoff placeholders
- Operations approver: `<NAME>` / `<SIGNATURE_REF>`
- Protocol approver: `<NAME>` / `<SIGNATURE_REF>`
