#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outPath = path.join(repoRoot, 'api', 'query-gateway', 'data', 'demo-state.json');

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const DEMO_1 = '0x0000000000000000000000000000000000000001';
const DEMO_2 = '0x0000000000000000000000000000000000000002';
const DEMO_3 = '0x0000000000000000000000000000000000000003';
const DEMO_4 = '0x0000000000000000000000000000000000000004';
const DEMO_5 = '0x0000000000000000000000000000000000000005';
const STAR = '0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5';
const FALLEN = '0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8';
const GROWER = '0xf9a6c2029fcdf0371b243d19621da51f9335366d';

function deterministicAddress(seed) {
  return `0x${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 40)}`;
}

function isoFromOffset(offsetMs) {
  return new Date(NOW - offsetMs).toISOString();
}

function clampScore(value) {
  return Math.max(0, Math.min(200, Math.round(value)));
}

function createState() {
  return {
    meta: {
      actionSeq: 0,
      disputeSeq: 0
    },
    agents: {}
  };
}

function ensureAgent(state, address, agentId, registeredAt) {
  const key = address.toLowerCase();
  if (!state.agents[key]) {
    state.agents[key] = {
      address: key,
      agentId,
      operator: key,
      registeredAt,
      actions: [],
      disputes: []
    };
  }
  return state.agents[key];
}

function addAction(state, address, action) {
  const agent = state.agents[address.toLowerCase()];
  if (!agent) throw new Error(`Unknown agent for action: ${address}`);
  state.meta.actionSeq += 1;
  agent.actions.push({
    actionId: action.actionId,
    scores: action.scores.map(clampScore),
    timestamp: action.timestamp,
    source: action.source || 'local-demo-generator',
    status: action.status || 'VALID',
    seq: state.meta.actionSeq
  });
}

function addDispute(state, address, dispute) {
  const agent = state.agents[address.toLowerCase()];
  if (!agent) throw new Error(`Unknown agent for dispute: ${address}`);
  state.meta.disputeSeq += 1;
  const accepted = Boolean(dispute.accepted);
  if (accepted) {
    const target = agent.actions.find((item) => item.actionId === dispute.actionId && item.status !== 'INVALID');
    if (target) target.status = 'INVALID';
  }
  agent.disputes.push({
    id: state.meta.disputeSeq,
    actionId: dispute.actionId,
    accepted,
    reason: dispute.reason,
    finalizedAt: dispute.finalizedAt
  });
}

function buildAgentCatalog() {
  const fixed = [
    { label: 'demo-1', address: DEMO_1, registeredOffsetDays: 14 },
    { label: 'demo-2', address: DEMO_2, registeredOffsetDays: 14 },
    { label: 'demo-3', address: DEMO_3, registeredOffsetDays: 13 },
    { label: 'star', address: STAR, registeredOffsetDays: 65 },
    { label: 'fallen', address: FALLEN, registeredOffsetDays: 42 },
    { label: 'grower', address: GROWER, registeredOffsetDays: 18 },
    { label: 'demo-4', address: DEMO_4, registeredOffsetDays: 12 },
    { label: 'demo-5', address: DEMO_5, registeredOffsetDays: 12 }
  ];

  const others = [];
  let seed = 1;
  while (fixed.length + others.length < 40) {
    const address = deterministicAddress(`ares-local-demo-agent-${seed}`);
    seed += 1;
    if (fixed.some((item) => item.address === address) || others.some((item) => item.address === address)) continue;
    others.push({
      label: `agent-${fixed.length + others.length + 1}`,
      address,
      registeredOffsetDays: 10 + (others.length % 30)
    });
  }

  return [...fixed, ...others].map((item, index) => ({
    ...item,
    agentId: index + 1,
    registeredAt: isoFromOffset(item.registeredOffsetDays * DAY_MS)
  }));
}

function addProfileActions(state, profile) {
  const { agent, count, startDaysAgo, spacingMinutes, scoreBuilder, prefix } = profile;
  for (let i = 0; i < count; i += 1) {
    const offsetMs = startDaysAgo * DAY_MS - i * spacingMinutes * 60 * 1000;
    addAction(state, agent.address, {
      actionId: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      scores: scoreBuilder(i, count),
      timestamp: isoFromOffset(offsetMs)
    });
  }
}

function linearSeries(start, end, index, total) {
  if (total <= 1) return start;
  return start + ((end - start) * index) / (total - 1);
}

