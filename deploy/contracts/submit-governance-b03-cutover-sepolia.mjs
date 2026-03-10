#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
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
  throw new Error('Missing or invalid ARES_DEPLOYER_KEY in root .env');
}

const governance = JSON.parse(fs.readFileSync(path.resolve(root, 'deploy/contracts/governance.base-sepolia.json'), 'utf8'));
const addresses = JSON.parse(fs.readFileSync(path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json'), 'utf8'));
const previousEvidencePath = path.resolve(root, 'reports/mainnet-gates/B03-dispute-v2-cutover-raw.json');
const previousEvidence = fs.existsSync(previousEvidencePath)
  ? JSON.parse(fs.readFileSync(previousEvidencePath, 'utf8'))
  : null;

const governor = getAddress(governance.governance.AresGovernor);
const timelock = getAddress(governance.governance.TimelockController);
const token = getAddress(addresses.contracts.AresToken);
const oldDispute = getAddress(addresses.contracts.AresDispute);
const ledger = getAddress(addresses.contracts.AresScorecardLedger);
const ariEngine = getAddress(addresses.contracts.AresARIEngine);
const oldAdapter = getAddress(addresses.contracts.ERC8004ValidationAdapter);
const rehearsalDispute = getAddress(
  String(previousEvidence?.rehearsalDispute || process.env.B03_REHEARSAL_DISPUTE || '')
);
const rehearsalAdapter = getAddress(
  String(previousEvidence?.rehearsalAdapter || process.env.B03_REHEARSAL_ADAPTER || '')
);
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
const accessControlAbi = [
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'grantRole', stateMutability: 'nonpayable', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [] },
  { type: 'function', name: 'revokeRole', stateMutability: 'nonpayable', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [] }
];
const disputeAbi = [
  ...accessControlAbi,
  { type: 'function', name: 'setAdapterRole', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [] }
];

const DISPUTE_ROLE = keccak256(toBytes('DISPUTE_ROLE'));
const ADAPTER_ROLE = keccak256(toBytes('ADAPTER_ROLE'));

const roleStateBefore = {
  oldDisputeOldAdapterRole: await publicClient.readContract({
    address: oldDispute,
    abi: disputeAbi,
    functionName: 'hasRole',
    args: [ADAPTER_ROLE, oldAdapter]
  }),
  ledgerOldDisputeRole: await publicClient.readContract({
    address: ledger,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, oldDispute]
  }),
  ledgerNewDisputeRole: await publicClient.readContract({
    address: ledger,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, rehearsalDispute]
  }),
  ariOldDisputeRole: await publicClient.readContract({
    address: ariEngine,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, oldDispute]
  }),
  ariNewDisputeRole: await publicClient.readContract({
    address: ariEngine,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, rehearsalDispute]
  })
};

let directRevokeAttempt = { ok: true, txHash: null, error: null };
try {
  const txHash = await walletClient.writeContract({
    address: oldDispute,
    abi: disputeAbi,
    functionName: 'setAdapterRole',
    args: [oldAdapter, false]
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  directRevokeAttempt = { ok: receipt.status === 'success', txHash, error: null };
} catch (error) {
  directRevokeAttempt = {
    ok: false,
    txHash: null,
    error: error?.shortMessage || error?.message || String(error)
  };
}

const actions = [
  {
    label: 'AresScorecardLedger.grantRole(DISPUTE_ROLE, newDispute)',
    target: ledger,
    calldata: encodeFunctionData({
      abi: accessControlAbi,
      functionName: 'grantRole',
      args: [DISPUTE_ROLE, rehearsalDispute]
    })
  },
  {
    label: 'AresARIEngine.grantRole(DISPUTE_ROLE, newDispute)',
    target: ariEngine,
    calldata: encodeFunctionData({
      abi: accessControlAbi,
      functionName: 'grantRole',
      args: [DISPUTE_ROLE, rehearsalDispute]
    })
  },
  {
    label: 'AresDispute(old).setAdapterRole(oldAdapter, false)',
    target: oldDispute,
    calldata: encodeFunctionData({
      abi: disputeAbi,
      functionName: 'setAdapterRole',
      args: [oldAdapter, false]
    })
  },
  {
    label: 'AresScorecardLedger.revokeRole(DISPUTE_ROLE, oldDispute)',
    target: ledger,
    calldata: encodeFunctionData({
      abi: accessControlAbi,
      functionName: 'revokeRole',
      args: [DISPUTE_ROLE, oldDispute]
    })
  },
  {
    label: 'AresARIEngine.revokeRole(DISPUTE_ROLE, oldDispute)',
    target: ariEngine,
    calldata: encodeFunctionData({
      abi: accessControlAbi,
      functionName: 'revokeRole',
      args: [DISPUTE_ROLE, oldDispute]
    })
  }
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

const targets = actions.map((action) => action.target);
const values = actions.map(() => 0n);
const calldatas = actions.map((action) => action.calldata);
const submittedAt = new Date();
const description = `ARES B-03 Dispute v2 Cutover Proposal (${submittedAt.toISOString()})`;

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
    const decoded = decodeEventLog({ abi: governorAbi, data: log.data, topics: log.topics });
    if (decoded.eventName === 'ProposalCreated') {
      proposalId = decoded.args.proposalId;
      break;
    }
  } catch {
    // skip non-governor logs
  }
}
if (proposalId === null) {
  throw new Error(`ProposalCreated event not found in tx logs: ${proposeTxHash}`);
}

let proposeBlock = null;
try {
  proposeBlock = await publicClient.getBlock({ blockHash: receipt.blockHash });
} catch {
  try {
    proposeBlock = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  } catch {
    proposeBlock = await publicClient.getBlock({ blockTag: 'latest' });
  }
}

const [proposalState, snapshotBlock, deadlineBlock] = await Promise.all([
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'state', args: [proposalId] }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalSnapshot', args: [proposalId] }),
  publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalDeadline', args: [proposalId] })
]);

