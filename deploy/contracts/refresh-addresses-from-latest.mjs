#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const latestPath = process.env.ARES_LATEST_DEPLOY_FILE
  ? path.resolve(process.env.ARES_LATEST_DEPLOY_FILE)
  : path.resolve(root, 'contracts/latest-deploy.json');
const outPath = path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json');

if (!fs.existsSync(latestPath)) {
  throw new Error(`Missing deployment file: ${latestPath}`);
}

const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const payload = {
  chainId: Number(latest.chainId || 84532),
  source: 'deploy/contracts/latest-deploy.json',
  generatedAt: new Date().toISOString(),
  contracts: {
    AresToken: String(latest.AresToken || '').toLowerCase(),
    AresRegistry: String(latest.AresRegistry || '').toLowerCase(),
    AresARIEngine: String(latest.AresARIEngine || '').toLowerCase(),
    AresScorecardLedger: String(latest.AresScorecardLedger || '').toLowerCase(),
    AresDispute: String(latest.AresDispute || '').toLowerCase(),
    AresApiAccess: String(latest.AresApiAccess || '').toLowerCase(),
    ERC8004IdentityAdapter: String(latest.ERC8004IdentityAdapter || '').toLowerCase(),
    ERC8004ReputationAdapter: String(latest.ERC8004ReputationAdapter || '').toLowerCase(),
    ERC8004ValidationAdapter: String(latest.ERC8004ValidationAdapter || '').toLowerCase()
  }
};

for (const [name, addr] of Object.entries(payload.contracts)) {
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    throw new Error(`Invalid ${name} address in latest deployment file: ${addr}`);
  }
}

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote ${outPath}`);
