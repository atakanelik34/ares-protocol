import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { getFreePort, startGateway, stopChild, waitForServer } from './helpers.js';

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const contractAddresses = JSON.parse(
  readFileSync(path.join(fixtureDir, 'deploy/contracts/addresses.base-sepolia.json'), 'utf8')
).contracts;
const agentRegisteredAbi = [
  {
    type: 'event',
    name: 'AgentRegistered',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'operator', type: 'address', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true }
    ],
    anonymous: false
  }
];
const actionScoredAbi = [
  {
    type: 'event',
    name: 'ActionScored',
    inputs: [
      { name: 'agent', type: 'uint256', indexed: true },
      { name: 'actionId', type: 'bytes32', indexed: true },
      { name: 'scores', type: 'uint16[5]', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
      { name: 'scorer', type: 'address', indexed: false }
    ],
    anonymous: false
  }
];
const DEMO_ENV = {
  ALLOW_UNAUTH_SEED: 'true',
  ENABLE_INTERNAL_DEMO: 'true'
};

test('score endpoint returns expected shape with since', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const agent = '0x1111111111111111111111111111111111111111';
  const seedRes = await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: agent, agentId: 1, operator: agent, registeredAt: new Date().toISOString() }]
    })
  });
  assert.equal(seedRes.status, 200);

  const actionTimestamp = new Date().toISOString();
  const actionRes = await fetch(`http://127.0.0.1:${port}/internal/demo/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      address: agent,
      actionId: 'a1',
      scores: [100, 100, 100, 100, 100],
      timestamp: actionTimestamp
    })
  });
  assert.equal(actionRes.status, 200);

  const response = await fetch(`http://127.0.0.1:${port}/v1/score/${agent}`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof body.agentId, 'string');
  assert.equal(typeof body.agentIdHex, 'string');
  assert.equal(typeof body.ari, 'number');
  assert.equal(typeof body.tier, 'string');
  assert.equal(typeof body.actions, 'number');
  assert.ok(body.since);
});

test('root endpoint serves landing-style API hub outside production', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const response = await fetch(`http://127.0.0.1:${port}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/i);
  assert.match(body, /ARES API Gateway/i);
  assert.match(body, /\/v1\/health/i);
});

test('root endpoint redirects to explorer leaderboard in production', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV,
    NODE_ENV: 'production'
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://app.ares-protocol.xyz/?tab=leaderboard');
});

test('root endpoint can still expose API hub in production when explicitly enabled', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV,
    NODE_ENV: 'production',
    EXPOSE_API_HUB_ROOT: 'true'
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const response = await fetch(`http://127.0.0.1:${port}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/i);
  assert.match(body, /ARES API Gateway/i);
});

test('actions endpoint supports pagination cursor', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const agent = '0x1111111111111111111111111111111111111111';
  await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: agent, agentId: 1, operator: agent, registeredAt: new Date().toISOString() }]
    })
  });

  for (let i = 0; i < 5; i++) {
    await fetch(`http://127.0.0.1:${port}/internal/demo/action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address: agent,
        actionId: `a-${i + 1}`,
        scores: [100, 100, 100, 100, 100],
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      })
    });
  }

  const page1 = await fetch(`http://127.0.0.1:${port}/v1/actions?agent=${agent}&limit=2`);
  const body1 = await page1.json();
  assert.equal(page1.status, 200);
  assert.equal(body1.items.length, 2);
  assert.ok(body1.nextCursor);

  const page2 = await fetch(`http://127.0.0.1:${port}/v1/actions?agent=${agent}&limit=2&cursor=${body1.nextCursor}`);
  const body2 = await page2.json();
  assert.equal(page2.status, 200);
  assert.ok(body2.items.length >= 1);
});

