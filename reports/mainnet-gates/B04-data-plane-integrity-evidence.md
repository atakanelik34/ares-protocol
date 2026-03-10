# B-04 Data-Plane Integrity Evidence (Base Sepolia + Public API Surface)

Generated: 2026-03-10

Raw artifacts:
- `reports/mainnet-gates/B04-data-plane-integrity-raw.json`
- `reports/mainnet-gates/B04-no-quorum-onchain-rehearsal.json`

## Scope
- Query live public API for agent/score/dispute-relevant surfaces.
- Query subgraph endpoint configured in gateway runtime config.
- Probe explorer surface and validate data-source boundary.
- Validate `NO_QUORUM` semantics with on-chain rehearsal and check API representation.
- Check demo/sandbox isolation signals from runtime config.

## 1) Live API checks

Base URL: `https://ares-protocol.xyz/api`

Results:
- `GET /v1/health` -> `200`
- `GET /v1/agents?limit=5` -> `200`
- `GET /v1/leaderboard?limit=5` -> `200`
- `GET /v1/scores?limit=5` -> `404` (route not found)
- `GET /v1/disputes?limit=5` -> `404` (route not found)

Interpretation:
- The live API currently exposes score/dispute data through:
  - `GET /v1/score/:agentAddress`
  - `GET /v1/agent/:agentAddress` (contains `disputes[]` block)
- It does **not** expose the exact route pair requested in B-04 (`/v1/scores`, `/v1/disputes`) on current production surface.

## 2) API internal consistency (same agent set)

Compared top 5 agents from `/v1/agents` vs `/v1/leaderboard`:
- Agent order consistency: **true**
- Per-agent `ari`, `tier`, `agentId` consistency via `/v1/score/:address`: **true for all 5/5**

Conclusion:
- Public API internal consistency across leaderboard and score endpoints is currently **good** for sampled set.

## 3) Subgraph consistency check

Configured subgraph endpoint probe:
- `https://api.studio.thegraph.com/query/1743050/ares-protocol/version/latest`

GraphQL result:
- HTTP status `200`, but response error:
  - `deployment ... does not exist`

Conclusion:
- Production-configured subgraph endpoint is not currently serving a valid deployment for this slug/version.
- Cross-surface consistency against subgraph cannot be marked pass under this config.

## 4) Explorer surface check

Explorer URL:
- `https://app.ares-protocol.xyz/` -> `200`

Observed:
- Explorer HTML and loaded JS chunks contain API route/base literals (`/api/v1/*` and API base references).
- Explorer appears to consume the same query-gateway data plane rather than an independent backend surface.

Conclusion:
- Explorer/data-plane boundary is consistent with a shared API backend model.

## 5) `NO_QUORUM` semantics check

### On-chain rehearsal evidence
Rehearsal dispute contract:
- `0xbe8ceddf63626f5a3d817c06dbf8e28d00293214`

No-quorum finalize tx:
- `0xcde759f825c2bc1f58690db1eba50dad8ccdebce4d0b380ab2dbfa844d098026`
- Explorer: https://sepolia.basescan.org/tx/0xcde759f825c2bc1f58690db1eba50dad8ccdebce4d0b380ab2dbfa844d098026

Decoded event:
- `DisputeResolved.resolution = 0` (`NO_QUORUM`)
- `participation = 1e18`
- `slashedAmount = 0`

### API representation check
- `GET /v1/disputes` route is missing (`404`), so direct dispute-list semantic verification is unavailable on public API.
- Checked `disputes[]` blocks under sampled `/v1/agent/:address` responses:
  - none included a `NO_QUORUM` semantic marker
  - available sample reasons were `challenge-rejected`

Conclusion:
- `NO_QUORUM` is proven on-chain in rehearsal.
- Public API does not currently expose a canonical disputes endpoint to verify `NO_QUORUM` vs `REJECTED` semantics directly.

## 6) Demo/sandbox isolation signals

Config observations:
- `api/query-gateway/.env`: `ALLOW_UNAUTH_SEED=false`, `ACCESS_CHECK_MODE=required`
- `api/query-gateway/.env.example`: `ENABLE_INTERNAL_DEMO=false` guidance and explicit non-prod note

Conclusion:
- Config posture indicates demo/seed features are intended to be disabled in production.
- Runtime isolation is directionally correct from config evidence, but public API payloads still carry demo-generated content labels (`local-demo-generator`) in sampled agent/action records.

## B-04 Gate status

- Live API consistency (`/agents`, `/leaderboard`, `/score/:agent`): **PASS (sampled)**
- Subgraph parity check: **FAIL (configured endpoint invalid)**
- Explorer/API boundary sanity: **PASS**
- Public API `NO_QUORUM` vs `REJECTED` verification on canonical disputes endpoint: **BLOCKED** (`/v1/disputes` missing)
- Demo/sandbox separation: **PARTIAL** (config-level evidence present, payload semantics still include demo-labeled generators)

Overall B-04 result: **Not fully closed for mainnet gate**.
