# Base Batches 003 Link Pack (ARES)

## Core Links
- Website: https://ares-protocol.xyz
- App (Explorer): https://app.ares-protocol.xyz
- API Health: https://ares-protocol.xyz/api/v1/health
- Docs Hub: https://ares-protocol.xyz/docs/
- Repo: https://github.com/atakanelik34/ares-protocol
- Demo Page (single entry): https://ares-protocol.xyz/docs/demo/base-batches-003-demo.html
- Demo video URL: `TBD` (record using `/docs/submission/base-batches-003-demo-video-script.md`)

## Sepolia Deployment
- Network: Base Sepolia (`chainId=84532`)
- Deployer: `0xa5B0ea86106927DFD830D82B9c24c1Aaa63303e2`
- Source file: `/deploy/contracts/addresses.base-sepolia.json`

### Contract Addresses
- AresToken: `0x89f8748435b048e0f2944376cb793cf193b87af4`
- AresRegistry: `0x8df897ed117078983d9a097ee731104b6a7b843f`
- AresARIEngine: `0xc78e9bf65ab6db5f638cb4448dc5ebcb7c6e99f3`
- AresScorecardLedger: `0xf87343a973f75a2cba9fb93616fa8331e5fff2b1`
- AresDispute: `0x66168715b5a760d775a9672255bd49087063613f`
- AresApiAccess: `0xb390966a42bf073627617cde9467c36bcecdbca2`
- ERC8004IdentityAdapter: `0x6949a0edf05cb4f7624ca69ac2a612cdcc969c19`
- ERC8004ReputationAdapter: `0xd8c5c115a26ca426762c91d8a0bcd703d258fc0f`
- ERC8004ValidationAdapter: `0x7af6e906d5108d53abf5f025a38be4b0e0cd0ae3`

## Indexing
- Subgraph endpoint:
  `https://api.studio.thegraph.com/query/1742690/ares-protocol/v0.1.0-sepolia-20260224-3`

## Demo Proof (40 agents / 500 actions / 20 disputes)
- Latest proof JSON: `/docs/demo/video-demo-cheat-sheet.json`
- Snapshot generated: `2026-02-26T14:27:25.244Z`
- Totals:
  - Agents: `40`
  - Actions: `500`
  - Disputes: `20` (`18 finalized`, `2 pending`)

### Showcase Agents (for video)
- Agent A (The Star):
  - Address: `0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5`
  - Agent ID: `4`
  - ARI: `881`
- Agent B (The Fallen):
  - Address: `0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8`
  - Agent ID: `5`
  - ARI drop: `6 -> 3` after challenger-won disputes
- Agent C (The Grower):
  - Address: `0xf9a6c2029fcdf0371b243d19621da51f9335366d`
  - Agent ID: `6`
  - ARI: `221`

## Live API Checks
- Score endpoint (Agent A):
  `https://ares-protocol.xyz/api/v1/score/0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5`
- Score endpoint (Agent B):
  `https://ares-protocol.xyz/api/v1/score/0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8`
- Agent details endpoint (Agent B):
  `https://ares-protocol.xyz/api/v1/agent/0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8`
- Leaderboard endpoint:
  `https://ares-protocol.xyz/api/v1/leaderboard?limit=100`
- Action feed endpoint:
  `https://ares-protocol.xyz/api/v1/actions?limit=20&page=1`
- Access endpoint:
  `https://ares-protocol.xyz/api/v1/access/0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5`
- Auth challenge endpoint:
  `https://ares-protocol.xyz/api/v1/auth/challenge?account=0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5`

## Submission Docs
- Light paper (500 words): `/docs/submission/base-batches-003-light-paper.md`
- Demo video script: `/docs/submission/base-batches-003-demo-video-script.md`
- Execution plan: `/docs/base-batches-003-execution.md`
