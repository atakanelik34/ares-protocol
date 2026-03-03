#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const requiredFiles = [
  'README.md',
  'docs/index.html',
  'docs/tr/index.html',
  'docs/README.md',
  'docs/architecture.md',
  'docs/scoring.md',
  'docs/integration-guide.md',
  'docs/tokenomics.md',
  'docs/governance.md',
  'docs/roadmap.md',
  'docs/whitepaper.md',
  'docs/security.md',
  'docs/mainnet-go-no-go.md'
];

for (const rel of requiredFiles) {
  if (!fs.existsSync(path.resolve(root, rel))) {
    throw new Error(`Missing required public docs file: ${rel}`);
  }
}

const readme = fs.readFileSync(path.resolve(root, 'README.md'), 'utf8');
const docsIndex = fs.readFileSync(path.resolve(root, 'docs/index.html'), 'utf8');
const docsIndexTr = fs.readFileSync(path.resolve(root, 'docs/tr/index.html'), 'utf8');
const docsReadme = fs.readFileSync(path.resolve(root, 'docs/README.md'), 'utf8');

const forbiddenRefs = [
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
  'docs/base-batches-003-execution.md'
];

for (const ref of forbiddenRefs) {
  for (const [name, contents] of [
    ['README.md', readme],
    ['docs/index.html', docsIndex],
    ['docs/tr/index.html', docsIndexTr],
    ['docs/README.md', docsReadme]
  ]) {
    if (contents.includes(ref)) {
      throw new Error(`Forbidden public reference "${ref}" found in ${name}`);
    }
  }
}

for (const required of [
  'architecture.md',
  'scoring.md',
  'integration-guide.md',
  'tokenomics.md',
  'governance.md',
  'roadmap.md',
  'whitepaper.md',
  'security.md',
  'mainnet-go-no-go.md'
]) {
  if (!docsIndex.includes(required)) {
    throw new Error(`docs/index.html is missing public doc link: ${required}`);
  }
}

for (const required of [
  'architecture.tr.md',
  'scoring.tr.md',
  'integration-guide.tr.md',
  'tokenomics.tr.md',
  'governance.tr.md',
  'roadmap.tr.md',
  'whitepaper.tr.md',
  'security.tr.md',
  'mainnet-go-no-go.tr.md'
]) {
  if (!docsIndexTr.includes(required)) {
    throw new Error(`docs/tr/index.html is missing public doc link: ${required}`);
  }
}

if (!readme.includes('Base Sepolia testnet-live, not mainnet-ready')) {
  throw new Error('README.md is missing the required public status line');
}

if (!readme.includes('$400K cap')) {
  throw new Error('README.md is missing the synchronized public tokenomics summary');
}

console.log('Public docs validation passed.');
