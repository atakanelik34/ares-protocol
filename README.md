# ⚔ ARES Protocol

![CI](https://img.shields.io/github/actions/workflow/status/atakanelik34/ares-protocol/ci.yml?branch=main)
![License](https://img.shields.io/github/license/atakanelik34/ares-protocol)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)
![Node](https://img.shields.io/badge/Node-18+-green)
![Base](https://img.shields.io/badge/Network-Base-0052FF)

> Base-native reputation infrastructure for autonomous AI agents.

ARES (Autonomous Reputation & Evaluation Scoring) establishes a standardized, programmable trust layer for AI agents operating on Base.

ARES is not an application.  
It is infrastructure for the agent economy.

---

## 🌐 The Problem

Autonomous AI agents are beginning to:

- Execute transactions  
- Manage capital  
- Coordinate across protocols  
- Interact with other agents  

Yet there is no canonical reputation primitive governing their behavior.

Protocols cannot reliably determine:

- Whether an agent is trustworthy  
- Whether it has a history of disputes  
- Whether it behaves maliciously  
- Whether it should be allowed to execute  

Web4 requires programmable trust.

---

## 🔐 The Solution — ARI (Agent Reputation Index)

ARES introduces **ARI**, a 0–1000 composite reputation score derived from:

- Action validity ratio  
- Dispute outcomes  
- Volume confidence weighting  
- Time-decay mechanics  
- Behavioral metrics  

ARI is:

- Deterministic  
- On-chain verifiable  
- Dispute-aware  
- Programmable  

Protocols can:

- Enforce minimum ARI thresholds  
- Query ARI via Solidity  
- Query ARI via REST API  
- Automatically block malicious agents  

ARES becomes a programmable reputation primitive.

---

## 🏗 Architecture Overview

ARES consists of three core layers:

### 1️⃣ ARES Core

- Non-transferable canonical AgentID (`uint256`)
- Scorecard ledger
- ARI Engine (time-decay + volume confidence)
- Dispute mechanism

### 2️⃣ ERC-8004 Adapter Layer

- Spec-accurate identity adapter
- Reputation adapter
- Validation adapter
- Snapshot-pinned interface compliance

### 3️⃣ Access & Integration Layer

- Fastify-based Query Gateway
- Subgraph indexing (core + adapter events)
- Paid API extension
- TypeScript & Python SDKs

Architecture documentation:  
`/docs/architecture.md`

---

## 🌐 Live

- Website: https://ares-protocol.xyz  
- API: https://api.ares-protocol.xyz/v1/health  
- Docs: https://ares-protocol.xyz/docs/  
- Network: Base  

Execution target for Base Batches submission:  
`/docs/base-batches-003-execution.md`

---

## 🎯 Base Batches 003 Submission Pack

- Light paper: `/docs/submission/base-batches-003-light-paper.md`
- Demo video script: `/docs/submission/base-batches-003-demo-video-script.md`
- Link pack (contracts + API + proof): `/docs/submission/base-batches-003-link-pack.md`
- Demo hub: `/docs/demo/base-batches-003-demo.html`
- Demo proof JSON: `/docs/demo/sepolia-demo-proof.json`

---

## 💰 Economic Model

The `$ARES` token secures the protocol via:

- Agent staking for registration  
- Dispute participation & slashing  
- Governance parameter control  
- API access payments  

Reputation data compounds over time, creating a defensible data moat and network effect.

---

## ⚙️ Quickstart (Local Development)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/atakanelik34/ares-protocol.git
cd ares-protocol
2️⃣ Install Dependencies
npm install
3️⃣ Run Smart Contract Tests
cd contracts
forge test
4️⃣ Start Query Gateway (API)
cd api/query-gateway
npm run dev
5️⃣ Build Subgraph
cd subgraph
npm run codegen
npm run build
6️⃣ Deploy to Base Sepolia
npm run deploy:contracts:sepolia
```

📦 Repository Structure
ares-protocol/
│
├── contracts/              Solidity core + adapters
├── subgraph/               The Graph indexing layer
│
├── api/
│   ├── query-gateway/      Public reputation API
│   └── scoring-service/    ARI computation engine
│
├── dashboard/              Explorer + Admin UI
│
├── sdk/
│   ├── typescript/         TypeScript client SDK
│   └── python/             Python client SDK
│
└── docs/                   Architecture & specifications
🛡 Security

Governance-controlled parameter updates

EIP-712 signer validation

Fixed-point decay math

ERC-8004 compliance testing

Security audits (planned Q3 2026)

Bug bounty (planned)

🗺 Roadmap

Q2 2026 — Base Sepolia launch

Q3 2026 — Mainnet deployment + $ARES

Q4 2026 — Dispute layer activation

2027 — Superchain expansion

🤝 Contributing

Pull requests are welcome.
For major architectural proposals, please open an issue first.

📬 Contact

contact@ares-protocol.xyz

Twitter/X: https://x.com/aresprotocol

Discord: https://discord.gg/aresprotocol

© 2026 ARES Protocol
