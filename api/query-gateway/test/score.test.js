import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAri, tierFromAri } from '../src/scoring.js';

test('tier mapping boundaries', () => {
  assert.equal(tierFromAri(99), 'UNVERIFIED');
  assert.equal(tierFromAri(100), 'PROVISIONAL');
  assert.equal(tierFromAri(300), 'ESTABLISHED');
  assert.equal(tierFromAri(600), 'TRUSTED');
  assert.equal(tierFromAri(850), 'ELITE');
});

test('computeAri returns since and action count', () => {
  const now = new Date();
  const actions = [
    { scores: [100, 100, 100, 100, 100], timestamp: new Date(now.getTime() - 86400000).toISOString() },
    { scores: [120, 120, 120, 120, 120], timestamp: now.toISOString() }
  ];

  const out = computeAri(actions);
  assert.ok(out.ari >= 0);
  assert.equal(out.actions, 2);
  assert.ok(out.since);
});
