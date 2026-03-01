# ARES Compromised Signer Playbook

## Trigger Conditions
- signer device compromise suspected
- unauthorized signing attempt observed
- seed phrase exposure suspected
- coercion or custody loss scenario reported

## Immediate Actions
1. suspend use of affected signer immediately
2. notify remaining signers and ops lead
3. assess whether quorum safety remains intact
4. if needed, freeze launch or high-risk ceremony actions
5. rotate signer through approved replacement workflow
6. document affected authority surfaces and exposure window

## Launch Rule
If compromise affects launch-critical authority and the replacement workflow is not complete, mainnet launch must remain blocked.
