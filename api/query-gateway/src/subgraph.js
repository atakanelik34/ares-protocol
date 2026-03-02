const SCORE_QUERY = `
query ScoreByOperator($operator: Bytes!) {
  agents(where: { operator: $operator }, first: 1) {
    id
    canonicalAgentId
    registeredAt
    ari
    tier
    validActionsCount
    firstActionAt
  }
}
`;

const AGENT_QUERY = `
query AgentByOperator($operator: Bytes!) {
  agents(where: { operator: $operator }, first: 1) {
    id
    canonicalAgentId
    operator
    registeredAt
    ari
    tier
    validActionsCount
    firstActionAt
  }
  actionScores(
    where: { agent_: { operator: $operator } }
    first: 20
    orderBy: timestamp
    orderDirection: desc
  ) {
    actionId
    score0
    score1
    score2
    score3
    score4
    timestamp
    status
  }
  disputes(
    where: { agent_: { operator: $operator } }
    first: 20
    orderBy: finalizedAt
    orderDirection: desc
  ) {
    id
    actionId
    accepted
    finalizedAt
  }
}
`;

const LEADERBOARD_QUERY = `
query Leaderboard($limit: Int!) {
  agents(first: $limit, orderBy: ari, orderDirection: desc) {
    id
    canonicalAgentId
    operator
    registeredAt
    ari
    tier
    validActionsCount
    firstActionAt
  }
}
`;

const LEADERBOARD_WITH_TIER_QUERY = `
query LeaderboardTier($limit: Int!, $tier: String!) {
  agents(first: $limit, orderBy: ari, orderDirection: desc, where: { tier: $tier }) {
    id
    canonicalAgentId
    operator
    registeredAt
    ari
    tier
    validActionsCount
    firstActionAt
  }
}
`;

const ACTIONS_QUERY = `
query Actions($first: Int!, $skip: Int!) {
  actionScores(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
    id
    actionId
    score0
    score1
    score2
    score3
    score4
    timestamp
    status
    agent {
      canonicalAgentId
      operator
      ari
      tier
      validActionsCount
    }
  }
}
`;

const ACTIONS_BY_OPERATOR_QUERY = `
query ActionsByOperator($first: Int!, $skip: Int!, $operator: Bytes!) {
  actionScores(
    first: $first
    skip: $skip
    orderBy: timestamp
    orderDirection: desc
    where: { agent_: { operator: $operator } }
  ) {
    id
    actionId
    score0
    score1
    score2
    score3
    score4
    timestamp
    status
    agent {
      canonicalAgentId
      operator
      ari
      tier
      validActionsCount
    }
  }
}
`;

const TIER_MAP = {
  0: 'UNVERIFIED',
  1: 'PROVISIONAL',
  2: 'ESTABLISHED',
  3: 'TRUSTED',
  4: 'ELITE',
  UNVERIFIED: 'UNVERIFIED',
  PROVISIONAL: 'PROVISIONAL',
  ESTABLISHED: 'ESTABLISHED',
  TRUSTED: 'TRUSTED',
  ELITE: 'ELITE'
};

const SUBGRAPH_TIMEOUT_MS = Math.max(500, Number(process.env.SUBGRAPH_TIMEOUT_MS || 3000));

function normalizeTier(value) {
  const key = String(value ?? '0').toUpperCase();
  return TIER_MAP[key] || 'UNVERIFIED';
}

function asIso(value) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

function fromAgentRow(agent) {
  const since = asIso(agent.firstActionAt) || asIso(agent.registeredAt);
  return {
    agentId: String(agent.canonicalAgentId || '0'),
    agentIdHex: `0x${BigInt(agent.canonicalAgentId || 0).toString(16)}`,
    ari: Number(agent.ari || 0),
    tier: normalizeTier(agent.tier),
    actions: Number(agent.validActionsCount || 0),
    since
  };
}

