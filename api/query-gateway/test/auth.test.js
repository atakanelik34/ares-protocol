import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';

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

test('nonce is single-use in auth verify', async (t) => {
  const port = 3912;
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const child = spawn('node', ['src/index.js'], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: 'sqlite::memory:',
      SUBGRAPH_QUERY_URL: '',
      SUBGRAPH_API_KEY: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await waitForServer(port);

  const account = privateKeyToAccount('<REDACTED_TEST_PRIVATE_KEY>');

  const challengeRes = await fetch(`http://127.0.0.1:${port}/v1/auth/challenge?account=${account.address}`);
  const challenge = await challengeRes.json();
  assert.equal(challengeRes.status, 200);

  const signature = await account.signMessage({ message: challenge.message });

  const verifyOnce = await fetch(`http://127.0.0.1:${port}/v1/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account: account.address, nonce: challenge.nonce, signature })
  });
  assert.equal(verifyOnce.status, 200);

  const verifyTwice = await fetch(`http://127.0.0.1:${port}/v1/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account: account.address, nonce: challenge.nonce, signature })
  });
  assert.equal(verifyTwice.status, 400);

  child.kill('SIGTERM');
  await sleep(300);

  t.after(() => {
    if (!child.killed) child.kill('SIGKILL');
  });
});
