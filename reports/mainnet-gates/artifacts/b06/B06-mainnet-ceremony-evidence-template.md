# B-06 Mainnet Ceremony Evidence Template

- Status: OPEN
- Network: Base Mainnet
- Ceremony date (UTC): OPEN
- Prepared from: `/Users/busecimen/Downloads/AresProtocol/reports/mainnet-gates/B06-token-tge-readiness-pack.md`

## 1) Required Transaction Fields (Must Be Filled)

| Field | Value |
|---|---|
| Token contract address | OPEN |
| Distribution/vault contract address | OPEN |
| Mint tx hash (full-supply mint) | OPEN |
| Mint tx block number | OPEN |
| Mint tx timestamp (UTC) | OPEN |
| Minter role-revoke tx hash | OPEN |
| Minter role-revoke block number | OPEN |
| Default admin role-renounce tx hash | OPEN |
| Default admin role-renounce block number | OPEN |
| Additional role-revoke tx hashes (if any) | OPEN |
| Network chainId | OPEN |
| Explorer links for all txs | OPEN |

## 2) Checksum Verification (Expected vs Actual)

Source of expected integrity anchors:
- `/Users/busecimen/Downloads/AresProtocol/docs/tokenomics-validation.json`
- `/Users/busecimen/Downloads/AresProtocol/reports/mainnet-gates/artifacts/b06/distribution-manifest-freeze-2026-03-12.sha256.txt`

### 2.1 Expected values from `docs/tokenomics-validation.json`

| Key | Expected value | Actual value at ceremony time | Match |
|---|---|---|---|
| `constantsVersion` | `2.1` | OPEN | OPEN |
| `summary.totalSupplyWei` | `1000000000000000000000000000` | OPEN | OPEN |
| `summary.tgeTargetWei` | `80000000000000000000000000` | OPEN | OPEN |
| `summary.tgeComputedWei` | `80000000000000000000000000` | OPEN | OPEN |
| `invariants.allocationSumEqualsTotalSupply` | `true` | OPEN | OPEN |
| `invariants.tgeSumEqualsTarget` | `true` | OPEN | OPEN |

### 2.2 Expected file checksums (frozen manifest)

| File | Expected checksum | Actual checksum | Match |
|---|---|---|---|
| `docs/tokenomics.constants.json` | `76dcc9a44636ffc149a2326b9787318c06852f323141fe8c63a09dc3de5ab0fd` | OPEN | OPEN |
| `docs/tokenomics-validation.json` | `469e3e7fb31923f07b943c85f1c9c6c51a122b8e2a7b4cf2004bd3247e9da2bf` | OPEN | OPEN |

Checksum command slot:

```bash
cd /Users/busecimen/Downloads/AresProtocol
shasum -a 256 docs/tokenomics.constants.json docs/tokenomics-validation.json
```

## 3) Signer Signature Reference Slots

| Signer role | Signer identity | Signature / attestation reference | Status |
|---|---|---|---|
| Atakan (primary operator) | OPEN | OPEN | OPEN |
| Secondary protocol signer (if required) | OPEN | OPEN | OPEN |
| External reviewer acknowledgment (if required) | OPEN | OPEN | OPEN |

## 4) Strict Validator Re-run

Command:

```bash
cd /Users/busecimen/Downloads/AresProtocol
PATH=/usr/local/bin:$PATH /usr/local/bin/node scripts/certification/validate-token-finality-pack.mjs \
  --strict \
  --input reports/mainnet-gates/artifacts/b06/token-finality-bundle-2026-03-12/03-token-finality-report.json
```

Expected output:
- exit code `0`
- JSON/summary includes `ok: true`
- no missing required fields

Actual run output path:
- OPEN

## 5) Pass/Fail Checklist (Fail-Closed)

- [ ] Mint tx hash filled and confirmed on Base Mainnet explorer
- [ ] Role-revoke tx hashes filled and confirmed
- [ ] Admin renounce tx hash filled and confirmed
- [ ] All required block numbers and timestamps filled
- [ ] Expected vs actual integrity table fully matched
- [ ] Signer signature references attached
- [ ] Strict validator rerun passed (`ok: true`)
- [ ] Links to raw receipts/logs attached

B-06 gate decision:
- OPEN until every checklist item above is checked and evidence-linked.
