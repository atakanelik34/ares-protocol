# ⚔ ARES Protocol

![CI](https://img.shields.io/github/actions/workflow/status/atakanelik34/ares-protocol/ci.yml?branch=main)
![License](https://img.shields.io/github/license/atakanelik34/ares-protocol)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)
![Node](https://img.shields.io/badge/Node-18+-green)
![Base](https://img.shields.io/badge/Network-Base-0052FF)

> Base-native reputation infrastructure for autonomous AI agents.

ARES (Autonomous Reputation & Evaluation Scoring) provides a programmable trust layer for AI agents on Base.

ARES is not an app.
It is core infrastructure for the agent economy.

---

## 🌐 Live

- Website: https://ares-protocol.xyz
- Explorer: https://app.ares-protocol.xyz
- API: https://ares-protocol.xyz/api/v1/health
- Docs: https://ares-protocol.xyz/docs/
- Network (current): Base Sepolia (live infra)

---

## 📌 Current Status (as of Feb 26, 2026)

ARES is in **testnet-live infrastructure stage**.

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

Not yet declared mainnet-ready:
- Final governance handoff hardening (deployer -> timelock/governor lock)
- External security audit completion
- Final mainnet token/TGE parameterization
- Mainnet operational runbook freeze

Pre-mainnet execution docs:
- `/docs/mainnet-go-no-go.md` (TR: `/docs/tr/mainnet-go-no-go.tr.md`)
- `/docs/governance-handoff.md` (TR: `/docs/tr/governance-handoff.tr.md`)

---

## ✅ BASE + CDP OPERATIONAL PROOF

ARES includes an explicit operational proof layer for Base ecosystem trust:
- Landing verification metadata is live: `meta name="base:app_id" content="699e959541ea1c8768c7b035"`
- Base/CDP integration note is published: `/docs/base-cdp-integration.md` (TR: `/docs/tr/base-cdp-integration.tr.md`)
- Live runtime surfaces are publicly reachable:
  - Website: `https://ares-protocol.xyz/`
  - API: `https://ares-protocol.xyz/api/v1/health`
  - Explorer: `https://app.ares-protocol.xyz/`

This is an operations/trust layer and does **not** override on-chain governance authority.

---

## 🏗 Architecture Overview

### 1) ARES Core
- Non-transferable canonical AgentID (`uint256`)
- Scorecard Ledger
- ARI Engine (time-decay + volume confidence)
- Dispute layer (stake-weighted challenge/validation)

### 2) ERC-8004 Adapter Layer
- `ERC8004IdentityAdapter`
- `ERC8004ReputationAdapter`
- `ERC8004ValidationAdapter`
- Spec-accurate adapter approach (core remains canonical authority)

### 3) Access & Integration Layer
- Fastify Query Gateway
- The Graph indexing
- Paid API access extension
- TypeScript + Python SDKs

Architecture docs:
- `/docs/architecture.md`
- `/docs/scoring.md`
- `/docs/integration-guide.md`

---

## 🔐 ARI Model

- 5 dimensions, fixed weights: `[0.30, 0.25, 0.20, 0.15, 0.10]`
- Per-dimension score range: `0..200`
- Time decay: `exp(-lambda * days_since_action)` (fixed-point implementation)
- Volume confidence: `min(1, actions_count / 100)`
- Final ARI range: `0..1000`

Tiers:
- `UNVERIFIED`: `0-99`
- `PROVISIONAL`: `100-299`
- `ESTABLISHED`: `300-599`
- `TRUSTED`: `600-849`
- `ELITE`: `850-1000`

---

## ⚙️ Quickstart (Local)

### 1. Clone
```bash
git clone https://github.com/atakanelik34/ares-protocol.git
cd ares-protocol
```

### 2. Install
```bash
npm install
```

### 3. Contracts test
```bash
cd contracts
forge test
```

### 4. API
```bash
cd ../api/query-gateway
npm run dev
```

### 5. Explorer
```bash
cd ../../dashboard/agent-explorer
npm run dev
```

### 6. Subgraph build
```bash
cd ../../subgraph
npm run codegen
npm run build
```

---

## 🛡 Security Posture

Current controls:
- Role-gated writes for scoring
- EIP-712 signature verification path
- Fixed-point decay math (no floating point)
- Dispute-driven correction flow
- Nonce TTL + single-use auth challenge for API access auth

Planned before/around mainnet:
- External audit(s)
- Expanded invariant/fuzz coverage
- Formalized incident response + rollback playbooks

---

## 🗺 Roadmap

See:
- `/docs/roadmap.md` (EN)
- `/docs/tr/roadmap.tr.md` (TR)

---

## 📚 Whitepaper Alignment

See:
- `/docs/whitepaper.md` (EN status/alignment snapshot)
- `/docs/tr/whitepaper.tr.md` (TR status/alignment snapshot)

ERC-8004 language policy:
- "published (Aug 2025), draft/proposed, gaining adoption"

---

## 📬 Contact

- Email: contact@ares-protocol.xyz
- X: https://x.com/AresInfra
- Telegram: https://t.me/AresProtocol_Announcements
- Discord: https://discord.gg/UAxenNHx
- GitHub: https://github.com/atakanelik34/ares-protocol

© 2026 ARES Protocol
