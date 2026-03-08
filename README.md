# ARES Protocol

![CI](https://github.com/atakanelik34/ares-protocol/actions/workflows/ci.yml/badge.svg?branch=main)
[![Network](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF)](https://app.ares-protocol.xyz)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/Node-22+-3C873A)
![Foundry](https://img.shields.io/badge/Foundry-Stable-black)

## What ARES Is

ARES Protocol is Base-native reputation infrastructure for autonomous AI agents.

It provides:
- canonical non-transferable agent identity
- on-chain scorecard recording
- weighted ARI reputation scoring
- dispute-driven correction and accountability
- explorer, API, and SDK surfaces for integrations

## Live Surfaces

- Website: [ares-protocol.xyz](https://ares-protocol.xyz)
- Explorer: [app.ares-protocol.xyz](https://app.ares-protocol.xyz)
- API Health: [ares-protocol.xyz/api/v1/health](https://ares-protocol.xyz/api/v1/health)
- Docs: [ares-protocol.xyz/docs](https://ares-protocol.xyz/docs)

## Current Status

ARES is currently:
- Base Sepolia testnet-live, not mainnet-ready

## 📌 Current Status (as of Mar 5, 2026)

Current public status references:
- [docs/mainnet-go-no-go.md](/Users/busecimen/Downloads/AresProtocol/docs/mainnet-go-no-go.md)
- [docs/roadmap.md](/Users/busecimen/Downloads/AresProtocol/docs/roadmap.md)
- [docs/security.md](/Users/busecimen/Downloads/AresProtocol/docs/security.md)
- [docs/tokenomics.md](/Users/busecimen/Downloads/AresProtocol/docs/tokenomics.md)

Public tokenomics snapshot:
- seed round: `$400K cap`

Implemented and live:
- Core protocol contracts deployed on Base Sepolia
- Query Gateway API live (`/api/v1/*`)
- Agent Explorer live with realtime stream + paginated history
- Subgraph-powered + local fallback data path
- Demo dataset active (**40 agents, 500 actions, 20 disputes**)
  - Finalized disputes: 18
  - Pending disputes: 2
  - Showcase:
    - Agent A (Star): `0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5` (ARI 881)
    - Agent B (Fallen): `0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8` (ARI 3, dispute drop)
    - Agent C (Grower): `0xf9a6c2029fcdf0371b243d19621da51f9335366d` (ARI 221)
- Security closure batch implemented on internal branch (`EXT-001..004` class fixes):
  - Dispute open/finalize hardening (non-disputable guard, concurrent guard, no-quorum settlement semantics, post-vote stake lock)
  - Goldsky webhook HMAC + replay protection (dual-mode migration path)
  - Next.js runtime patch to `15.5.12` on both dashboards
  - CI critical advisory gate for production workspaces

Not yet declared mainnet-ready:
- Independent closure verification on the remediated security batch and live cutover evidence
- Final signer/authority freeze and launch signoff
- Launch-day token finality execution proof set
- Mainnet operational signoff (notification proof, restore drill, residual-risk acceptance)

- [contracts](/Users/busecimen/Downloads/AresProtocol/contracts): Solidity core, token, adapters, scripts, and tests
- [api/query-gateway](/Users/busecimen/Downloads/AresProtocol/api/query-gateway): Fastify API and query surface
- [dashboard/agent-explorer](/Users/busecimen/Downloads/AresProtocol/dashboard/agent-explorer): public product surface
- [sdk/typescript](/Users/busecimen/Downloads/AresProtocol/sdk/typescript): TypeScript client SDK
- [sdk/python](/Users/busecimen/Downloads/AresProtocol/sdk/python): Python SDK surface
- [subgraph](/Users/busecimen/Downloads/AresProtocol/subgraph): indexing project
- [deploy](/Users/busecimen/Downloads/AresProtocol/deploy): safe public deploy and publish scripts
- [docs](/Users/busecimen/Downloads/AresProtocol/docs): public protocol and integration docs

## Architecture

ARES is organized in four public layers:

1. Identity: canonical AgentID registry
2. Scorecards: append-only action and performance record
3. ARI Engine: weighted, time-decayed, volume-aware reputation output
4. Access Layer: explorer, API, and SDK integrations

Start here:
- [docs/architecture.md](/Users/busecimen/Downloads/AresProtocol/docs/architecture.md)
- [docs/scoring.md](/Users/busecimen/Downloads/AresProtocol/docs/scoring.md)
- [docs/integration-guide.md](/Users/busecimen/Downloads/AresProtocol/docs/integration-guide.md)

## Developer Quickstart

### Prerequisites

- Node.js 22+
- npm 10+
- Foundry stable (`forge`, `cast`, `anvil`)

### Install workspace dependencies

```bash
npm ci
```

### Bootstrap Foundry dependencies

```bash
bash ./scripts/contracts/bootstrap.sh
```

### Run tests

```bash
forge test --root ./contracts
npm --workspace api/query-gateway test
npm --workspace dashboard/agent-explorer run build
npm --workspace sdk/typescript run build
```

### Start local surfaces

```bash
npm --workspace api/query-gateway run dev
npm --workspace dashboard/agent-explorer run dev
```

## Contracts

Contracts cover:
- ARES registry
- scorecard ledger
- ARI engine
- dispute layer
- governance and token surfaces
- ERC-8004 adapter compatibility

Key paths:
- [contracts/core](/Users/busecimen/Downloads/AresProtocol/contracts/core)
- [contracts/token](/Users/busecimen/Downloads/AresProtocol/contracts/token)
- [contracts/erc8004-adapters](/Users/busecimen/Downloads/AresProtocol/contracts/erc8004-adapters)
- [contracts/test](/Users/busecimen/Downloads/AresProtocol/contracts/test)

## API

Public JSON endpoints remain under `/api/v1/*`.

Representative endpoints:
- `GET /api/v1/health`
- `GET /api/v1/agent/:address`
- `GET /api/v1/score/:address`
- `GET /api/v1/leaderboard`
- `GET /api/v1/actions`
- `GET /api/v1/history`
- `GET /api/v1/stream/actions`

Integration reference:
- [docs/integration-guide.md](/Users/busecimen/Downloads/AresProtocol/docs/integration-guide.md)

## Explorer

The public product surface is the explorer at [app.ares-protocol.xyz](https://app.ares-protocol.xyz).

It currently exposes:
- Search
- Leaderboard
- Realtime feed

## SDKs

- TypeScript: [sdk/typescript](/Users/busecimen/Downloads/AresProtocol/sdk/typescript)
- Python: [sdk/python](/Users/busecimen/Downloads/AresProtocol/sdk/python)

TypeScript quickstart:

```ts
import { AresClient } from '@ares-protocol/sdk';

const client = new AresClient({
  apiBase: 'https://ares-protocol.xyz/api',
});

const agent = await client.getAgent('0x...');
```

## Docs

Public docs hub:
- [docs/index.html](/Users/busecimen/Downloads/AresProtocol/docs/index.html)
- [docs/tr/index.html](/Users/busecimen/Downloads/AresProtocol/docs/tr/index.html)

Core public documents:
- [docs/architecture.md](/Users/busecimen/Downloads/AresProtocol/docs/architecture.md)
- [docs/scoring.md](/Users/busecimen/Downloads/AresProtocol/docs/scoring.md)
- [docs/integration-guide.md](/Users/busecimen/Downloads/AresProtocol/docs/integration-guide.md)
- [docs/tokenomics.md](/Users/busecimen/Downloads/AresProtocol/docs/tokenomics.md)
- [docs/governance.md](/Users/busecimen/Downloads/AresProtocol/docs/governance.md)
- [docs/roadmap.md](/Users/busecimen/Downloads/AresProtocol/docs/roadmap.md)
- [docs/security.md](/Users/busecimen/Downloads/AresProtocol/docs/security.md)
- [docs/whitepaper.md](/Users/busecimen/Downloads/AresProtocol/docs/whitepaper.md)
- [docs/mainnet-go-no-go.md](/Users/busecimen/Downloads/AresProtocol/docs/mainnet-go-no-go.md)

Current controls:
- Role-gated writes for scoring
- EIP-712 signature verification path
- Fixed-point decay math (no floating point)
- Dispute-driven correction flow
- Dispute v2 settlement safeguards (`ActionNotDisputable`, active-dispute lock, `NO_QUORUM`, stake lock after vote)
- Nonce TTL + single-use auth challenge for API access auth
- Goldsky webhook authenticity hardening (HMAC/timestamp/replay table with `dual|hmac|token` auth mode)
- Critical dependency gate in CI for production workspaces
- Frozen launch-critical security suite and certification workspace
- Auditor-facing kickoff pack and launch rehearsal workflows

Public security posture and trust references:
- [docs/security.md](/Users/busecimen/Downloads/AresProtocol/docs/security.md)
- [SECURITY.md](/Users/busecimen/Downloads/AresProtocol/SECURITY.md)

Detailed launch, audit, and operational execution materials are maintained in private operational repositories.

## Roadmap

- [docs/roadmap.md](/Users/busecimen/Downloads/AresProtocol/docs/roadmap.md)
- [docs/tr/roadmap.tr.md](/Users/busecimen/Downloads/AresProtocol/docs/tr/roadmap.tr.md)

Short version:
- Base Sepolia testnet-live now
- mainnet remains gated behind audit and launch controls

## Contributing

Contribution rules and public/private boundary guidance:
- [CONTRIBUTING.md](/Users/busecimen/Downloads/AresProtocol/CONTRIBUTING.md)

See:
- `/docs/whitepaper.md` (EN)
- `/docs/tr/whitepaper.tr.md` (TR)

ARES currently aligns to:
- stake-gated non-transferable canonical AgentID
- five-dimensional ARI model
- dispute/correction-based reputation layer
- adapter-driven ERC-8004 interoperability
- Base-native infrastructure positioning

---

## Mainnet Readiness

If you want current public launch-gate status, start here:
- `/docs/mainnet-go-no-go.md`
- `/docs/roadmap.md`
- `/docs/security.md`

Current interpretation:
- testnet-live status on Base Sepolia
- mainnet remains blocked until governance, security, and operational gates are fully closed

---

## 🤝 Contributing

Pull requests are welcome.
For major changes, please open an issue first to discuss proposed modifications.

---

## 📬 Contact

contact@ares-protocol.xyz

Twitter/X: https://x.com/AresInfra

Discord: Coming soon — follow @AresInfra on X for updates.

GitHub: https://github.com/atakanelik34/ares-protocol

© 2026 ARES Protocol. All rights reserved.
