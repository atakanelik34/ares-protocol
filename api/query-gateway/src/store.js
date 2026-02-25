import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const statePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'demo-state.json');

const defaultState = {
  meta: {
    actionSeq: 0,
    disputeSeq: 0
  },
  agents: {}
};

function ensureDir() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
}

export function loadState() {
  ensureDir();
  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2));
    return structuredClone(defaultState);
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

export function saveState(state) {
  ensureDir();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function normalizeState(state) {
  const next = state && typeof state === 'object' ? state : structuredClone(defaultState);
  next.meta = next.meta || { actionSeq: 0, disputeSeq: 0 };
  next.meta.actionSeq = Number(next.meta.actionSeq || 0);
  next.meta.disputeSeq = Number(next.meta.disputeSeq || 0);
  next.agents = next.agents || {};

  for (const [key, agent] of Object.entries(next.agents)) {
    agent.address = String(agent.address || key).toLowerCase();
    agent.operator = String(agent.operator || agent.address).toLowerCase();
    agent.actions = Array.isArray(agent.actions) ? agent.actions : [];
    agent.disputes = Array.isArray(agent.disputes) ? agent.disputes : [];
    for (const action of agent.actions) {
      action.status = action.status || 'VALID';
      action.seq = Number(action.seq || 0);
      action.source = action.source || 'seed';
    }
    for (const dispute of agent.disputes) {
      dispute.id = Number(dispute.id || 0);
    }
  }

  return next;
}

function ensureAgent(state, address) {
  const key = address.toLowerCase();
  const existing = state.agents[key];
  if (existing) {
    existing.actions = Array.isArray(existing.actions) ? existing.actions : [];
    existing.disputes = Array.isArray(existing.disputes) ? existing.disputes : [];
    return existing;
  }

  const created = {
    address: key,
    operator: key,
    agentId: Object.keys(state.agents).length + 1,
    registeredAt: new Date().toISOString(),
    actions: [],
    disputes: []
  };
  state.agents[key] = created;
  return created;
}

export function upsertAgent(agent) {
  const state = normalizeState(loadState());
  const prev = state.agents[agent.address.toLowerCase()] || { actions: [] };

  state.agents[agent.address.toLowerCase()] = {
    ...prev,
    ...agent,
    address: agent.address.toLowerCase(),
    operator: (agent.operator || prev.operator || agent.address).toLowerCase(),
    actions: prev.actions || [],
    disputes: prev.disputes || []
  };

  saveState(state);
}

export function addAction(address, action) {
  const state = normalizeState(loadState());
  const existing = ensureAgent(state, address);
  state.meta.actionSeq += 1;
  const normalized = {
    actionId: String(action.actionId),
    scores: Array.isArray(action.scores) ? action.scores.map((v) => Number(v || 0)) : [0, 0, 0, 0, 0],
    timestamp: action.timestamp || new Date().toISOString(),
    source: action.source || 'seed',
    status: action.status || 'VALID',
    seq: state.meta.actionSeq
  };
  existing.actions.push(normalized);

  saveState(state);
  return {
    address: existing.address,
    agentId: String(existing.agentId),
    action: normalized
  };
}

export function addDispute(address, dispute) {
  const state = normalizeState(loadState());
  const existing = ensureAgent(state, address);
  const actionId = String(dispute.actionId || '');

  let accepted = Boolean(dispute.accepted);
  let invalidated = false;
  if (accepted) {
    const target = existing.actions.find((a) => String(a.actionId) === actionId && a.status !== 'INVALID');
    if (target) {
      target.status = 'INVALID';
      invalidated = true;
    } else {
      accepted = false;
    }
  }

  state.meta.disputeSeq += 1;
  const record = {
    id: state.meta.disputeSeq,
    actionId,
    accepted,
    reason: dispute.reason || 'demo-dispute',
    finalizedAt: dispute.finalizedAt || new Date().toISOString()
  };
  existing.disputes.push(record);
  saveState(state);
  return { ...record, invalidated };
}

export function resetState() {
  saveState(structuredClone(defaultState));
}

export function getMeta() {
  const state = normalizeState(loadState());
  return {
    agents: Object.keys(state.agents).length,
    actions: state.meta.actionSeq,
    disputes: state.meta.disputeSeq
  };
}

export function listActions({ agentAddress = '', limit = 20, cursor = null } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 20)));
  const state = normalizeState(loadState());
  const key = agentAddress ? String(agentAddress).toLowerCase() : '';
  const rows = [];

  for (const agent of Object.values(state.agents)) {
    if (key && agent.address !== key) continue;
    for (const action of agent.actions || []) {
      rows.push({
        address: agent.address,
        operator: agent.operator,
        agentId: String(agent.agentId),
        actionId: action.actionId,
        scores: action.scores || [0, 0, 0, 0, 0],
        status: action.status || 'VALID',
        timestamp: action.timestamp,
        seq: Number(action.seq || 0)
      });
    }
  }

  rows.sort((a, b) => {
    if (b.seq !== a.seq) return b.seq - a.seq;
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return tb - ta;
  });

  let filtered = rows;
  if (cursor !== null && cursor !== undefined && cursor !== '') {
    const c = Number(cursor);
    if (Number.isFinite(c) && c > 0) {
      filtered = rows.filter((r) => r.seq < c);
    }
  }

  const items = filtered.slice(0, safeLimit);
  const nextCursor = filtered.length > safeLimit ? String(items[items.length - 1].seq) : null;
  return { items, nextCursor };
}

