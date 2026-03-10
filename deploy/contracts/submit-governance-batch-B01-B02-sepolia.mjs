#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatEther,
  getAddress,
  http,
  keccak256,
  toBytes
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.resolve(root, '.env') });

function ensureHexKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('0x') ? raw : `0x${raw}`;
}

function toIsoFrom(baseDate, secondsDelta) {
  return new Date(baseDate.getTime() + Number(secondsDelta) * 1000).toISOString();
}

const rpcUrl = String(process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_RPC_URL || '').trim();
const deployerPk = ensureHexKey(process.env.ARES_DEPLOYER_KEY);
const blockSecondsEstimate = Number(process.env.BLOCK_SECONDS_ESTIMATE || 2);

if (!rpcUrl) {
  throw new Error('Missing BASE_SEPOLIA_RPC_URL (or BASE_RPC_URL) in root .env');
}
if (!deployerPk || !/^0x[0-9a-fA-F]{64}$/.test(deployerPk)) {
  throw new Error('Missing or invalid ARES_DEPLOYER_KEY in root .env (expected 0x-prefixed 32-byte hex key)');
}

const governance = JSON.parse(fs.readFileSync(path.resolve(root, 'deploy/contracts/governance.base-sepolia.json'), 'utf8'));
const addresses = JSON.parse(fs.readFileSync(path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json'), 'utf8'));
const payload = JSON.parse(
  fs.readFileSync(path.resolve(root, 'deploy/contracts/remediation-conservative-payloads.base-sepolia.json'), 'utf8')
);

const governor = getAddress(governance.governance.AresGovernor);
const timelock = getAddress(governance.governance.TimelockController);
const token = getAddress(addresses.contracts.AresToken);
const expectedDeployer = getAddress(governance.deployer);

const account = privateKeyToAccount(deployerPk);
const signerMatchesRecordedDeployer = getAddress(account.address) === expectedDeployer;

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

const tokenAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }
];
const governorAbi = [
  { type: 'function', name: 'proposalThreshold', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'quorumNumerator', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'votingDelay', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'votingPeriod', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'hashProposal',
    stateMutability: 'view',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'descriptionHash', type: 'bytes32' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'propose',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { indexed: false, name: 'proposalId', type: 'uint256' },
      { indexed: false, name: 'proposer', type: 'address' },
      { indexed: false, name: 'targets', type: 'address[]' },
      { indexed: false, name: 'values', type: 'uint256[]' },
      { indexed: false, name: 'signatures', type: 'string[]' },
      { indexed: false, name: 'calldatas', type: 'bytes[]' },
      { indexed: false, name: 'voteStart', type: 'uint256' },
      { indexed: false, name: 'voteEnd', type: 'uint256' },
      { indexed: false, name: 'description', type: 'string' }
    ]
  },
  { type: 'function', name: 'state', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'proposalSnapshot', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'proposalDeadline', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] }
];
const timelockAbi = [
  { type: 'function', name: 'getMinDelay', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];

const [balance, proposalThreshold, quorumNumerator, votingDelay, votingPeriod, minDelay, currentBlock] = await Promise.all([
  publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [account.address] }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalThreshold' }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'quorumNumerator' }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'votingDelay' }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'votingPeriod' }),
  publicClient.readContract({ address: timelock, abi: timelockAbi, functionName: 'getMinDelay' }),
  publicClient.getBlockNumber()
]);

const actions = payload.governanceActions || [];
if (actions.length !== 3) {
  throw new Error(`Expected 3 governance actions in payload, found ${actions.length}`);
}

const targets = actions.map((action) => getAddress(action.target));
const values = actions.map(() => 0n);
const calldatas = actions.map((action) => action.calldata);
const submittedAt = new Date();
const description = `ARES B-01+B-02 Conservative Params Proposal (${submittedAt.toISOString()})`;
const descriptionHash = keccak256(toBytes(description));

