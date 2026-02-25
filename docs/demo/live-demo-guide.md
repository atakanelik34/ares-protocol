# ARES Live Demo Guide

This guide describes the single-flow demo dataset used by the dashboard and API.

## Target dataset

- Agents: `25`
- Actions: `250`
- Disputes: `10+`
- Live feed window: latest `20` rows
- History: cursor pagination via `/v1/actions`

## Commands

Run query gateway and dashboard first, then:

```bash
npm run demo:seed:live
```

Optional continuous action stream for the live UI:

```bash
npm run demo:stream:actions
```

## API checks

- `GET /v1/leaderboard?limit=25`
- `GET /v1/actions?limit=20`
- `GET /v1/actions?limit=20&cursor=<nextCursor>`
- `GET /v1/stream/actions` (SSE)

## UI checks

- Dashboard shows `Live Feed (Top 20)`
- New action appears at the top
- Oldest row drops after 20
- `History` tab loads older pages with `Load older`
