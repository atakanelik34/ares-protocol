import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const statePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'demo-state.json');

const defaultState = {
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

export function upsertAgent(agent) {
  const state = loadState();
  const prev = state.agents[agent.address.toLowerCase()] || { actions: [] };

  state.agents[agent.address.toLowerCase()] = {
    ...prev,
    ...agent,
    address: agent.address.toLowerCase(),
    actions: prev.actions || []
  };

  saveState(state);
}

export function addAction(address, action) {
  const state = loadState();
  const key = address.toLowerCase();
  const existing = state.agents[key] || {
    address: key,
    agentId: Object.keys(state.agents).length + 1,
    actions: [],
    registeredAt: new Date().toISOString()
  };

  existing.actions = existing.actions || [];
  existing.actions.push(action);
  state.agents[key] = existing;

  saveState(state);
}

export function listAgents() {
  return Object.values(loadState().agents);
}

export function getAgent(address) {
  return loadState().agents[address.toLowerCase()] || null;
}

export function seedDemo(payload) {
  const state = loadState();

  for (const agent of payload.agents || []) {
    const key = agent.address.toLowerCase();
    state.agents[key] = {
      address: key,
      agentId: agent.agentId,
      operator: agent.operator || key,
      registeredAt: agent.registeredAt || new Date().toISOString(),
      actions: agent.actions || []
    };
  }

  for (const action of payload.actions || []) {
    const key = action.address.toLowerCase();
    if (!state.agents[key]) {
      state.agents[key] = {
        address: key,
        agentId: Object.keys(state.agents).length + 1,
        operator: key,
        registeredAt: new Date().toISOString(),
        actions: []
      };
    }
    state.agents[key].actions.push(action);
  }

  saveState(state);
}
