# ARES Signer Replacement Playbook

## Trigger Conditions
- lost hardware wallet
- signer departure
- signer unavailability beyond agreed operating threshold
- compromised seed/device with no active misuse yet

## Mandatory Process
1. freeze replacement request in incident log
2. notify remaining signer set
3. verify threshold safety during replacement window
4. prepare replacement proposal and Safe configuration change
5. record before/after signer matrix
6. confirm threshold remains `3/5` or stronger
7. archive replacement decision and execution hashes

## Prohibitions
- no silent seat reassignment
- no temporary threshold reduction below approved minimum
- no replacement that collapses seat independence
