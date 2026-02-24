import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('agent explorer page exists', () => {
  assert.ok(fs.existsSync(new URL('../app/page.js', import.meta.url)));
});
