#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const latestPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(root, 'latest-governance.json');
const outPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve(root, 'deploy/contracts/governance.base-sepolia.json');

if (!fs.existsSync(latestPath)) {
  console.error(`Missing source file: ${latestPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const out = {
  chainId: Number(raw.chainId || 0),
  source: path.relative(root, latestPath).replaceAll('\\', '/'),
  generatedAt: new Date().toISOString(),
  governance: {
    TimelockController: String(raw.TimelockController || '').toLowerCase(),
    AresGovernor: String(raw.AresGovernor || '').toLowerCase(),
    AresToken: String(raw.AresToken || '').toLowerCase()
  },
  config: {
    minDelay: Number(raw.minDelay || 0),
    openExecutor: Boolean(raw.openExecutor),
    keepBootstrapRoles: Boolean(raw.keepBootstrapRoles),
    renounceTimelockAdmin: Boolean(raw.renounceTimelockAdmin)
  },
  deployer: String(raw.deployer || '').toLowerCase()
};

for (const [k, v] of Object.entries(out.governance)) {
  if (!/^0x[a-f0-9]{40}$/.test(v)) {
    console.error(`Invalid governance address for ${k}: ${v}`);
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outPath)}`);
