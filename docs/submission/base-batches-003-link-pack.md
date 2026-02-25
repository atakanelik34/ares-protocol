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

## Demo Proof (25 agents / 250 actions / 12 disputes)
- Proof JSON: `/docs/demo/sepolia-demo-proof.json`
- Registered operators:
  - `0x0000000000000000000000000000000000000001`
  - `0x0000000000000000000000000000000000000002`
  - `0x0000000000000000000000000000000000000003`
- Actions recorded: `250+`
- Disputes finalized: `12`
- Live dataset query uses `demo-1..demo-5` aliases mapped to canonical `0x000...` operators.

## Live API Checks
- Score endpoint:
  `https://ares-protocol.xyz/api/v1/score/demo-1`
- Agent details endpoint:
  `https://ares-protocol.xyz/api/v1/agent/demo-1`
- Leaderboard endpoint:
  `https://ares-protocol.xyz/api/v1/leaderboard?limit=25`
- Access endpoint:
  `https://ares-protocol.xyz/api/v1/access/demo-1`

## Submission Docs
- Light paper (500 words): `/docs/submission/base-batches-003-light-paper.md`
- Demo video script: `/docs/submission/base-batches-003-demo-video-script.md`
- Execution plan: `/docs/base-batches-003-execution.md`
