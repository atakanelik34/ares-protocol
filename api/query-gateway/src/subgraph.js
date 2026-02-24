const SCORE_QUERY = `
query Score($agent: String!) {
  agent(id: $agent) {
    id
    canonicalAgentId
    ari
    tier
    validActionsCount
    firstActionAt
  }
}
`;

export async function getScoreFromSubgraph(url, apiKey, agentAddress) {
  if (!url) return null;

  try {
    const headers = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: SCORE_QUERY,
        variables: { agent: agentAddress.toLowerCase() }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const agent = data?.data?.agent;
    if (!agent) return null;

    return {
      agentId: String(agent.canonicalAgentId || '0'),
      agentIdHex: `0x${BigInt(agent.canonicalAgentId || 0).toString(16)}`,
      ari: Number(agent.ari || 0),
      tier: agent.tier || 'UNVERIFIED',
      actions: Number(agent.validActionsCount || 0),
      since: agent.firstActionAt ? new Date(Number(agent.firstActionAt) * 1000).toISOString() : null
    };
  } catch {
    return null;
  }
}
