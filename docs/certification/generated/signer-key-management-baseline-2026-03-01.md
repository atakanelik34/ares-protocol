# ARES Signer and Key Management Baseline

Status date: March 1, 2026  
Artifact class: Signer / Key Management Certification appendix  
Environment: current production recovery posture and planned mainnet authority model

## Purpose
This artifact defines the minimum signer and key-management posture required before ARES can be certified for mainnet.

It is not the final signer registry.  
It is the current baseline separating required controls from still-missing launch evidence.

---

## Current Baseline

### Production operations
- clean production recovery has been completed on a new GCP project and VM
- old compromised projects were deleted
- production host secrets were rotated on the clean host
- monitoring and abuse alerting baseline exists

### Governance and launch intent
- framework requirement remains `>= 3/5` multisig
- timelock target remains `>= 48h`
- no single EOA may control launch-critical authority

---

## Required Mainnet Signer Controls

### Mandatory
1. Multisig threshold of at least `3/5`
2. Signer diversity across:
   - persons
   - devices
   - failure domains
3. Hardware-wallet backed signer keys
4. Written signer replacement workflow
5. Compromised signer playbook
6. Launch-day authority registry linking:
   - signer set
   - multisig address
   - timelock address
   - governor address

### Strong expectations
1. Signers SHOULD not all be in one geography
2. Signers SHOULD not all be controlled by one legal entity
3. Signing operations SHOULD not depend on one operational machine or one custodian

---

## What Is Currently Proven
- ARES production recovery posture exists and old compromised projects are not in the active path
- governance handoff and revoke posture exist on Sepolia
- timelock/governor route is mechanically exercised in tests

---

## What Is Still Missing
- final mainnet signer list
- signer diversity record
- hardware-wallet attestation or operational equivalent
- lost-signer rotation workflow artifact
- compromised-signer drill artifact
- launch-day authority registry and signoff

---

## Current Verdict
Current signer/key-management verdict: `BLOCKED`

Reason:
ARES now has improved operational hygiene and governance routing evidence, but it does not yet have a final mainnet signer package. Mainnet certification cannot rely on implied signer discipline.

---

## Minimum Conditions To Unblock
1. Freeze the `3/5` signer set.
2. Publish signer diversity and role separation record.
3. Confirm hardware-wallet posture.
4. Produce compromised-signer and replacement playbooks.
5. Attach signer package to final launch signoff.