export function listAgents() {
  return Object.values(normalizeState(loadState()).agents);
}

export function getAgent(address) {
  return normalizeState(loadState()).agents[address.toLowerCase()] || null;
}

export function seedDemo(payload) {
  const state = normalizeState(loadState());

  for (const agent of payload.agents || []) {
    const key = agent.address.toLowerCase();
    state.agents[key] = {
      address: key,
      agentId: agent.agentId,
      operator: agent.operator || key,
      registeredAt: agent.registeredAt || new Date().toISOString(),
      actions: [],
      disputes: Array.isArray(agent.disputes) ? agent.disputes : []
    };

    for (const action of agent.actions || []) {
      state.meta.actionSeq += 1;
      state.agents[key].actions.push({
        actionId: String(action.actionId),
        scores: Array.isArray(action.scores) ? action.scores : [0, 0, 0, 0, 0],
        timestamp: action.timestamp || new Date().toISOString(),
        source: action.source || 'seed',
        status: action.status || 'VALID',
        seq: state.meta.actionSeq
      });
    }
  }

  for (const action of payload.actions || []) {
    const agent = ensureAgent(state, action.address);
    state.meta.actionSeq += 1;
    agent.actions.push({
      actionId: String(action.actionId),
      scores: Array.isArray(action.scores) ? action.scores : [0, 0, 0, 0, 0],
      timestamp: action.timestamp || new Date().toISOString(),
      source: action.source || 'seed',
      status: action.status || 'VALID',
      seq: state.meta.actionSeq
    });
  }

  for (const dispute of payload.disputes || []) {
    const agent = ensureAgent(state, dispute.address);
    state.meta.disputeSeq += 1;
    const actionId = String(dispute.actionId || '');
    let accepted = Boolean(dispute.accepted);
    if (accepted) {
      const target = agent.actions.find((a) => String(a.actionId) === actionId && a.status !== 'INVALID');
      if (target) target.status = 'INVALID';
      else accepted = false;
    }
    agent.disputes.push({
      id: state.meta.disputeSeq,
      actionId,
      accepted,
      reason: dispute.reason || 'seed-dispute',
      finalizedAt: dispute.finalizedAt || new Date().toISOString()
    });
  }

  saveState(state);
}