const queueEarliestBlock = BigInt(deadlineBlock) + 1n;
const secondsToQueue = (queueEarliestBlock - receipt.blockNumber) * BigInt(blockSecondsEstimate);
const queueEarliestIso = toIsoFrom(new Date(Number(proposeBlock.timestamp) * 1000), secondsToQueue);
const executeEarliestIso = toIsoFrom(new Date(queueEarliestIso), BigInt(minDelay));

const roleStateAfterProposal = {
  oldDisputeOldAdapterRole: await publicClient.readContract({
    address: oldDispute,
    abi: disputeAbi,
    functionName: 'hasRole',
    args: [ADAPTER_ROLE, oldAdapter]
  }),
  ledgerOldDisputeRole: await publicClient.readContract({
    address: ledger,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, oldDispute]
  }),
  ledgerNewDisputeRole: await publicClient.readContract({
    address: ledger,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, rehearsalDispute]
  }),
  ariOldDisputeRole: await publicClient.readContract({
    address: ariEngine,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, oldDispute]
  }),
  ariNewDisputeRole: await publicClient.readContract({
    address: ariEngine,
    abi: accessControlAbi,
    functionName: 'hasRole',
    args: [DISPUTE_ROLE, rehearsalDispute]
  })
};

const out = {
  generatedAt: new Date().toISOString(),
  chainId: 84532,
  signer: account.address,
  signerMatchesRecordedDeployer,
  contracts: {
    governor,
    timelock,
    token,
    oldDispute,
    oldAdapter,
    rehearsalDispute,
    rehearsalAdapter,
    ledger,
    ariEngine
  },
  baseline: {
    currentBlock: currentBlock.toString(),
    balance: balance.toString(),
    balanceAres: formatEther(balance),
    proposalThreshold: proposalThreshold.toString(),
    quorumNumerator: Number(quorumNumerator),
    votingDelay: votingDelay.toString(),
    votingPeriod: votingPeriod.toString(),
    timelockMinDelay: Number(minDelay)
  },
  roleStateBefore,
  directRevokeAttempt,
  governanceProposal: {
    description,
    actions,
    txHash: proposeTxHash,
    blockNumber: receipt.blockNumber.toString(),
    proposalId: proposalId.toString(),
    state: Number(proposalState),
    snapshotBlock: snapshotBlock.toString(),
    deadlineBlock: deadlineBlock.toString(),
    queueEarliestBlock: queueEarliestBlock.toString(),
    queueEarliestIso,
    executeEarliestIso
  },
  roleStateAfterProposal
};

const reportDir = path.resolve(root, 'reports/mainnet-gates');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.resolve(reportDir, 'B03-dispute-v2-cutover-raw.json'), JSON.stringify(out, null, 2));

console.log(`proposalId=${out.governanceProposal.proposalId}`);
console.log(`txHash=${out.governanceProposal.txHash}`);
console.log(`raw=${path.resolve(reportDir, 'B03-dispute-v2-cutover-raw.json')}`);
