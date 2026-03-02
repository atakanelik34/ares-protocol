# ⚔ ARES Protocol

![CI](https://img.shields.io/github/actions/workflow/status/atakanelik34/ares-protocol/ci.yml?branch=main)
[![Testnet](https://img.shields.io/badge/Testnet-Base%20Sepolia-0052FF)](https://app.ares-protocol.xyz)
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

## 📌 Current Status (as of Mar 2, 2026)

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
- External security audit completion
- Final signer/authority freeze and launch signoff
- Launch-day token finality execution proof set
- Mainnet operational and residual-risk acceptance freeze

Pre-mainnet execution docs:
- `/docs/mainnet-go-no-go.md` (TR: `/docs/tr/mainnet-go-no-go.tr.md`)
- `/docs/governance-handoff.md` (TR: `/docs/tr/governance-handoff.tr.md`)
- `/docs/mainnet-certification-framework-v1.md`
- `/docs/certification/README.md`
- `/docs/audit/README.md`

---

## ✅ BASE + CDP OPERATIONAL PROOF

ARES includes an explicit operational proof layer for Base ecosystem trust:
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

## 💰 Tokenomics v2.1

Canonical references:
- `/docs/tokenomics.md`
- `/docs/tokenomics.constants.json`
- `/docs/tokenomics-validation.json`

Model highlights:
- Total supply model: `1,000,000,000 ARES`
- Seed model: **$400K cap** (`80,000,000 ARES @ $0.005`)
- Seed TGE unlock: `0` (6-month cliff)
- TGE circulating target: `80,000,000 ARES` (`8%`)

Final allocation:
- Protocol Treasury `22%`
- Ecosystem & Developer Grants `20%`
- Community & Airdrop `18%`
- Team `18%`
- Staking Rewards Pool `8%`
- Early Investors (Seed) `8%`
- Liquidity Reserve `4%`
- Advisors `2%`

Policy boundaries:
- APY language is formula-only: `illustrative, revenue-dependent, non-guaranteed`.
- Anti-dump controls are contractual/vesting policy, not generic transfer-hook restrictions.
- Paid API access is an ARES extension (`AresApiAccess`), not an ERC-8004 requirement.

Mainnet architecture note:
- One-time mint + minter revoke is documented in `/docs/token-architecture.md`.
- This sprint aligns docs/product/API and deterministic math validation, without introducing new token contract behavior.

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
- Frozen launch-critical security suite and certification workspace
- Auditor-facing kickoff pack and launch rehearsal workflows

Planned before/around mainnet:
- External audit(s)
- Final signer freeze and launch authority closure
- Launch-day token finality execution proofs
- Finalized incident response + rollback signoff

---

## 🗺 Roadmap

See:
- `/docs/roadmap.md` (EN)
- `/docs/tr/roadmap.tr.md` (TR)

Milestones:
- ✅ Feb 2026 — Testnet live on Base Sepolia (COMPLETE)
- Q3 2026 — Mainnet deployment + $ARES token
- Q4 2026 — Dispute Layer live on Mainnet

---

## 📚 Whitepaper Alignment

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

## 🚦 Mainnet Readiness Workspace

If you want the current launch gate status, start here:
- `/docs/mainnet-certification-framework-v1.md`
- `/docs/certification/README.md`
- `/docs/certification/execution-matrix.md`
- `/docs/certification/evidence-index.md`
- `/docs/audit/README.md`

Current interpretation:
- testnet-live and audit-kickoff-ready
- mainnet still blocked pending audit, signer freeze, token finality execution proofs, and final signoff

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
