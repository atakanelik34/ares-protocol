#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createPublicClient, getAddress, http } from 'viem';
import { baseSepolia, base } from 'viem/chains';

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

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const corePath = path.resolve(argValue('--core', path.join(root, 'deploy/contracts/addresses.base-sepolia.json')));
const govPath = path.resolve(argValue('--gov', path.join(root, 'deploy/contracts/governance.base-sepolia.json')));
const profile = String(argValue('--profile', 'conservative')).toLowerCase().trim();
const strict = hasFlag('--strict');

const profiles = {
  conservative: {
    governance: {
      minProposalThreshold: 1_000_000n * 10n ** 18n,
      minQuorumNumerator: 6n,
      minTimelockDelay: 48 * 60 * 60
    },
    dispute: {
      minChallengerStake: 1_000n * 10n ** 18n,
      minValidatorStake: 500n * 10n ** 18n,
      minVotingPeriod: 14 * 24 * 60 * 60,
      minQuorum: 2_500n * 10n ** 18n,
      minSlashingBps: 2_000
    }
  }
};

if (!profiles[profile]) {
  throw new Error(`Unsupported profile: ${profile}`);
}

const core = readJson(corePath);
const gov = readJson(govPath);
const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_RPC_URL;
if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL or BASE_RPC_URL');

const chainId = Number(core.chainId || gov.chainId || 84532);
const chain = chainId === 8453 ? base : baseSepolia;
const client = createPublicClient({ chain, transport: http(rpcUrl) });

const governor = getAddress(gov.governance.AresGovernor);
const timelock = getAddress(gov.governance.TimelockController);
const dispute = getAddress(core.contracts.AresDispute);

const governorAbi = [
  { type: 'function', name: 'proposalThreshold', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'quorumNumerator', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];
const timelockAbi = [
  { type: 'function', name: 'getMinDelay', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];
const disputeAbi = [
  { type: 'function', name: 'minChallengerStake', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minValidatorStake', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'votingPeriod', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'quorum', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'slashingBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] }
];

const [proposalThreshold, quorumNumerator, minDelay, minChallengerStake, minValidatorStake, votingPeriod, quorum, slashingBps] =
  await Promise.all([
    client.readContract({ address: governor, abi: governorAbi, functionName: 'proposalThreshold' }),
    client.readContract({ address: governor, abi: governorAbi, functionName: 'quorumNumerator' }),
    client.readContract({ address: timelock, abi: timelockAbi, functionName: 'getMinDelay' }),
    client.readContract({ address: dispute, abi: disputeAbi, functionName: 'minChallengerStake' }),
    client.readContract({ address: dispute, abi: disputeAbi, functionName: 'minValidatorStake' }),
    client.readContract({ address: dispute, abi: disputeAbi, functionName: 'votingPeriod' }),
    client.readContract({ address: dispute, abi: disputeAbi, functionName: 'quorum' }),
    client.readContract({ address: dispute, abi: disputeAbi, functionName: 'slashingBps' })
  ]);

const selected = profiles[profile];
const report = {
  chainId,
  rpc: rpcUrl,
  profile,
  contracts: { governor, timelock, dispute },
  observed: {
    governance: {
      proposalThreshold: proposalThreshold.toString(),
      quorumNumerator: quorumNumerator.toString(),
      timelockMinDelay: Number(minDelay)
    },
    dispute: {
      minChallengerStake: minChallengerStake.toString(),
      minValidatorStake: minValidatorStake.toString(),
      votingPeriod: Number(votingPeriod),
      quorum: quorum.toString(),
      slashingBps: Number(slashingBps)
    }
  },
  requiredMinimums: {
    governance: {
      proposalThreshold: selected.governance.minProposalThreshold.toString(),
      quorumNumerator: selected.governance.minQuorumNumerator.toString(),
      timelockMinDelay: selected.governance.minTimelockDelay
    },
    dispute: {
      minChallengerStake: selected.dispute.minChallengerStake.toString(),
      minValidatorStake: selected.dispute.minValidatorStake.toString(),
      votingPeriod: selected.dispute.minVotingPeriod,
      quorum: selected.dispute.minQuorum.toString(),
      slashingBps: selected.dispute.minSlashingBps
    }
  },
  checks: []
};

function check(ok, message) {
  report.checks.push({ ok, message });
}

check(
  proposalThreshold >= selected.governance.minProposalThreshold,
  `proposalThreshold >= ${selected.governance.minProposalThreshold.toString()}`
);
check(
  quorumNumerator >= selected.governance.minQuorumNumerator,
  `quorumNumerator >= ${selected.governance.minQuorumNumerator.toString()}`
);
check(Number(minDelay) >= selected.governance.minTimelockDelay, `timelock minDelay >= ${selected.governance.minTimelockDelay}`);
check(
  minChallengerStake >= selected.dispute.minChallengerStake,
  `minChallengerStake >= ${selected.dispute.minChallengerStake.toString()}`
);
check(
  minValidatorStake >= selected.dispute.minValidatorStake,
  `minValidatorStake >= ${selected.dispute.minValidatorStake.toString()}`
);
check(Number(votingPeriod) >= selected.dispute.minVotingPeriod, `dispute votingPeriod >= ${selected.dispute.minVotingPeriod}`);
check(quorum >= selected.dispute.minQuorum, `dispute quorum >= ${selected.dispute.minQuorum.toString()}`);
check(Number(slashingBps) >= selected.dispute.minSlashingBps, `dispute slashingBps >= ${selected.dispute.minSlashingBps}`);

const failed = report.checks.filter((c) => !c.ok);
console.log(JSON.stringify(report, null, 2));

if (strict && failed.length > 0) {
  process.exit(2);
}
