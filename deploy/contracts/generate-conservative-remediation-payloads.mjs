#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { encodeFunctionData, getAddress, parseAbi } from 'viem';

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function argValue(name, fallback = '') {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!p) return fallback;
  return p.slice(name.length + 1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const corePath = path.resolve(argValue('--core', path.join(root, 'deploy/contracts/addresses.base-sepolia.json')));
const govPath = path.resolve(argValue('--gov', path.join(root, 'deploy/contracts/governance.base-sepolia.json')));
const outputPath = path.resolve(
  argValue('--out', path.join(root, 'deploy/contracts/remediation-conservative-payloads.base-sepolia.json'))
);

const core = readJson(corePath);
const gov = readJson(govPath);

const governor = getAddress(gov.governance.AresGovernor);
const timelock = getAddress(gov.governance.TimelockController);
const dispute = getAddress(core.contracts.AresDispute);

const governorAbi = parseAbi([
  'function setProposalThreshold(uint256 newProposalThreshold)',
  'function updateQuorumNumerator(uint256 newQuorumNumerator)'
]);
const disputeAbi = parseAbi([
  'function setDisputeParams(uint256 minChallengerStake,uint256 minValidatorStake,uint64 votingPeriod,uint256 quorum,uint16 slashingBps,address treasury)'
]);

const parameters = {
  proposalThreshold: 1_000_000n * 10n ** 18n,
  quorumNumerator: 6n,
  minChallengerStake: 1_000n * 10n ** 18n,
  minValidatorStake: 500n * 10n ** 18n,
  votingPeriod: 14n * 24n * 60n * 60n,
  disputeQuorum: 2_500n * 10n ** 18n,
  slashingBps: 2_000n,
  treasury: getAddress(process.env.ARES_DISPUTE_TREASURY || timelock)
};

const payload = {
  generatedAt: new Date().toISOString(),
  chainId: Number(core.chainId || gov.chainId || 84532),
  profile: 'conservative',
  contracts: {
    governor,
    timelock,
    dispute
  },
  targetParameters: {
    proposalThreshold: parameters.proposalThreshold.toString(),
    quorumNumerator: parameters.quorumNumerator.toString(),
    minChallengerStake: parameters.minChallengerStake.toString(),
    minValidatorStake: parameters.minValidatorStake.toString(),
    votingPeriod: parameters.votingPeriod.toString(),
    disputeQuorum: parameters.disputeQuorum.toString(),
    slashingBps: parameters.slashingBps.toString(),
    treasury: parameters.treasury
  },
  governanceActions: [
    {
      contract: 'AresGovernor',
      target: governor,
      function: 'setProposalThreshold(uint256)',
      args: [parameters.proposalThreshold.toString()],
      calldata: encodeFunctionData({
        abi: governorAbi,
        functionName: 'setProposalThreshold',
        args: [parameters.proposalThreshold]
      })
    },
    {
      contract: 'AresGovernor',
      target: governor,
      function: 'updateQuorumNumerator(uint256)',
      args: [parameters.quorumNumerator.toString()],
      calldata: encodeFunctionData({
        abi: governorAbi,
        functionName: 'updateQuorumNumerator',
        args: [parameters.quorumNumerator]
      })
    },
    {
      contract: 'AresDispute',
      target: dispute,
      function: 'setDisputeParams(uint256,uint256,uint64,uint256,uint16,address)',
      args: [
        parameters.minChallengerStake.toString(),
        parameters.minValidatorStake.toString(),
        parameters.votingPeriod.toString(),
        parameters.disputeQuorum.toString(),
        parameters.slashingBps.toString(),
        parameters.treasury
      ],
      calldata: encodeFunctionData({
        abi: disputeAbi,
        functionName: 'setDisputeParams',
        args: [
          parameters.minChallengerStake,
          parameters.minValidatorStake,
          Number(parameters.votingPeriod),
          parameters.disputeQuorum,
          Number(parameters.slashingBps),
          parameters.treasury
        ]
      })
    }
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(outputPath);
