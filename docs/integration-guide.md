# Integration Guide

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

Paid API auth:
```bash
GET /v1/auth/challenge?account=0xYourAccount
POST /v1/auth/verify
GET /v1/access/0xYourAccount
```

Production note:
- Set `ACCESS_CHECK_MODE=required`
- Set `ARES_API_ACCESS_ADDRESS` and `BASE_SEPOLIA_RPC_URL` (or `BASE_RPC_URL`)
- Nonce is single-use and expires in 5 minutes by default.

Example response:
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

Waitlist payload (backward-compatible):
```json
{
  "email": "team@example.com",
  "lang": "en",
  "source": "landing",
  "tier_intent": "tier2",
  "has_testnet_agent": true,
  "partner_ref": "base-batches"
}
```

Actions/history response:
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

## Security: Always Verify Wallet-AgentID Binding

### Mandatory check
Before trusting an AgentID in any on-chain integration, verify that the wallet starting the transaction is actually bound to that AgentID.

```solidity
require(
  aresRegistry.operatorOf(agentId) == msg.sender,
  "Wallet not bound to this AgentID"
);
```

### Why this is critical
- ARI belongs to the AgentID, not to an arbitrary wallet.
- A high-scoring AgentID cannot be safely reused through a different wallet if this check is enforced.
- If this check is skipped, an attacker can present a strong ARI and still execute from an unbound wallet.

### Anti-pattern (incorrect)
```javascript
// WRONG — trusts score only and never verifies the wallet-AgentID binding
const agent = await api.getAgent(claimedWallet);
if (agent.ari > 500) { proceed(); }
```

### Correct pattern
```solidity
// CORRECT — verifies both binding and score
address operator = aresRegistry.operatorOf(agentId);
require(operator == msg.sender, "Not your AgentID");

uint256 ari = ares.getScore(msg.sender);
require(ari >= MIN_ARI_THRESHOLD, "ARI too low");
```

### For off-chain integrations
API consumers must verify the wallet-AgentID relationship before relying on ARI:
1. If the flow starts from a wallet, call `GET /api/v1/agent/:agentAddress` using the wallet that will actually transact.
2. Compare the returned `operator` field with the wallet that will sign or submit the action.
3. If the flow starts from an AgentID, resolve the operator first with an RPC read to `operatorOf(agentId)`.
4. Reject on mismatch before evaluating ARI.

### Security note
This check is not automatically enforced for off-chain consumers. It is the integrator's responsibility. Skipping it invalidates the trust assumptions behind ARI.

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

## ERC-8004 compatibility note
ARES provides ERC-8004 compatibility via spec-accurate adapters. Core contracts remain the canonical trust engine.
