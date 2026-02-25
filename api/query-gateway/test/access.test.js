import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessChecker } from '../src/access.js';

test('access checker required mode fails without contract config', async () => {
  assert.throws(() => createAccessChecker({ env: { ACCESS_CHECK_MODE: 'required' } }), /missing/i);
});

test('access checker optional mode degrades without contract config', async () => {
  const checker = createAccessChecker({ env: { ACCESS_CHECK_MODE: 'optional' }, logger: { warn() {} } });
  const result = await checker.check('0x0000000000000000000000000000000000000001');
  assert.equal(result.enabled, false);
  assert.equal(result.hasAccess, true);
});

test('access checker denies when on-chain expiry is in the past', async () => {
  const checker = createAccessChecker({
    env: {
      ACCESS_CHECK_MODE: 'required',
      BASE_SEPOLIA_RPC_URL: 'https://sepolia.base.org',
      ARES_API_ACCESS_ADDRESS: '0x0000000000000000000000000000000000000001'
    },
    readAccessExpiry: async () => BigInt(Math.floor(Date.now() / 1000) - 60)
  });
  const result = await checker.check('0x0000000000000000000000000000000000000002');
  assert.equal(result.enabled, true);
  assert.equal(result.hasAccess, false);
});

test('access checker allows when on-chain expiry is in the future', async () => {
  const checker = createAccessChecker({
    env: {
      ACCESS_CHECK_MODE: 'required',
      BASE_SEPOLIA_RPC_URL: 'https://sepolia.base.org',
      ARES_API_ACCESS_ADDRESS: '0x0000000000000000000000000000000000000001'
    },
    readAccessExpiry: async () => BigInt(Math.floor(Date.now() / 1000) + 60)
  });
  const result = await checker.check('0x0000000000000000000000000000000000000002');
  assert.equal(result.enabled, true);
  assert.equal(result.hasAccess, true);
});

