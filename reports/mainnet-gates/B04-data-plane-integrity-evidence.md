# B-04 Data-Plane Integrity Evidence (Base Sepolia + API/Subgraph/Explorer)

Generated: 2026-03-10

Raw artifact:
- `reports/mainnet-gates/B04-data-plane-integrity-raw.json`

## Scope
- Validate API/subgraph/explorer consistency for the same top agent set.
- Close subgraph deployment failure.
- Add and verify canonical `/v1/scores` and `/v1/disputes` routes.
- Verify `NO_QUORUM` semantic output on disputes feed.

## 1) Subgraph deployment error: fixed
Previous error (`deployment ... does not exist`) is resolved.

Current endpoint:
- `https://api.studio.thegraph.com/query/1743050/ares-protocol/version/latest`

Current status:
- HTTP `200`
- `_meta.hasIndexingErrors = false`
- `_meta.block.number = 38676843` at capture time

Deploy proof:
- Studio deploy completed for version label `v0.1.0-sepolia-20260310-fix`.

## 2) Cross-source consistency (same agent set)
Compared top 5 agents from:
- live API: `GET https://ares-protocol.xyz/api/v1/agents?limit=5`
- subgraph: `agents(first:5, orderBy:ari, orderDirection:desc)`

Result:
- address/order/agentId/ari/tier/actions: **exact match** (`match = true`)

Explorer check:
- `https://app.ares-protocol.xyz/?tab=leaderboard` responds `200`
- explorer bundle still references API-backed pathing (`containsAresApiBase = true`)

## 3) `/v1/scores` and `/v1/disputes` route remediation
### Code-level remediation
Added in query-gateway:
- `GET /v1/scores`
- `GET /v1/disputes`

Validation:
- local gateway smoke returns `200` for both routes
- automated tests include:
  - `scores endpoint mirrors leaderboard score fields`
  - dispute feed semantic check with `NO_QUORUM`

### Live production status after rollout (PASS)
Rollout timestamp (UTC):
- `2026-03-10T06:45:29Z`

Deployment target:
- GCP VM (`ares-vm-01`) with PM2 reload (`ares-api`, `ares-app` online)

Endpoint verification:
- `GET https://ares-protocol.xyz/api/v1/scores?limit=5` -> `200`
- `GET https://ares-protocol.xyz/api/v1/disputes?limit=5` -> `200`

Response evidence (sample):
- `/v1/scores` first item:
  - `address=0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5`
  - `agentId=4`
  - `ari=881`
  - `tier=ELITE`
- `/v1/disputes` first item:
  - `disputeId=18`
  - `resolution=1`
  - `resolutionLabel=REJECTED`

## 4) `NO_QUORUM` semantics
Local gateway ingestion rehearsal with `DisputeResolved(resolution=0)`:
- `GET /v1/disputes?agent=<agent>` returns:
  - `resolution = 0`
  - `resolutionLabel = NO_QUORUM`
  - `accepted = false`

This closes the semantic mapping bug (`NO_QUORUM` vs `REJECTED`) at API implementation level.

## 5) Demo/sandbox isolation
Config posture remains restrictive:
- `ALLOW_UNAUTH_SEED=false` in production config path
- `ACCESS_CHECK_MODE=required`
- `ENABLE_INTERNAL_DEMO=false` guidance in `.env.example`

## B-04 gate status
- Subgraph deployment availability: **PASS**
- API/subgraph top-5 consistency: **PASS**
- `NO_QUORUM` API semantic mapping (implementation): **PASS**
- Public production availability of `/v1/scores` and `/v1/disputes`: **PASS**

Conclusion:
- B-04 is fully closed.
- API routes, subgraph availability, and cross-surface consistency are all verified with live production evidence.
