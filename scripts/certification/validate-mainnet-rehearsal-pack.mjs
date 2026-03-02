import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/certification/validate-mainnet-rehearsal-pack.mjs <dir>');
  process.exit(1);
}

const dir = path.resolve(args[0]);
const required = [
  'mainnet-rehearsal-runbook.md',
  'deployment-manifest.template.json',
  'verification-checklist.md',
  'rollback-checklist.md'
];

for (const file of required) {
  if (!fs.existsSync(path.join(dir, file))) {
    console.error(`FAIL: missing file ${file}`);
    process.exit(1);
  }
}

const runbook = fs.readFileSync(path.join(dir, 'mainnet-rehearsal-runbook.md'), 'utf8');
for (const marker of ['## Preflight', '## Deployment sequence', '## Verification sequence', '## Rollback trigger']) {
  if (!runbook.includes(marker)) {
    console.error(`FAIL: runbook missing ${marker}`);
    process.exit(1);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'deployment-manifest.template.json'), 'utf8'));
for (const key of ['network', 'commit', 'contracts', 'governance', 'artifacts']) {
  if (!(key in manifest)) {
    console.error(`FAIL: deployment-manifest.template.json missing key ${key}`);
    process.exit(1);
  }
}

console.log(JSON.stringify({ ok: true, dir, validatedFiles: required }, null, 2));
