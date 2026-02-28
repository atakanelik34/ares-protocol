import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getFreePort, startGateway, stopChild, waitForServer } from './helpers.js';

test('nonce is single-use in auth verify', async (t) => {
  const port = await getFreePort();
  const server = startGateway({
    PORT: String(port)
  });
  t.after(() => stopChild(server.child));

  await waitForServer(port, server);

  const account = privateKeyToAccount(generatePrivateKey());

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
});
