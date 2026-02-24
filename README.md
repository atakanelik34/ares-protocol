# ⚔ ARES Protocol

![CI](https://img.shields.io/github/actions/workflow/status/atakanelik34/ares-protocol/ci.yml?branch=main)
![License](https://img.shields.io/github/license/atakanelik34/ares-protocol)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)
![Node](https://img.shields.io/badge/Node-18+-green)
![Base](https://img.shields.io/badge/Network-Base-0052FF)

> Base-native reputation infrastructure for autonomous AI agents.

ARES (Autonomous Reputation & Evaluation Scoring) establishes the first standardized trust layer for AI agents operating on Base.

It provides:

- Canonical on-chain AgentID registry  
- Multi-dimensional ARI (Agent Reputation Index) scoring  
- Dispute & economic accountability layer  
- ERC-8004 adapter compatibility  
- Governance-secured parameter system  

ARES is not an application.  
It is infrastructure for the agent economy.

---

## 🌐 Live

- Website: https://ares-protocol.xyz
- API: https://api.ares-protocol.xyz/v1/health
- Docs: https://ares-protocol.xyz/docs/
- Network: Base

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
- Paid API access extension
- TypeScript & Python SDKs

Architecture diagram:  
`/docs/architecture.md`

---

## 💡 Why ARES Exists

AI agents are evolving into autonomous economic actors.

They:

- Execute transactions  
- Manage capital  
- Coordinate across protocols  
- Interact with other agents  

Yet there is no standardized reputation primitive governing their behavior.

ARES introduces the missing trust infrastructure layer.

---

## 💰 Economic Model

The $ARES token secures the protocol through:

- Agent staking for registration  
- Dispute participation & slashing  
- Governance parameter control  
- API access payments  

Reputation data compounds over time, creating a defensible data moat and network effect.

---

## ⚙️ Quickstart (Local Development)

### 1. Clone

```bash
git clone https://github.com/atakanelik34/ares-protocol.git
cd ares-protocol
```

### 2. Install

```bash
npm install
```

### 3. Contracts

```bash
cd contracts
forge test
```

### 4. API

```bash
cd api/query-gateway
npm run dev
```

### 5. Subgraph

```bash
cd subgraph
npm run codegen
npm run build
```

---

## 📦 Repository Structure

- `contracts/` → Solidity core + adapters
- `subgraph/` → The Graph indexing layer
- `api/query-gateway/` → Public reputation API
- `api/scoring-service/` → ARI computation service
- `dashboard/` → Explorer + Admin UI
- `sdk/typescript/` → TypeScript client
- `sdk/python/` → Python client
- `docs/` → Architecture & specifications

---

## 🛡 Security

- Governance-controlled parameter updates
- EIP-712 signer validation
- Chunked fixed-point decay math
- Spec snapshot compliance testing (ERC-8004)
- Security audits (planned Q3 2026)
- Bug bounty: $500K (planned)

---

## 🗺 Roadmap

- Q2 2026 — Testnet launch (Base Sepolia)
- Q3 2026 — Mainnet deployment + $ARES token
- Q4 2026 — Dispute layer live
- 2027 — Superchain expansion

---

## 🤝 Contributing

Pull requests are welcome.  
For major changes, please open an issue first to discuss proposed modifications.

---

## 📬 Contact

- contact@ares-protocol.xyz
- Twitter/X: https://x.com/aresprotocol
- Discord: https://discord.gg/aresprotocol

© 2026 ARES Protocol. All rights reserved.