test('actions endpoint supports numeric page pagination', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const agent = '0x1111111111111111111111111111111111111111';
  await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: agent, agentId: 1, operator: agent, registeredAt: new Date().toISOString() }]
    })
  });

  for (let i = 0; i < 7; i++) {
    await fetch(`http://127.0.0.1:${port}/internal/demo/action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address: agent,
        actionId: `p-${i + 1}`,
        scores: [100, 100, 100, 100, 100],
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      })
    });
  }

  const page2 = await fetch(`http://127.0.0.1:${port}/v1/actions?agent=${agent}&limit=3&page=2`);
  const body = await page2.json();
  assert.equal(page2.status, 200);
  assert.equal(body.items.length, 3);
  assert.equal(body.pagination.page, 2);
  assert.equal(body.pagination.totalPages, 3);
});

test('agents alias mirrors leaderboard payload', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const agentA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const agentB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [
        { address: agentA, agentId: 1, operator: agentA, registeredAt: new Date().toISOString() },
        { address: agentB, agentId: 2, operator: agentB, registeredAt: new Date().toISOString() }
      ]
    })
  });

  await fetch(`http://127.0.0.1:${port}/internal/demo/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      address: agentA,
      actionId: 'rank-1',
      scores: [200, 200, 200, 200, 200],
      timestamp: new Date().toISOString()
    })
  });

  const response = await fetch(`http://127.0.0.1:${port}/v1/agents?limit=100`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.length >= 2);
  assert.equal(typeof body.items[0].address, 'string');
  assert.equal(typeof body.items[0].ari, 'number');
});

test('history alias mirrors actions pagination', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const agent = '0x1111111111111111111111111111111111111111';
  await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: agent, agentId: 1, operator: agent, registeredAt: new Date().toISOString() }]
    })
  });

  for (let i = 0; i < 6; i++) {
    await fetch(`http://127.0.0.1:${port}/internal/demo/action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address: agent,
        actionId: `hx-${i + 1}`,
        scores: [100, 100, 100, 100, 100],
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      })
    });
  }

  const response = await fetch(`http://127.0.0.1:${port}/v1/history?agent=${agent}&limit=2&page=2`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.items.length, 2);
  assert.equal(body.pagination.page, 2);
  assert.equal(body.pagination.totalPages, 3);
});

test('demo alias resolves to current demo address', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const currentDemo1 = '0x0000000000000000000000000000000000000001';
  await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: currentDemo1, agentId: 1, operator: currentDemo1, registeredAt: new Date().toISOString() }]
    })
  });

  const response = await fetch(`http://127.0.0.1:${port}/v1/agent/demo-1`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.found, true);
  assert.equal(body.address, currentDemo1);
});

test('agent and score endpoints prefer Goldsky match over demo alias fallback', async (t) => {
  const port = await getFreePort();
  const goldskyToken = 'test-goldsky-token';
  const server = startGateway({
    PORT: String(port),
    ...DEMO_ENV,
    GOLDSKY_WEBHOOK_TOKEN: goldskyToken
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const currentDemo3 = '0x0000000000000000000000000000000000000003';
  const legacyDemo3 = '0x3000000000000000000000000000000000000003';
  const registeredAt = '2026-02-24T23:35:36.000Z';

  const seedRes = await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: currentDemo3, agentId: 3, operator: currentDemo3, registeredAt }]
    })
  });
  assert.equal(seedRes.status, 200);

  const topics = encodeEventTopics({
    abi: agentRegisteredAbi,
    eventName: 'AgentRegistered',
    args: {
      agent: legacyDemo3,
      operator: legacyDemo3,
      agentId: 3n
    }
  });

  const ingestRes = await fetch(
    `http://127.0.0.1:${port}/v1/indexer/goldsky/raw-logs?token=${goldskyToken}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            address: contractAddresses.AresRegistry,
            topics,
            data: '0x',
            block_number: 38100000,
            block_timestamp: '2026-02-24T23:35:36.000Z'
          }
        ]
      })
    }
  );
  assert.equal(ingestRes.status, 200);

  const agentRes = await fetch(`http://127.0.0.1:${port}/v1/agent/${legacyDemo3}`);
  const agentBody = await agentRes.json();
  assert.equal(agentRes.status, 200);
  assert.equal(agentBody.found, true);
  assert.equal(agentBody.address, legacyDemo3);
  assert.equal(agentBody.operator, legacyDemo3);
  assert.equal(agentBody.agentId, '3');

  const scoreRes = await fetch(`http://127.0.0.1:${port}/v1/score/${legacyDemo3}`);
  const scoreBody = await scoreRes.json();
  assert.equal(scoreRes.status, 200);
  assert.equal(scoreBody.agentId, '3');
  assert.equal(scoreBody.agentIdHex, '0x3');
});

