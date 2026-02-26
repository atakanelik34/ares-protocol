#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_CONTRACTS = [
  'AresToken',
  'AresRegistry',
  'AresARIEngine',
  'AresScorecardLedger',
  'AresDispute',
  'AresApiAccess',
  'ERC8004IdentityAdapter',
  'ERC8004ReputationAdapter',
  'ERC8004ValidationAdapter'
];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    out[key.slice(2)] = value;
    i++;
  }
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toChecksumLike(address) {
  return String(address || '').toLowerCase();
}

function resolveInput(root, chainId, provided) {
  if (provided) return path.resolve(provided);
  return path.resolve(root, `contracts/broadcast/DeployAres.s.sol/${chainId}/run-latest.json`);
}

function resolveFallbackInput(root, chainId) {
  return path.resolve(root, `contracts/broadcast/DeployAres.s.sol/${chainId}/dry-run/run-latest.json`);
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const args = parseArgs(process.argv);
  const chainId = Number(args.chain || 84532);
  const inputPath = resolveInput(root, chainId, args.input);
  const fallbackPath = resolveFallbackInput(root, chainId);
  const outputPath = args.output
    ? path.resolve(args.output)
    : path.resolve(root, `deploy/contracts/addresses.${chainId}.json`);

  let artifactPath = inputPath;
  if (!fs.existsSync(artifactPath) && fs.existsSync(fallbackPath)) {
    artifactPath = fallbackPath;
  }
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Broadcast file not found: ${inputPath}`);
  }

  const artifact = readJson(artifactPath);
  const txs = Array.isArray(artifact.transactions) ? artifact.transactions : [];

  const contracts = {};
  for (const tx of txs) {
    const contractName = String(tx?.contractName || '');
    const contractAddress = String(tx?.contractAddress || '');
    if (!contractName || !contractAddress) continue;
    if (!REQUIRED_CONTRACTS.includes(contractName)) continue;
    if (contracts[contractName]) continue;
    contracts[contractName] = toChecksumLike(contractAddress);
  }

  const missing = REQUIRED_CONTRACTS.filter((name) => !contracts[name]);
  if (missing.length > 0) {
    throw new Error(`Missing contract addresses: ${missing.join(', ')}`);
  }

  const payload = {
    chainId,
    source: path.relative(root, artifactPath),
    generatedAt: new Date().toISOString(),
    contracts
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');

  console.log(`Wrote addresses: ${outputPath}`);
}

main();
