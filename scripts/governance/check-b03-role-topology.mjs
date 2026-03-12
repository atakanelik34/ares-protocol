#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createPublicClient, getAddress, http, keccak256, toBytes } from 'viem';
import { baseSepolia } from 'viem/chains';

function argValue(name, fallback = '') {
  const arg = process.argv.find((part) => part.startsWith(`${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
dotenv.config({ path: path.resolve(root, '.env') });

const rpcUrl = String(process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_RPC_URL || '').trim();
if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL (or BASE_RPC_URL)');

const addresses = JSON.parse(
  fs.readFileSync(path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json'), 'utf8')
);
const b03Raw = JSON.parse(
  fs.readFileSync(path.resolve(root, 'reports/mainnet-gates/B03-dispute-v2-cutover-raw.json'), 'utf8')
);

const oldDispute = getAddress(addresses.contracts.AresDispute);
const oldAdapter = getAddress(addresses.contracts.ERC8004ValidationAdapter);
const ledger = getAddress(addresses.contracts.AresScorecardLedger);
const ariEngine = getAddress(addresses.contracts.AresARIEngine);
const newDispute = getAddress(String(b03Raw.rehearsalDispute || ''));

const proposalId = BigInt(
  argValue(
    '--proposal-id',
    '102745141475066169865705909421050107559936801418546675182434592432068222986157'
  )
);
const modeArg = String(argValue('--mode', 'auto')).toLowerCase();
if (!['auto', 'pre', 'post'].includes(modeArg)) {
  throw new Error('Unsupported --mode. Use auto | pre | post');
}

const outDir = path.resolve(root, argValue('--out-dir', 'reports/mainnet-gates/artifacts/b03'));
fs.mkdirSync(outDir, { recursive: true });

const governor = getAddress(
  String(argValue('--governor', '0x99aA690870a0Df973B97e63b63c2A8375a80188e'))
);

const DISPUTE_ROLE = keccak256(toBytes('DISPUTE_ROLE'));
const ADAPTER_ROLE = keccak256(toBytes('ADAPTER_ROLE'));

const acAbi = [
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] }
];
const disputeAbi = [
  ...acAbi,
  { type: 'function', name: 'state', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint8' }] }
];
const governorAbi = [
  { type: 'function', name: 'state', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint8' }] }
];

const client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });

const proposalStateCode = Number(
  await client.readContract({
    address: governor,
    abi: governorAbi,
    functionName: 'state',
    args: [proposalId]
  })
);
const mode = modeArg === 'auto' ? (proposalStateCode === 7 ? 'post' : 'pre') : modeArg;

const row = {
  proposalStateCode,
  oldDisputeOldAdapterRole: await client.readContract({
    address: oldDispute,
    abi: disputeAbi,
    functionName: 'hasRole',
    args: [ADAPTER_ROLE, oldAdapter]
  }),
  ledgerOldDisputeRole: await client.readContract({
    address: ledger,
    abi: acAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, oldDispute]
  }),
  ledgerNewDisputeRole: await client.readContract({
    address: ledger,
    abi: acAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, newDispute]
  }),
  ariOldDisputeRole: await client.readContract({
    address: ariEngine,
    abi: acAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, oldDispute]
  }),
  ariNewDisputeRole: await client.readContract({
    address: ariEngine,
    abi: acAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, newDispute]
  })
};

const expectedPre = {
  oldDisputeOldAdapterRole: true,
  ledgerOldDisputeRole: true,
  ledgerNewDisputeRole: false,
  ariOldDisputeRole: true,
  ariNewDisputeRole: false
};
const expectedPost = {
  oldDisputeOldAdapterRole: false,
  ledgerOldDisputeRole: false,
  ledgerNewDisputeRole: true,
  ariOldDisputeRole: false,
  ariNewDisputeRole: true
};
const expected = mode === 'post' ? expectedPost : expectedPre;

const checks = Object.entries(expected).map(([key, expectedValue]) => ({
  key,
  expected: expectedValue,
  actual: Boolean(row[key]),
  pass: Boolean(row[key]) === expectedValue
}));

const payload = {
  generatedAt: new Date().toISOString(),
  network: 'base-sepolia',
  governor,
  proposalId: proposalId.toString(),
  mode,
  addresses: {
    oldDispute,
    newDispute,
    oldAdapter,
    ledger,
    ariEngine
  },
  observed: row,
  checks
};

const ts = payload.generatedAt.replace(/[:.]/g, '-');
const jsonPath = path.join(outDir, `b03-role-topology-${mode}-${ts}.json`);
const latestPath = path.join(outDir, `b03-role-topology-${mode}-latest.json`);
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(payload, null, 2)}\n`);

const failed = checks.filter((c) => !c.pass);
console.log(`mode=${mode}`);
console.log(`json=${jsonPath}`);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.key} expected=${check.expected} actual=${check.actual}`);
}

if (failed.length > 0) process.exit(2);
