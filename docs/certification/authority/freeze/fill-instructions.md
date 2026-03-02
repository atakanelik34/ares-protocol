# Authority Freeze Fill Instructions

Status date: March 2, 2026  
Purpose: make the authority-freeze bundle fill-ready for real launch owners

## Files and ownership
### `01-authority-freeze-record.json`
Filled by:
- protocol owner / launch coordinator

Required before pre-launch freeze:
- Safe address
- all 5 seat labels
- signer names
- signer wallet addresses
- hardware-wallet flags
- governor address
- timelock address

Required on launch day:
- final approver signature references

### `02-launch-authority-registry.json`
Filled by:
- protocol owner / launch coordinator
- reviewed by protocol/security lead

Required before pre-launch freeze:
- Safe address
- full 5-seat map
- governor/timelock addresses
- governanceGraph fields

### `03-signer-attestation.md`
Filled by:
- each signer individually

Required before pre-launch freeze:
- legal/display name
- seat
- signer address
- hardware-wallet acknowledgement
- compromise-response acknowledgement
- replacement-policy acknowledgement

### `04-launch-committee-approval.md`
Filled by:
- launch committee / founders / protocol-security lead

Required before launch:
- release scope acknowledgement
- approval statements
- explicit references to attached evidence
- approval signatures or signature references

## Validation rules
Draft mode allows placeholders.
Strict mode requires:
- no placeholders
- unique seat addresses
- 5 total seats
- `3/5` threshold
- no conflicting signer-role assignments

## Practical sequence
1. Generate a draft bundle.
2. Fill Safe, governor, and timelock addresses.
3. Fill real signer identity and address fields.
4. Collect signer attestations.
5. Collect launch committee approvals.
6. Run strict validation.
7. Attach the strict-valid bundle to launch signoff.
