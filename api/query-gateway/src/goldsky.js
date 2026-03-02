import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeEventLog } from 'viem';
import { computeAri } from './scoring.js';

const GOLDKSY_CACHE_MS = Math.max(5_000, Number(process.env.GOLDSKY_CACHE_MS || 15_000));

const TIER_MAP = {
  0: 'UNVERIFIED',
  1: 'PROVISIONAL',
  2: 'ESTABLISHED',
  3: 'TRUSTED',
  4: 'ELITE'
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadGoldskyRuntime(repoRoot, logger) {
  const addressesPath = resolve(repoRoot, 'deploy/contracts/addresses.base-sepolia.json');
  if (!existsSync(addressesPath)) {
    logger?.warn?.({ addressesPath }, 'goldsky addresses file missing');
    return null;
  }

  const addressesJson = readJson(addressesPath);
  const contracts = addressesJson?.contracts || {};
  const contractKinds = {
    [String(contracts.AresRegistry || '').toLowerCase()]: 'registry',
    [String(contracts.AresScorecardLedger || '').toLowerCase()]: 'ledger',
    [String(contracts.AresDispute || '').toLowerCase()]: 'dispute',
    [String(contracts.AresARIEngine || '').toLowerCase()]: 'ari',
    [String(contracts.AresApiAccess || '').toLowerCase()]: 'access'
  };

  const abiFiles = [
    'contracts/out/AresRegistry.sol/AresRegistry.json',
    'contracts/out/AresScorecardLedger.sol/AresScorecardLedger.json',
    'contracts/out/AresDispute.sol/AresDispute.json',
    'contracts/out/AresARIEngine.sol/AresARIEngine.json',
    'contracts/out/AresApiAccess.sol/AresApiAccess.json'
  ];

  const abi = abiFiles.flatMap((relPath) => {
    const fullPath = resolve(repoRoot, relPath);
    if (!existsSync(fullPath)) return [];
    return (readJson(fullPath).abi || []).filter((item) => item.type === 'event');
  });

  const trackedAddresses = Object.keys(contractKinds).filter((value) => /^0x[a-f0-9]{40}$/.test(value));
  if (!trackedAddresses.length || !abi.length) {
    logger?.warn?.('goldsky runtime missing tracked addresses or ABI');
    return null;
  }

  return { trackedAddresses, contractKinds, abi };
}

function normalizeTopics(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function asIsoFromValue(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const raw = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  const ms = raw > 1_000_000_000_000 ? raw : raw * 1000;
  return new Date(ms).toISOString();
}

function normalizeTier(value) {
  const key = Number(value);
  return TIER_MAP[key] || 'UNVERIFIED';
}

function toAgentIdHex(agentId) {
  return `0x${BigInt(agentId || 0).toString(16)}`;
}

function stringifyActionId(value) {
  return String(value || '').toLowerCase();
}

function normalizeAgentRef(value) {
  return String(value || '').trim().toLowerCase();
}

function toNumberArray(value) {
  return Array.isArray(value) ? value.map((item) => Number(item || 0)) : [];
}

function decodeRow(row, runtime) {
  try {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const topics = normalizeTopics(payload?.topics);
    if (!topics.length) return null;
    const decoded = decodeEventLog({
      abi: runtime.abi,
      topics,
      data: payload?.data || '0x',
      strict: false
    });
    return { payload, decoded };
  } catch {
    return null;
  }
}

function buildProjection(rows, runtime) {
  const agentsById = new Map();
  const disputesById = new Map();

  function ensureAgent(agentIdValue) {
    const agentId = String(agentIdValue || '0');
    let agent = agentsById.get(agentId);
    if (!agent) {
      agent = {
        address: '',
        operator: '',
        agentId,
        registeredAt: null,
        actions: [],
        disputes: [],
        actionMap: new Map(),
        disputeMap: new Map(),
        ari: null,
        tier: null,
        actionsCount: null,
        since: null
      };
      agentsById.set(agentId, agent);
    }
    return agent;
  }

  for (const row of rows) {
    const result = decodeRow(row, runtime);
    if (!result?.decoded) continue;

    const { decoded, payload } = result;
    const contractAddress = String(payload?.address || row.address || '').toLowerCase();
    const contractKind = runtime.contractKinds[contractAddress] || 'unknown';
    const eventName = decoded.eventName;
    const args = decoded.args || {};
    const rowTimestamp = asIsoFromValue(payload?.block_timestamp, row.created_at);

    if (eventName === 'AgentRegistered') {
      const agent = ensureAgent(args.agentId);
      agent.address = String(args.agent || '').toLowerCase();
      agent.operator = String(args.operator || args.agent || '').toLowerCase();
      agent.registeredAt = rowTimestamp;
      continue;
    }

    if (eventName === 'ARIUpdated') {
      const agent = ensureAgent(args.agentId);
      agent.ari = Number(args.ari || 0);
      agent.tier = normalizeTier(args.tier);
      agent.actionsCount = Number(args.actionsCount || 0);
      continue;
    }

    if (eventName === 'ActionScored') {
      const agent = ensureAgent(args.agent);
      const actionId = stringifyActionId(args.actionId);
      const action = {
        actionId,
        scores: toNumberArray(args.scores),
        timestamp: asIsoFromValue(args.timestamp, rowTimestamp),
        source: 'goldsky',
        status: 'VALID',
        seq: Number(row.id || 0),
        blockNumber: Number(payload?.block_number || row.block_number || 0),
        contract: contractKind,
        scorer: String(args.scorer || '').toLowerCase()
      };
      agent.actionMap.set(actionId, action);
      agent.actions.push(action);
      continue;
    }

    if (eventName === 'ActionInvalidated') {
      const agent = ensureAgent(args.agentId);
      const actionId = stringifyActionId(args.actionId);
      const action = agent.actionMap.get(actionId);
      if (action) action.status = 'INVALID';
      continue;
    }

    if (eventName === 'DisputeOpened') {
      const agent = ensureAgent(args.agent);
      const disputeId = String(args.disputeId || '0');
      const dispute = {
        id: Number(args.disputeId || 0),
        actionId: stringifyActionId(args.actionId),
        accepted: null,
        reason: String(args.reasonURI || ''),
        challenger: String(args.challenger || '').toLowerCase(),
        challengerStake: String(args.challengerStake || '0'),
        openedAt: rowTimestamp,
        finalizedAt: null,
        source: 'goldsky'
      };
      agent.disputeMap.set(disputeId, dispute);
      agent.disputes.push(dispute);
      disputesById.set(disputeId, { agentId: agent.agentId, dispute });
      continue;
    }

    if (eventName === 'ScoreInvalidated') {
      const agent = ensureAgent(args.agent);
      const disputeId = String(args.disputeId || '0');
      const actionId = stringifyActionId(args.actionId);
      const action = agent.actionMap.get(actionId);
      if (action) action.status = 'INVALID';
      const known = disputesById.get(disputeId);
      if (known?.dispute) {
        known.dispute.actionId = actionId;
      }
      continue;
    }

    if (eventName === 'DisputeFinalized') {
      const disputeId = String(args.disputeId || '0');
      const known = disputesById.get(disputeId);
      if (known?.dispute) {
        known.dispute.accepted = Boolean(args.accepted);
        known.dispute.finalizedAt = rowTimestamp;
      }
    }
  }

  const agents = Array.from(agentsById.values())
    .filter((agent) => /^0x[a-f0-9]{40}$/.test(agent.address))
    .map((agent) => {
      const fallbackScore = computeAri(agent.actions || []);
      const score = {
        ari: agent.ari ?? fallbackScore.ari,
        tier: agent.tier || fallbackScore.tier,
        actions: agent.actionsCount ?? fallbackScore.actions,
        since: agent.since || fallbackScore.since || agent.registeredAt
      };
      const disputeActionIds = new Set(
        agent.disputes
          .map((item) => stringifyActionId(item.actionId))
          .filter(Boolean)
      );
      const actions = [...agent.actions]
        .sort((a, b) => Number(b.seq || 0) - Number(a.seq || 0))
        .map((action) => ({
          ...action,
          isDisputed: disputeActionIds.has(action.actionId) || action.status === 'INVALID'
        }));
      const disputes = [...agent.disputes].sort((a, b) => {
        const at = new Date(a.finalizedAt || a.openedAt || 0).getTime();
        const bt = new Date(b.finalizedAt || b.openedAt || 0).getTime();
        return bt - at;
      });

      return {
        found: true,
        address: agent.address,
        operator: agent.operator || agent.address,
        agentId: agent.agentId,
        agentIdHex: toAgentIdHex(agent.agentId),
        registeredAt: agent.registeredAt,
        ari: score.ari,
        tier: score.tier,
        since: score.since,
        actionsCount: score.actions,
        actions,
        disputes
      };
    });

  const agentByAddress = new Map(agents.map((agent) => [agent.address, agent]));
  const agentById = new Map(agents.map((agent) => [agent.agentId, agent]));
  const agentByIdHex = new Map(agents.map((agent) => [agent.agentIdHex.toLowerCase(), agent]));
  const actions = agents
    .flatMap((agent) =>
      agent.actions.map((action) => ({
        address: agent.address,
        operator: agent.operator,
        agentId: agent.agentId,
        agentIdHex: agent.agentIdHex,
        actionId: action.actionId,
        scores: action.scores,
        status: action.status,
        timestamp: action.timestamp,
        seq: action.seq,
        source: action.source,
        ari: agent.ari,
        tier: agent.tier,
        actionsCount: agent.actionsCount,
        isDisputed: Boolean(action.isDisputed)
      }))
    )
    .sort((a, b) => Number(b.seq || 0) - Number(a.seq || 0));

  return { agents, agentByAddress, agentById, agentByIdHex, actions };
}

export function resolveGoldskyAgentRef(projection, agentRef) {
  const ref = normalizeAgentRef(agentRef);
  if (!ref) return null;
  if (projection.agentByAddress?.has(ref)) return projection.agentByAddress.get(ref) || null;
  if (projection.agentByIdHex?.has(ref)) return projection.agentByIdHex.get(ref) || null;
  if (/^\d+$/.test(ref) && projection.agentById?.has(ref)) return projection.agentById.get(ref) || null;
  return null;
}

export function createGoldskyProjectionLoader({ db, repoRoot, logger }) {
  const runtime = loadGoldskyRuntime(repoRoot, logger);
  let cache = {
    expiresAt: 0,
    value: {
      agents: [],
      agentByAddress: new Map(),
      agentById: new Map(),
      agentByIdHex: new Map(),
      actions: []
    }
  };

  return function loadGoldskyProjection() {
    if (!runtime) return cache.value;
    const now = Date.now();
    if (cache.expiresAt > now) return cache.value;

    const placeholders = runtime.trackedAddresses.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT id, address, block_number, payload, created_at
      FROM goldsky_ingest
      WHERE lower(address) IN (${placeholders})
      ORDER BY block_number ASC, id ASC
    `);
    const rows = stmt.all(...runtime.trackedAddresses);
    cache = {
      expiresAt: now + GOLDKSY_CACHE_MS,
      value: buildProjection(rows, runtime)
    };
    return cache.value;
  };
}
