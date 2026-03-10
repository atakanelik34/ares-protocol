#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const bannedLiterals = [
  {
    value: '0x59c6995e998f97a5a0044966f094538dc9f95a8c9f7fd6f9f4f3f72f6e9b0d3a',
    reason: 'historical exposed test private key must never reappear in tracked files'
  }
];

let hasViolation = false;

for (const literal of bannedLiterals) {
  const result = spawnSync('git', ['grep', '-n', '--fixed-strings', '--', literal.value], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status === 0) {
    hasViolation = true;
    process.stderr.write(
      `BANNED_LITERAL_DETECTED: ${literal.reason}\n` +
      `Literal: ${literal.value}\n` +
      `${result.stdout}\n`
    );
    continue;
  }

  if (result.status !== 1) {
    process.stderr.write(result.stderr || `git grep failed for literal: ${literal.value}\n`);
    process.exit(2);
  }
}

if (hasViolation) {
  process.exit(1);
}

process.stdout.write('banned literal scan passed\n');
