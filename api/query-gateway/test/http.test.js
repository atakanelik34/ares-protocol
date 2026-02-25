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
