import test from 'node:test';
import assert from 'node:assert/strict';
import { getFreePort, startGateway, stopChild, waitForServer } from './helpers.js';

test('waitlist endpoint accepts legacy payload', async (t) => {
  const port = await getFreePort();
  const server = startGateway({ PORT: String(port) });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const response = await fetch(`http://127.0.0.1:${port}/v1/waitlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'legacy@example.com'
    })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.assignedTierPreview, 'tier1');
});

test('waitlist endpoint accepts extended payload', async (t) => {
  const port = await getFreePort();
  const server = startGateway({ PORT: String(port) });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const response = await fetch(`http://127.0.0.1:${port}/v1/waitlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'tier2@example.com',
      lang: 'en',
      source: 'landing',
      tier_intent: 'tier2',
      has_testnet_agent: true,
      partner_ref: 'base-batches'
    })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.assignedTierPreview, 'tier2');
});

test('tokenomics summary endpoint exposes static model', async (t) => {
  const port = await getFreePort();
  const server = startGateway({ PORT: String(port) });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const response = await fetch(`http://127.0.0.1:${port}/v1/tokenomics/summary`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.version, '2.1');
  assert.equal(body.seed.raiseCapUsd, '400000');
  assert.equal(body.seed.maxTokens, '80000000');
  assert.equal(body.supply.totalSupplyTokens, '1000000000');
  assert.ok(Array.isArray(body.allocation));
  assert.equal(body.allocation.length, 8);
});
