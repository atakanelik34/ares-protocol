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
GET /v1/tokenomics/summary
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

Waitlist payload (geriye uyumlu):
```json
{
  "email": "team@example.com",
  "lang": "tr",
  "source": "landing",
  "tier_intent": "tier2",
  "has_testnet_agent": true,
  "partner_ref": "base-batches"
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

## Güvenlik: Her Zaman Wallet-AgentID Bağını Doğrulayın

### Zorunlu kontrol
Her on-chain entegrasyonda, AgentID'ye güvenmeden önce işlemi başlatan cüzdanın gerçekten o AgentID'ye bağlı olduğunu doğrulayın.

```solidity
require(
  aresRegistry.operatorOf(agentId) == msg.sender,
  "Wallet not bound to this AgentID"
);
```

### Neden kritik
- ARI skoru cüzdana değil, AgentID'ye aittir.
- Bu kontrol uygulanıyorsa yüksek skorlu bir AgentID farklı bir cüzdan üzerinden güvenli biçimde kullanılamaz.
- Bu kontrol atlanırsa saldırgan güçlü bir ARI'yi referans gösterip bağlı olmayan bir cüzdanla işlem yapabilir.

### Anti-pattern (yanlış kullanım)
```javascript
// YANLIŞ — sadece skora bakıyor, wallet-AgentID bağını doğrulamıyor
const agent = await api.getAgent(claimedWallet);
if (agent.ari > 500) { proceed(); }
```

### Correct pattern (doğru kullanım)
```solidity
// DOĞRU — hem binding hem skor kontrol ediliyor
address operator = aresRegistry.operatorOf(agentId);
require(operator == msg.sender, "Not your AgentID");

uint256 ari = ares.getScore(msg.sender);
require(ari >= MIN_ARI_THRESHOLD, "ARI too low");
```

### Off-chain entegrasyonlar için
API kullanan entegratörler ARI'ye güvenmeden önce wallet-AgentID ilişkisini doğrulamalıdır:
1. Akış cüzdanla başlıyorsa, gerçekten işlem yapacak cüzdan için `GET /api/v1/agent/:agentAddress` çağrısını yapın.
2. Dönen `operator` alanını işlemi imzalayacak veya gönderecek wallet ile karşılaştırın.
3. Akış AgentID ile başlıyorsa, önce RPC üzerinden `operatorOf(agentId)` ile operatörü çözün.
4. Eşleşme yoksa ARI'ye bakmadan reddedin.

### Güvenlik notu
Bu kontrol off-chain tüketiciler için otomatik uygulanmaz. Sorumluluk entegratördedir. Bu adımı atlamak ARI güven modelinin varsayımlarını bozar.

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