function main() {
  const state = createState();
  const agents = buildAgentCatalog();

  for (const agent of agents) {
    ensureAgent(state, agent.address, agent.agentId, agent.registeredAt);
  }

  const byLabel = Object.fromEntries(agents.map((agent) => [agent.label, agent]));

  const profiles = [
    {
      agent: byLabel.star,
      count: 95,
      startDaysAgo: 58,
      spacingMinutes: 140,
      prefix: 'star',
      scoreBuilder: (i, total) => {
        const base = linearSeries(188, 198, i, total);
        return [base + 2, base + 1, base, base - 2, base - 4];
      }
    },
    {
      agent: byLabel.fallen,
      count: 18,
      startDaysAgo: 30,
      spacingMinutes: 210,
      prefix: 'fallen',
      scoreBuilder: (i, total) => {
        const base = linearSeries(85, 110, i, total);
        return [base, base - 6, base - 10, base - 13, base - 16];
      }
    },
    {
      agent: byLabel.grower,
      count: 28,
      startDaysAgo: 14,
      spacingMinutes: 180,
      prefix: 'grower',
      scoreBuilder: (i, total) => {
        const base = linearSeries(92, 178, i, total);
        return [base, base - 3, base - 7, base - 10, base - 14];
      }
    },
    {
      agent: byLabel['agent-9'],
      count: 60,
      startDaysAgo: 40,
      spacingMinutes: 150,
      prefix: 'established-a',
      scoreBuilder: () => [160, 156, 152, 148, 144]
    },
    {
      agent: byLabel['agent-10'],
      count: 52,
      startDaysAgo: 37,
      spacingMinutes: 165,
      prefix: 'established-b',
      scoreBuilder: () => [150, 146, 142, 138, 134]
    },
    {
      agent: byLabel['agent-11'],
      count: 24,
      startDaysAgo: 22,
      spacingMinutes: 210,
      prefix: 'prov-a',
      scoreBuilder: () => [136, 132, 128, 124, 120]
    },
    {
      agent: byLabel['agent-12'],
      count: 22,
      startDaysAgo: 20,
      spacingMinutes: 220,
      prefix: 'prov-b',
      scoreBuilder: () => [132, 128, 124, 120, 116]
    },
    {
      agent: byLabel['agent-13'],
      count: 20,
      startDaysAgo: 18,
      spacingMinutes: 230,
      prefix: 'prov-c',
      scoreBuilder: () => [128, 124, 120, 116, 112]
    },
    {
      agent: byLabel['agent-14'],
      count: 18,
      startDaysAgo: 16,
      spacingMinutes: 240,
      prefix: 'prov-d',
      scoreBuilder: () => [124, 120, 116, 112, 108]
    },
    {
      agent: byLabel['agent-15'],
      count: 16,
      startDaysAgo: 14,
      spacingMinutes: 250,
      prefix: 'prov-e',
      scoreBuilder: () => [120, 116, 112, 108, 104]
    }
  ];

  for (const profile of profiles) addProfileActions(state, profile);

  const fixedCounts = new Map([
    [byLabel['demo-1'].address, 6],
    [byLabel['demo-2'].address, 4],
    [byLabel['demo-3'].address, 3],
    [byLabel['demo-4'].address, 4],
    [byLabel['demo-5'].address, 5]
  ]);

  const alreadyCounted = Object.values(state.agents).reduce((sum, agent) => sum + agent.actions.length, 0);
  const remainingAgents = agents.filter((agent) => state.agents[agent.address].actions.length === 0);
  let remainingActions = 500 - alreadyCounted;

  remainingAgents.forEach((agent, index) => {
    const reserved = remainingAgents.length - index - 1;
    const desired = fixedCounts.get(agent.address) || (index % 4 === 0 ? 8 : index % 4 === 1 ? 7 : index % 4 === 2 ? 6 : 5);
    const count = Math.max(1, Math.min(desired, remainingActions - reserved));
    addProfileActions(state, {
      agent,
      count,
      startDaysAgo: 6 + (index % 12),
      spacingMinutes: 260 + (index % 5) * 10,
      prefix: `agent-${agent.agentId}`,
      scoreBuilder: (_, total) => {
        const base = total >= 8 ? 118 : 102;
        return [base, base - 4, base - 8, base - 12, base - 16];
      }
    });
    remainingActions -= count;
  });

  if (remainingActions !== 0) {
    throw new Error(`Action allocation mismatch: ${remainingActions} remaining`);
  }

  const disputes = [
    { agent: byLabel.fallen, actionId: 'fallen-017', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel.fallen, actionId: 'fallen-018', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel.grower, actionId: 'grower-028', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel.star, actionId: 'star-095', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-9'], actionId: 'established-a-060', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-10'], actionId: 'established-b-052', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-11'], actionId: 'prov-a-024', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-12'], actionId: 'prov-b-022', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-13'], actionId: 'prov-c-020', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-14'], actionId: 'prov-d-018', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-15'], actionId: 'prov-e-016', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-16'], actionId: 'agent-16-008', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-17'], actionId: 'agent-17-007', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-18'], actionId: 'agent-18-006', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-19'], actionId: 'agent-19-005', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-20'], actionId: 'agent-20-008', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-21'], actionId: 'agent-21-007', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-22'], actionId: 'agent-22-006', accepted: false, reason: 'challenge-rejected' },
    { agent: byLabel['agent-23'], actionId: 'agent-23-005', accepted: true, reason: 'challenge-upheld' },
    { agent: byLabel['agent-24'], actionId: 'agent-24-008', accepted: false, reason: 'challenge-rejected' }
  ];

  for (let i = 0; i < disputes.length; i += 1) {
    const dispute = disputes[i];
    addDispute(state, dispute.agent.address, {
      actionId: dispute.actionId,
      accepted: dispute.accepted,
      reason: dispute.reason,
      finalizedAt: isoFromOffset((3 + i) * 60 * 60 * 1000)
    });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));

  const totals = Object.values(state.agents).reduce(
    (acc, agent) => {
      acc.agents += 1;
      acc.actions += agent.actions.length;
      acc.disputes += agent.disputes.length;
      return acc;
    },
    { agents: 0, actions: 0, disputes: 0 }
  );

  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(totals, null, 2));
}

main();
