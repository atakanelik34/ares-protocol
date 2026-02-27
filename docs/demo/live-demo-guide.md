# ARES Live Demo Guide

This guide describes the single-flow demo dataset used by the dashboard and API.

## Target dataset

- Agents: `40`
- Actions: `500`
- Disputes: `20` (`18 finalized`, `2 pending`)
- Live feed window: latest `20` rows
- History: cursor pagination via `/v1/actions`

## Commands

Run query gateway and dashboard first, then execute the Base Sepolia enhancement script:

```bash
node scripts/demo/enhance-demo-dataset.mjs
```

Optional continuous action stream for the live UI:

```bash
npm run demo:stream:actions
```

Governance smoke proof (live proposal on Base Sepolia):

```bash
npm run deploy:governance:proposal-smoke
```

Produces:
- `docs/demo/governance-proposal-smoke-sepolia.json`

## API checks

- `GET /v1/leaderboard?limit=100`
- `GET /v1/actions?limit=20`
- `GET /v1/actions?limit=20&cursor=<nextCursor>`
- `GET /v1/stream/actions` (SSE)
- `GET /v1/score/0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5` (Agent A)
- `GET /v1/score/0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8` (Agent B)
- `GET /v1/score/0xf9a6c2029fcdf0371b243d19621da51f9335366d` (Agent C)

## UI checks

- Dashboard shows `Live Feed (Top 20)`
- New action appears at the top
- Oldest row drops after 20
- `History` tab loads older pages with `Load older`
