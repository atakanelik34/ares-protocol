import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relPath) {
  return readFileSync(path.resolve(repoRoot, relPath), 'utf8');
}

test('tokenomics constants satisfy allocation and TGE arithmetic', () => {
  const constants = JSON.parse(readRepoFile('docs/tokenomics.constants.json'));
  const total = BigInt(constants.supply.totalSupplyTokens);
  const allocation = constants.allocation.reduce((acc, row) => acc + BigInt(row.tokens), 0n);
  const tge = constants.tge.components.reduce((acc, row) => acc + BigInt(row.tokens), 0n);

  assert.equal(allocation, total);
  assert.equal(tge, BigInt(constants.tge.targetCirculatingTokens));
  assert.equal(BigInt(constants.seed.maxTokens), 80_000_000n);
  assert.equal(BigInt(constants.seed.tgeUnlockTokens), 0n);
});

test('tokenomics validation artifact is reproducible via calc script', () => {
  execFileSync('node', ['scripts/tokenomics/calc-tokenomics.mjs'], {
    cwd: repoRoot,
    stdio: 'pipe'
  });

  const artifact = JSON.parse(readRepoFile('docs/tokenomics-validation.json'));
  assert.equal(artifact.constantsVersion, '2.1');
  assert.equal(artifact.invariants.allocationSumEqualsTotalSupply, true);
  assert.equal(artifact.invariants.tgeSumEqualsTarget, true);
  assert.equal(artifact.invariants.seedTgeUnlockIsZero, true);
  assert.equal(artifact.invariants.categoryUnlockSumsMatchCategoryAllocations, true);
});

test('landing/readme/docs tokenomics messaging is synchronized', () => {
  const readme = readRepoFile('README.md');
  const tokenomics = readRepoFile('docs/tokenomics.md');
  const landing = readRepoFile('aresprotocol-v3.html');
  const antiDump = readRepoFile('docs/anti-dump-policy.md');

  for (const pct of ['22%', '20%', '18%', '8%', '4%', '2%']) {
    assert.match(tokenomics, new RegExp(pct.replace('%', '\\%')));
    assert.match(landing, new RegExp(pct.replace('%', '\\%')));
  }

  assert.match(readme, /\$400K cap/i);
  assert.doesNotMatch(readme, /guaranteed return|2x guarantee|2x TGE guarantee/i);
  assert.doesNotMatch(tokenomics, /guaranteed return|2x guarantee|2x TGE guarantee/i);
  assert.match(tokenomics, /illustrative, revenue-dependent, non-guaranteed/i);
  assert.match(antiDump, /contractual obligations, not on-chain transfer restrictions/i);
});
