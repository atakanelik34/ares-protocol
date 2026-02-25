import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(port, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/health`);
      if (res.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`server did not start on :${port}`);
}

test('score endpoint returns expected shape with since', async (t) => {
  const port = 3911;
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const child = spawn('node', ['src/index.js'], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      ALLOW_UNAUTH_SEED: 'true',
      DATABASE_URL: 'sqlite::memory:',
      SUBGRAPH_QUERY_URL: '',
      SUBGRAPH_API_KEY: '',
      ACCESS_CHECK_MODE: 'off'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await waitForServer(port);

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

  child.kill('SIGTERM');
  await sleep(300);

  t.after(() => {
    if (!child.killed) child.kill('SIGKILL');
  });
});

test('root endpoint serves landing-style API hub', async (t) => {
  const port = 3912;
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const child = spawn('node', ['src/index.js'], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      ALLOW_UNAUTH_SEED: 'true',
      DATABASE_URL: 'sqlite::memory:',
      SUBGRAPH_QUERY_URL: '',
      SUBGRAPH_API_KEY: '',
      ACCESS_CHECK_MODE: 'off'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await waitForServer(port);

  const response = await fetch(`http://127.0.0.1:${port}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/i);
  assert.match(body, /ARES API Gateway/i);
  assert.match(body, /\/v1\/health/i);

  child.kill('SIGTERM');
  await sleep(300);

  t.after(() => {
    if (!child.killed) child.kill('SIGKILL');
  });
});
