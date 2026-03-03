# ARES TypeScript SDK

Minimal TypeScript client for the public ARES Protocol API.

## Quickstart

```typescript
import { AresClient } from '@ares-protocol/sdk';

const client = new AresClient({
  apiBase: 'https://ares-protocol.xyz/api'
});

const agent = await client.getAgent('0x...');
const score = await client.getScore('0x...');
const leaderboard = await client.getLeaderboard();
const actions = await client.getActions(10);
const health = await client.healthCheck();
```

## Available Methods

- `getAgent(address: string)`
- `getScore(address: string)`
- `getLeaderboard()`
- `getActions(limit?: number)`
- `healthCheck()`

## Notes

- `apiBase` should point to the public API root, for example `https://ares-protocol.xyz/api`.
- The constructor also accepts legacy `baseUrl` for backward compatibility, but `apiBase` is the preferred option.
