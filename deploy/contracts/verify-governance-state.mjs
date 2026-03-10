#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createPublicClient, getAddress, http } from 'viem';
import { baseSepolia, base } from 'viem/chains';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
dotenv.config({ path: path.resolve(root, '.env') });

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function argValue(name, fallback = '') {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!p) return fallback;
  return p.slice(name.length + 1);
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const corePath = path.resolve(argValue('--core', path.join(root, 'deploy/contracts/addresses.base-sepolia.json')));
const govPath = path.resolve(argValue('--gov', path.join(root, 'deploy/contracts/governance.base-sepolia.json')));
const profile = String(argValue('--profile', '')).toLowerCase().trim();
const strict = hasFlag('--strict');
const requireDeployerRevoked = hasFlag('--require-deployer-revoked');

const profiles = {
  conservative: {
    minProposalThreshold: 1_000_000n * 10n ** 18n,
    minQuorumNumerator: 6n,
    minTimelockDelay: 48 * 60 * 60
  }
};
if (profile && !profiles[profile]) {
  throw new Error(`Unsupported profile: ${profile}`);
}

const core = readJson(corePath);
const gov = readJson(govPath);

const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_RPC_URL;
if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL or BASE_RPC_URL');

const chainId = Number(core.chainId || gov.chainId || 84532);
const chain = chainId === 8453 ? base : baseSepolia;
const client = createPublicClient({ chain, transport: http(rpcUrl) });

const acAbi = [
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'DEFAULT_ADMIN_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'GOVERNANCE_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] }
];