test('internal demo routes return 404 when demo mode is disabled', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port)
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const metaRes = await fetch(`http://127.0.0.1:${port}/internal/demo/meta`);
  assert.equal(metaRes.status, 404);

  const seedRes = await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(seedRes.status, 404);
});

test('agents and history endpoints prefer Goldsky data before waiting on subgraph', async (t) => {
  const hangingSubgraph = createServer(() => {});
  await new Promise((resolve) => hangingSubgraph.listen(0, '127.0.0.1', resolve));
  t.after(() => hangingSubgraph.close());

  const subgraphPort = hangingSubgraph.address().port;
  const port = await getFreePort();
  const goldskyToken = 'test-goldsky-token';
  const legacyAgent = '0x3000000000000000000000000000000000000003';
  const scorer = '0x9999999999999999999999999999999999999999';
  const scoreTimestamp = BigInt(Math.floor(Date.parse('2026-02-24T23:35:36.000Z') / 1000));
  const server = startGateway({
    PORT: String(port),
    GOLDSKY_WEBHOOK_TOKEN: goldskyToken,
    SUBGRAPH_QUERY_URL: `http://127.0.0.1:${subgraphPort}/graphql`,
    SUBGRAPH_TIMEOUT_MS: '60000'
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const registrationTopics = encodeEventTopics({
    abi: agentRegisteredAbi,
    eventName: 'AgentRegistered',
    args: {
      agent: legacyAgent,
      operator: legacyAgent,
      agentId: 3n
    }
  });
  const actionTopics = encodeEventTopics({
    abi: actionScoredAbi,
    eventName: 'ActionScored',
    args: {
      agent: 3n,
      actionId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }
  });
  const actionData = encodeAbiParameters(
    [
      { name: 'scores', type: 'uint16[5]' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'scorer', type: 'address' }
    ],
    [[101, 102, 103, 104, 105], scoreTimestamp, scorer]
  );

  const ingestRes = await fetch(
    `http://127.0.0.1:${port}/v1/indexer/goldsky/raw-logs?token=${goldskyToken}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            address: contractAddresses.AresRegistry,
            topics: registrationTopics,
            data: '0x',
            block_number: 38100000,
            block_timestamp: '2026-02-24T23:35:36.000Z'
          },
          {
            address: contractAddresses.AresScorecardLedger,
            topics: actionTopics,
            data: actionData,
            block_number: 38100001,
            block_timestamp: '2026-02-24T23:35:37.000Z'
          }
        ]
      })
    }
  );
  assert.equal(ingestRes.status, 200);

  const agentsRes = await fetch(`http://127.0.0.1:${port}/v1/agents?limit=10`, {
    signal: AbortSignal.timeout(1000)
  });
  const agentsBody = await agentsRes.json();
  assert.equal(agentsRes.status, 200);
  assert.ok(agentsBody.items.some((item) => item.address === legacyAgent));

  const historyRes = await fetch(`http://127.0.0.1:${port}/v1/history?agent=${legacyAgent}&limit=10`, {
    signal: AbortSignal.timeout(1000)
  });
  const historyBody = await historyRes.json();
  assert.equal(historyRes.status, 200);
  assert.equal(historyBody.items.length, 1);
  assert.equal(historyBody.items[0].address, legacyAgent);
  assert.equal(historyBody.items[0].source, 'goldsky');
});
