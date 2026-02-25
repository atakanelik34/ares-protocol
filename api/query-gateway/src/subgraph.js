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

async function querySubgraph(url, apiKey, query, variables) {
  if (!url) return null;
  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

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
