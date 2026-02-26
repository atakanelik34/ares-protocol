#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_SOURCE_MAP = {
  AresRegistry: 'AresRegistry',
  AresScorecardLedger: 'AresScorecardLedger',
  AresARIEngine: 'AresARIEngine',
  AresDispute: 'AresDispute',
  AresApiAccess: 'AresApiAccess'
};

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1];
    i++;
  }
  return out;
}

function replaceAddressForDataSource(manifest, dataSourceName, address) {
  const pattern = new RegExp(`(name:\\s+${dataSourceName}[\\s\\S]*?source:\\s*\\n\\s*address:\\s*")0x[a-fA-F0-9]{40}(")`, 'm');
  if (!pattern.test(manifest)) {
    throw new Error(`Could not update address for data source: ${dataSourceName}`);
  }
  return manifest.replace(pattern, `$1${address}$2`);
}

function replaceStartBlockForDataSource(manifest, dataSourceName, startBlock) {
  const pattern = new RegExp(`(name:\\s+${dataSourceName}[\\s\\S]*?source:[\\s\\S]*?startBlock:\\s*)\\d+`, 'm');
  if (!pattern.test(manifest)) {
    throw new Error(`Could not update startBlock for data source: ${dataSourceName}`);
  }
  return manifest.replace(pattern, `$1${startBlock}`);
}

function updateNetwork(manifest, network) {
  if (!network) return manifest;
  return manifest.replace(/network:\s+[a-zA-Z0-9-]+/g, `network: ${network}`);
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const args = parseArgs(process.argv);

  const addressesPath = args.addresses
    ? path.resolve(args.addresses)
    : path.resolve(root, 'deploy/contracts/addresses.84532.json');
  const manifestPath = args.manifest
    ? path.resolve(args.manifest)
    : path.resolve(root, 'subgraph/subgraph.yaml');
  const network = args.network || 'base-sepolia';
  const startBlock = args['start-block'] ? Number(args['start-block']) : null;

  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Addresses file not found: ${addressesPath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Subgraph manifest not found: ${manifestPath}`);
  }

  const addressesPayload = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  const contracts = addressesPayload.contracts || {};
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  for (const [dataSourceName, contractName] of Object.entries(DATA_SOURCE_MAP)) {
    const address = contracts[contractName];
    if (!address) {
      throw new Error(`Missing contract address for ${contractName} in ${addressesPath}`);
    }
    manifest = replaceAddressForDataSource(manifest, dataSourceName, address);
    if (startBlock && Number.isFinite(startBlock) && startBlock > 0) {
      manifest = replaceStartBlockForDataSource(manifest, dataSourceName, startBlock);
    }
  }

  manifest = updateNetwork(manifest, network);
  fs.writeFileSync(manifestPath, manifest);

  console.log(`Updated ${manifestPath} from ${addressesPath} (network=${network})`);
}

main();