const tokenAbi = [
  ...acAbi,
  { type: 'function', name: 'MINTER_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] }
];

const timelockAbi = [
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'PROPOSER_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'CANCELLER_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'EXECUTOR_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'TIMELOCK_ADMIN_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'getMinDelay', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];
const governorAbi = [
  { type: 'function', name: 'proposalThreshold', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'quorumNumerator', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];

const deployer = getAddress(gov.deployer || core.deployer || '0x0000000000000000000000000000000000000000');
const timelock = getAddress(gov.governance.TimelockController);
const governor = getAddress(gov.governance.AresGovernor);

const contracts = {
  AresRegistry: getAddress(core.contracts.AresRegistry),
  AresARIEngine: getAddress(core.contracts.AresARIEngine),
  AresScorecardLedger: getAddress(core.contracts.AresScorecardLedger),
  AresDispute: getAddress(core.contracts.AresDispute),
  AresApiAccess: getAddress(core.contracts.AresApiAccess),
  ERC8004IdentityAdapter: getAddress(core.contracts.ERC8004IdentityAdapter),
  ERC8004ReputationAdapter: getAddress(core.contracts.ERC8004ReputationAdapter),
  ERC8004ValidationAdapter: getAddress(core.contracts.ERC8004ValidationAdapter)
};
const token = getAddress(core.contracts.AresToken);

async function readRole(contract, abi, roleGetter) {
  return client.readContract({ address: contract, abi, functionName: roleGetter });
}
async function hasRole(contract, abi, role, account) {
  return client.readContract({ address: contract, abi, functionName: 'hasRole', args: [role, account] });
}

const report = {
  chainId,
  rpc: rpcUrl,
  deployer,
  timelock,
  governor,
  profile: profile || 'default',
  governorState: {},
  timelockState: {},
  contracts: {},
  token: {},
  checks: []
};

const proposerRole = await readRole(timelock, timelockAbi, 'PROPOSER_ROLE');
const cancellerRole = await readRole(timelock, timelockAbi, 'CANCELLER_ROLE');
const executorRole = await readRole(timelock, timelockAbi, 'EXECUTOR_ROLE');
const adminRole = await readRole(timelock, timelockAbi, 'TIMELOCK_ADMIN_ROLE');
const minDelay = await client.readContract({ address: timelock, abi: timelockAbi, functionName: 'getMinDelay' });
const proposalThreshold = await client.readContract({ address: governor, abi: governorAbi, functionName: 'proposalThreshold' });
const quorumNumerator = await client.readContract({ address: governor, abi: governorAbi, functionName: 'quorumNumerator' });

report.timelockState = {
  minDelay: Number(minDelay),
  governorProposer: await hasRole(timelock, timelockAbi, proposerRole, governor),
  governorCanceller: await hasRole(timelock, timelockAbi, cancellerRole, governor),
  openExecutor: await hasRole(timelock, timelockAbi, executorRole, '0x0000000000000000000000000000000000000000'),
  deployerAdmin: await hasRole(timelock, timelockAbi, adminRole, deployer),
  deployerProposer: await hasRole(timelock, timelockAbi, proposerRole, deployer),
  deployerCanceller: await hasRole(timelock, timelockAbi, cancellerRole, deployer)
};
report.governorState = {
  proposalThreshold: proposalThreshold.toString(),
  quorumNumerator: Number(quorumNumerator)
};

for (const [name, address] of Object.entries(contracts)) {
  const defaultAdminRole = await readRole(address, acAbi, 'DEFAULT_ADMIN_ROLE');
  const governanceRole = await readRole(address, acAbi, 'GOVERNANCE_ROLE');
  report.contracts[name] = {
    address,
    timelockAdmin: await hasRole(address, acAbi, defaultAdminRole, timelock),
    timelockGovernance: await hasRole(address, acAbi, governanceRole, timelock),
    deployerAdmin: await hasRole(address, acAbi, defaultAdminRole, deployer),
    deployerGovernance: await hasRole(address, acAbi, governanceRole, deployer)
  };
}

const tokenDefaultAdminRole = await readRole(token, tokenAbi, 'DEFAULT_ADMIN_ROLE');
const tokenMinterRole = await readRole(token, tokenAbi, 'MINTER_ROLE');
report.token = {
  address: token,
  timelockAdmin: await hasRole(token, tokenAbi, tokenDefaultAdminRole, timelock),
  timelockMinter: await hasRole(token, tokenAbi, tokenMinterRole, timelock),
  deployerAdmin: await hasRole(token, tokenAbi, tokenDefaultAdminRole, deployer),
  deployerMinter: await hasRole(token, tokenAbi, tokenMinterRole, deployer)
};

function check(ok, message) {
  report.checks.push({ ok, message });
}

check(report.timelockState.governorProposer, 'Governor has Timelock PROPOSER_ROLE');
check(report.timelockState.governorCanceller, 'Governor has Timelock CANCELLER_ROLE');

for (const [name, row] of Object.entries(report.contracts)) {
  check(row.timelockAdmin, `${name}: Timelock has DEFAULT_ADMIN_ROLE`);
  check(row.timelockGovernance, `${name}: Timelock has GOVERNANCE_ROLE`);
}
check(report.token.timelockAdmin, 'AresToken: Timelock has DEFAULT_ADMIN_ROLE');

if (requireDeployerRevoked) {
  check(!report.timelockState.deployerAdmin, 'Timelock: deployer admin revoked');
  check(!report.timelockState.deployerProposer, 'Timelock: deployer proposer revoked');
  check(!report.timelockState.deployerCanceller, 'Timelock: deployer canceller revoked');
  for (const [name, row] of Object.entries(report.contracts)) {
    check(!row.deployerAdmin, `${name}: deployer admin revoked`);
    check(!row.deployerGovernance, `${name}: deployer governance revoked`);
  }
  check(!report.token.deployerAdmin, 'AresToken: deployer admin revoked');
  check(!report.token.deployerMinter, 'AresToken: deployer minter revoked');
}

if (profile === 'conservative') {
  const selected = profiles[profile];
  check(
    proposalThreshold >= selected.minProposalThreshold,
    `Governor: proposalThreshold >= ${selected.minProposalThreshold.toString()}`
  );
  check(
    quorumNumerator >= selected.minQuorumNumerator,
    `Governor: quorumNumerator >= ${selected.minQuorumNumerator.toString()}`
  );
  check(
    Number(minDelay) >= selected.minTimelockDelay,
    `Timelock: minDelay >= ${selected.minTimelockDelay}`
  );
}

const failed = report.checks.filter((c) => !c.ok);
console.log(JSON.stringify(report, null, 2));

if (strict && failed.length > 0) {
  process.exit(2);
}
