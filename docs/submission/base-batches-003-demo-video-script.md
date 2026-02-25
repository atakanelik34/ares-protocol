# Base Batches 003 Demo Video Script (2-3 min)

## Goal
Show one continuous proof path across chain, subgraph, API, and UI:
1. 3 agents exist,
2. 20 actions are scored,
3. 1 dispute invalidates an action and updates agent state.

## Recording Setup
- Resolution: 1920x1080
- Frame rate: 30fps
- Recording length target: 2m 30s
- Browser tabs (left-to-right):
  1) `https://ares-protocol.xyz/docs/demo/base-batches-003-demo.html`
  2) `https://app.ares-protocol.xyz`
  3) `https://api.ares-protocol.xyz/v1/score/0x1000000000000000000000000000000000000001`
  4) `https://api.ares-protocol.xyz/v1/agent/0x1000000000000000000000000000000000000001`

## Timeline + Narration

### 0:00 - 0:20 (Context)
- Open demo page (`/docs/demo/base-batches-003-demo.html`).
- Narration:
  "ARES is Base-native reputation infrastructure for autonomous agents. This demo shows live proof on Base Sepolia across contracts, indexing, API, and explorer UI."

### 0:20 - 0:50 (On-chain proof)
- Scroll to contract addresses and proof summary.
- Highlight:
  - 3 registered agents,
  - 20 scored actions,
  - 1 finalized dispute.
- Narration:
  "Core is stake-gated non-transferable AgentID with ARI scoring and dispute correction. ERC-8004 compatibility is provided via spec-accurate adapters."

### 0:50 - 1:30 (API proof)
- Switch to score endpoint tab.
- Show response fields: `agentId`, `agentIdHex`, `ari`, `tier`, `actions`, `since`.
- Switch to agent endpoint tab.
- Show `actions` list with one `INVALID` action and `disputes` array.
- Narration:
  "The query layer is live. We return canonical IDs in decimal and hex, plus full action/dispute history from subgraph-indexed data."

### 1:30 - 2:00 (Explorer proof)
- Open `https://app.ares-protocol.xyz`.
- Search operator `0x1000000000000000000000000000000000000001`.
- Show ARI/tier and action table status values.
- Narration:
  "The dashboard consumes the same API and displays action-level status, including invalidated entries after dispute finalization."

### 2:00 - 2:30 (Close + roadmap)
- Return to demo page and scroll to roadmap block.
- Narration:
  "This is testnet-validated infrastructure. Next milestones are integration expansion, parameter hardening, and mainnet readiness after security review."

## Optional Re-take Variant
If you want visible ARI drop in frame (not only valid action count drop), rerun demo with boosted first action scores for the disputed agent, then re-record the API segment.

## Export Checklist
- Title: `ARES Protocol - Base Sepolia Live Proof (Base Batches 003)`
- Upload target: Loom or unlisted YouTube
- After upload, paste URL into:
  - `/docs/demo/base-batches-003-demo.html`
  - `/docs/submission/base-batches-003-link-pack.md`
