# Backup / Restore Drill Template

Status: draft

## Scope
- Environment: `<ENVIRONMENT>`
- Date: `<DATE>`
- Operator: `<OPERATOR>`

## Assets covered
- application config
- deploy manifests
- nginx configuration
- PM2 ecosystem configuration
- certification/audit artifacts

## Drill steps
1. capture current backup source
2. simulate loss event
3. restore on clean target
4. verify landing/docs/api/app availability
5. verify deploy manifests and runtime config integrity

## Results
- Start time: `<START_TIME>`
- End time: `<END_TIME>`
- Recovery duration: `<RECOVERY_DURATION>`
- RTO target met: `<YES_OR_NO>`
- RPO target met: `<YES_OR_NO>`

## Issues found
- `<ISSUE_1>`
- `<ISSUE_2>`

## Signoff
- Operator signature ref: `<SIGNATURE_REF>`
- Reviewer signature ref: `<SIGNATURE_REF>`