function fromActionRow(row) {
  const agent = row?.agent || {};
  const agentId = String(agent.canonicalAgentId || '0');
  return {
    id: String(row?.id || ''),
    address: String(agent.operator || '').toLowerCase(),
    operator: String(agent.operator || '').toLowerCase(),
    agentId,
    agentIdHex: `0x${BigInt(agentId || 0).toString(16)}`,
    actionId: row?.actionId,
    scores: [
      Number(row?.score0 || 0),
      Number(row?.score1 || 0),
      Number(row?.score2 || 0),
      Number(row?.score3 || 0),
      Number(row?.score4 || 0)
    ],
    status: row?.status || 'VALID',
    timestamp: asIso(row?.timestamp),
    ari: Number(agent.ari || 0),
    tier: normalizeTier(agent.tier),
    actionsCount: Number(agent.validActionsCount || 0),
    isDisputed: String(row?.status || '').toUpperCase() === 'INVALID'
  };
}

async function querySubgraph(url, apiKey, query, variables) {
  if (!url) return null;
  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUBGRAPH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') return null;
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return null;
  const body = await response.json();
  if (body?.errors?.length) return null;
  return body.data || null;
}

export async function getScoreFromSubgraph(url, apiKey, agentAddress) {
  try {
    const data = await querySubgraph(url, apiKey, SCORE_QUERY, { operator: agentAddress.toLowerCase() });
    const agent = data?.agents?.[0];
    if (!agent) return null;
    return fromAgentRow(agent);
  } catch {
    return null;
  }
}

export async function getAgentFromSubgraph(url, apiKey, agentAddress) {
  try {
    const data = await querySubgraph(url, apiKey, AGENT_QUERY, { operator: agentAddress.toLowerCase() });
    const agent = data?.agents?.[0];
    if (!agent) return null;

    const score = fromAgentRow(agent);
    const actions = (data?.actionScores || []).map((row) => ({
      actionId: row.actionId,
      scores: [row.score0, row.score1, row.score2, row.score3, row.score4].map((n) => Number(n || 0)),
      status: row.status || 'VALID',
      timestamp: asIso(row.timestamp)
    }));
    const disputes = (data?.disputes || []).map((d) => ({
      id: d.id,
      actionId: d.actionId,
      accepted: d.accepted,
      finalizedAt: asIso(d.finalizedAt)
    }));

    return {
      found: true,
      address: agentAddress.toLowerCase(),
      agentId: score.agentId,
      agentIdHex: score.agentIdHex,
      operator: agent.operator || agentAddress.toLowerCase(),
      registeredAt: asIso(agent.registeredAt),
      ari: score.ari,
      tier: score.tier,
      since: score.since,
      actionsCount: score.actions,
      actions,
      disputes
    };
  } catch {
    return null;
  }
}

export async function getLeaderboardFromSubgraph(url, apiKey, { limit, tier }) {
  try {
    const query = tier ? LEADERBOARD_WITH_TIER_QUERY : LEADERBOARD_QUERY;
    const vars = tier ? { limit, tier: tier.toUpperCase() } : { limit };
    const data = await querySubgraph(url, apiKey, query, vars);
    const rows = data?.agents || [];
    return rows.map((agent) => ({
      address: String(agent.operator || '').toLowerCase(),
      ...fromAgentRow(agent)
    }));
  } catch {
    return null;
  }
}

export async function getActionsFromSubgraph(url, apiKey, { agentAddress = '', max = 5000 } = {}) {
  try {
    if (!url) return null;
    const pageSize = 1000;
    const safeMax = Math.max(100, Math.min(20_000, Number(max || 5000)));
    const normalizedOperator = String(agentAddress || '').toLowerCase();
    const rows = [];

    for (let skip = 0; skip < safeMax; skip += pageSize) {
      const take = Math.min(pageSize, safeMax - skip);
      const isOperator = /^0x[a-f0-9]{40}$/.test(normalizedOperator);
      const query = isOperator ? ACTIONS_BY_OPERATOR_QUERY : ACTIONS_QUERY;
      const variables = isOperator
        ? { first: take, skip, operator: normalizedOperator }
        : { first: take, skip };
      const data = await querySubgraph(url, apiKey, query, variables);
      const batch = data?.actionScores || [];
      if (batch.length === 0) break;
      rows.push(...batch.map(fromActionRow));
      if (batch.length < take) break;
    }

    return rows;
  } catch {
    return null;
  }
}
