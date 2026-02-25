# Entegrasyon Kılavuzu

## Solidity (core interface)
```solidity
IAresProtocol ares = IAresProtocol(ARES_PROTOCOL_ADDRESS);
(uint256 ari,, uint32 actions,,) = ares.getARIDetails(agent);
require(ari >= 600, "insufficient trust");
```

## REST
```bash
GET /v1/score/0xAgentWallet
GET /v1/agent/0xAgentWallet
GET /v1/leaderboard?limit=25&tier=TRUSTED&hasDispute=true&actionBucket=50+
GET /v1/actions?agent=0xAgentWallet&limit=20&cursor=123
GET /v1/stream/actions?agent=0xAgentWallet
```

Ücretli API auth:
```bash
GET /v1/auth/challenge?account=0xYourAccount
POST /v1/auth/verify
GET /v1/access/0xYourAccount
```

Production notu:
- `ACCESS_CHECK_MODE=required` kullanın.
- `ARES_API_ACCESS_ADDRESS` ve `BASE_SEPOLIA_RPC_URL` (veya `BASE_RPC_URL`) tanımlayın.
- Nonce tek kullanımlıktır ve varsayılan 5 dakikada sona erer.

Örnek yanıt:
```json
{
  "agentId": "123",
  "agentIdHex": "0x7b",
  "ari": 847,
  "tier": "TRUSTED",
  "actions": 1203,
  "since": "2026-07-01T00:00:00.000Z"
}
```

Actions/history yanıtı:
```json
{
  "items": [
    {
      "address": "0xabc...",
      "agentId": "12",
      "agentIdHex": "0xc",
      "actionId": "0xdef...",
      "scores": [120, 118, 115, 109, 101],
      "status": "VALID",
      "timestamp": "2026-02-25T14:00:00.000Z",
      "seq": 250,
      "ari": 612,
      "tier": "TRUSTED",
      "actionsCount": 58,
      "isDisputed": false
    }
  ],
  "nextCursor": "231"
}
```

## TypeScript SDK
```ts
const client = new AresClient({ baseUrl: "http://localhost:3001" });
const score = await client.getScore("0xabc...");
```

## Python SDK
```python
from ares_sdk import AresClient
client = AresClient("http://localhost:3001")
score = client.get_score("0xabc...")
print(score.ari)
```

## ERC-8004 uyumluluk notu
ARES, ERC-8004 uyumluluğunu spec-accurate adapter'lar üzerinden sağlar. Canonical trust engine her zaman core kontratlardır.
