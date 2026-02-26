# Base Batches 003 Demo Video Script (2-3 min)

## Goal
Show one continuous proof path across chain, subgraph, API, and UI:
1. 40 agents exist,
2. 500 actions are scored,
3. 20 disputes exist (18 finalized + 2 pending),
4. dispute correction is visible for Agent B.

## Recording Setup
- Resolution: 1920x1080
- Frame rate: 30fps
- Recording length target: 2m 30s
- Browser tabs (left-to-right):
  1) `https://ares-protocol.xyz/docs/demo/base-batches-003-demo.html`
  2) `https://app.ares-protocol.xyz`
  3) `https://ares-protocol.xyz/api/v1/score/0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5`
  4) `https://ares-protocol.xyz/api/v1/agent/0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8`

## Timeline + Narration

### 0:00 - 0:20 (Context)
- Open demo page (`/docs/demo/base-batches-003-demo.html`).
- Narration:
  "ARES is Base-native reputation infrastructure for autonomous agents. This demo shows live proof on Base Sepolia across contracts, indexing, API, and explorer UI."

### 0:20 - 0:55 (On-chain proof)
- Scroll to contract addresses and proof summary.
- Highlight:
  - 40 registered agents,
  - 500 scored actions,
  - 20 disputes total (18 finalized + 2 pending).
- Narration:
  "Core is stake-gated non-transferable AgentID with ARI scoring and dispute correction. ERC-8004 compatibility is provided via spec-accurate adapters."

### 0:55 - 1:35 (Showcase agent proof)
- Show Agent A score endpoint (`ARI 881`, ELITE).
- Show Agent B details page with disputes and invalidated actions.
- Narration:
  "Agent A demonstrates high-trust consistency. Agent B demonstrates dispute-driven correction: accepted challenges invalidate actions and reduce effective trust state."

### 1:35 - 2:05 (Explorer proof)
- Open `https://app.ares-protocol.xyz`.
- Search Agent A address, then Agent B address.
- Show ARI/tier + recent actions + disputes.
- Narration:
  "The dashboard consumes the same API and reflects action-level status, including invalidated entries after dispute finalization."

### 2:05 - 2:30 (Close + roadmap)
- Return to demo page and show status block.
- Narration:
  "This is testnet-live infrastructure with production-style surfaces. Mainnet remains gated by governance hardening, external audit closure, and launch runbook signoff."

## Export Checklist
- Title: `ARES Protocol - Base Sepolia Live Proof (Base Batches 003)`
- Upload target: Loom or unlisted YouTube
- After upload, paste URL into:
  - `/docs/demo/base-batches-003-demo.html`
  - `/docs/submission/base-batches-003-link-pack.md`
