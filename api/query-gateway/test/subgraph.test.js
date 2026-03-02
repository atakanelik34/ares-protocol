import test from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;

test('subgraph fetch timeout degrades to null payloads', async () => {
  process.env.SUBGRAPH_TIMEOUT_MS = '20';

  globalThis.fetch = (_url, { signal } = {}) =>
    new Promise((_, reject) => {
      signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });

  const { getLeaderboardFromSubgraph } = await import(`../src/subgraph.js?timeout-test=${Date.now()}`);
  const rows = await getLeaderboardFromSubgraph('https://example.invalid/graphql', 'secret', { limit: 3 });
  assert.deepEqual(rows, []);
});

test.after(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SUBGRAPH_TIMEOUT_MS;
});
