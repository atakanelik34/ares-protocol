import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      DATABASE_URL: 'sqlite::memory:'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await sleep(1200);

  const agent = '0x1111111111111111111111111111111111111111';
  await fetch(`http://127.0.0.1:${port}/internal/demo/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agents: [{ address: agent, agentId: 1, operator: agent, registeredAt: new Date().toISOString() }],
      actions: [{ address: agent, actionId: 'a1', scores: [100, 100, 100, 100, 100], timestamp: new Date().toISOString() }]
    })
  });

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