const proposeTxHash = await walletClient.writeContract({
  address: governor,
  abi: governorAbi,
  functionName: 'propose',
  args: [targets, values, calldatas, description]
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: proposeTxHash });
if (receipt.status !== 'success') {
  throw new Error(`Proposal transaction reverted: ${proposeTxHash}`);
}

let proposalId = null;
for (const log of receipt.logs) {
  if (getAddress(log.address) !== governor) continue;
  try {
    const decoded = decodeEventLog({
      abi: governorAbi,
      data: log.data,
      topics: log.topics
    });
    if (decoded.eventName === 'ProposalCreated') {
      proposalId = decoded.args.proposalId;
      break;
    }
  } catch {
    // skip non-governor/non-matching logs
  }
}
if (proposalId === null) {
  throw new Error(`ProposalCreated event not found in tx logs: ${proposeTxHash}`);
}

const [proposalState, snapshotBlock, deadlineBlock, proposeBlock] = await Promise.all([
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'state', args: [proposalId] }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalSnapshot', args: [proposalId] }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalDeadline', args: [proposalId] }),
  publicClient.getBlock({ blockNumber: receipt.blockNumber })
]);

const queueEarliestBlock = BigInt(deadlineBlock) + 1n;
const secondsToQueue = (queueEarliestBlock - receipt.blockNumber) * BigInt(blockSecondsEstimate);
const queueEarliestIso = toIsoFrom(new Date(Number(proposeBlock.timestamp) * 1000), secondsToQueue);
const executeEarliestIso = toIsoFrom(new Date(queueEarliestIso), BigInt(minDelay));

const reportDir = path.resolve(root, 'reports/governance');
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.resolve(reportDir, 'B01-B02-proposal-evidence.md');

const md = `# B-01 + B-02 Governance Proposal Evidence (Base Sepolia)

- Generated at: ${new Date().toISOString()}
- Network: Base Sepolia (84532)
- Governor: ${governor}
- Timelock: ${timelock}
- Proposer (from key): ${account.address}
- Signer matches recorded deployer: ${signerMatchesRecordedDeployer}
- Current block before submit: ${currentBlock}

## Baseline proposer checks

- ARES balance: ${balance.toString()} (${formatEther(balance)} ARES)
- Proposal threshold at submit time: ${proposalThreshold.toString()}
- Quorum numerator at submit time: ${quorumNumerator.toString()}
- Voting delay: ${votingDelay.toString()} blocks
- Voting period: ${votingPeriod.toString()} blocks
- Timelock minDelay: ${minDelay.toString()} seconds

## Batched actions

1. ${actions[0].function}
2. ${actions[1].function}
3. ${actions[2].function}

## Proposal submission

- Proposal ID: ${proposalId.toString()}
- Propose tx hash: ${proposeTxHash}
- Propose block: ${receipt.blockNumber.toString()}
- Proposal state after submit: ${Number(proposalState)}
- Snapshot block (votingDelay end): ${snapshotBlock.toString()}
- Deadline block (votingPeriod end): ${deadlineBlock.toString()}

## Expected windows

- Expected votingDelay end block: ${snapshotBlock.toString()}
- Expected votingPeriod end block: ${deadlineBlock.toString()}
- Earliest queue window block: ${queueEarliestBlock.toString()}
- Estimated queue window time (using ${blockSecondsEstimate}s/block): ${queueEarliestIso}
- Earliest execute window (queue + minDelay): ${executeEarliestIso}

## Explorer links

- Propose tx: https://sepolia.basescan.org/tx/${proposeTxHash}
- Governor: https://sepolia.basescan.org/address/${governor}
- Timelock: https://sepolia.basescan.org/address/${timelock}

## Notes

- This artifact only covers proposal submission and expected timeline calculations.
- Voting, queue, and execute are intentionally pending.
`;

fs.writeFileSync(reportPath, md);

console.log(`proposalId=${proposalId.toString()}`);
console.log(`txHash=${proposeTxHash}`);
console.log(`report=${reportPath}`);
