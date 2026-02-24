import test from 'node:test';
import assert from 'node:assert/strict';
import { deterministicScores } from '../src/scorer.js';

test('deterministicScores returns 5 bounded dimensions', () => {
  const scores = deterministicScores({ actionId: 'abc' });
  assert.equal(scores.length, 5);
  for (const score of scores) {
    assert.ok(score >= 0);
    assert.ok(score <= 200);
  }
});
