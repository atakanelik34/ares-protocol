#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const forbiddenTrackedPrefixes = [
  'dashboard/protocol-admin/',
  'docs/audit/',
  'docs/certification/',
  'docs/launch/',
  'docs/rehearsal/',
  'docs/demo/',
  'docs/submission/',
  'docs/governance-handoff.md',
  'docs/production-deploy-gcp.md',
  'docs/security-ops.md',
  'docs/mainnet-certification-framework-v1.md',
  'docs/roadmap-source.md',
  'docs/base-batches-003-execution.md',
  'docs/tr/governance-handoff.tr.md',
  'docs/tr/production-deploy-gcp.tr.md',
  'docs/tr/security-ops.tr.md',
  'docs/tr/roadmap-source.tr.md',
  'contracts/lib/',
  'contracts/out/',
  'contracts/cache/',
  'sdk/typescript/dist/',
  'landing-assets/',
  'README.pre-rewrite.local.md'
];

const matches = tracked.filter((file) =>
  forbiddenTrackedPrefixes.some((prefix) => file === prefix || file.startsWith(prefix))
);

const junk = tracked.filter((file) => file.endsWith('.DS_Store'));

if (matches.length > 0 || junk.length > 0) {
  const lines = [...matches, ...junk].map((file) => `- ${file}`).join('\n');
  throw new Error(`Forbidden tracked public-surface paths detected:\n${lines}`);
}

console.log('Public repository surface validation passed.');
