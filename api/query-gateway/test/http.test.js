import test from 'node:test';
import assert from 'node:assert/strict';
import { getFreePort, startGateway, stopChild, waitForServer } from './helpers.js';

test('score endpoint returns expected shape with since', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ALLOW_UNAUTH_SEED: 'true'
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

test('root endpoint serves landing-style API hub', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ALLOW_UNAUTH_SEED: 'true'
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

test('actions endpoint supports pagination cursor', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ALLOW_UNAUTH_SEED: 'true'
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
    ALLOW_UNAUTH_SEED: 'true'
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

test('demo alias resolves to current demo address', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port),
    ALLOW_UNAUTH_SEED: 'true'
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
