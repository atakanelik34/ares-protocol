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
  getAddress,
  http,
  keccak256,
  parseAbiItem,
  toBytes
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(ROOT, '.env') });

export const CHAIN = baseSepolia;
export const BLOCK_SECONDS_ESTIMATE = Number(process.env.BLOCK_SECONDS_ESTIMATE || 2);

export const GOVERNOR_ADDRESS = getAddress(
  String(process.env.ARES_GOVERNOR || '0x99aA690870a0Df973B97e63b63c2A8375a80188e')
);
export const TIMELOCK_ADDRESS = getAddress(
  String(process.env.ARES_TIMELOCK || '0xB7C54e5fB3Bf2AB308F69889081742a1c87D3b5E')
);

export const PROPOSALS = {
  b01b02: {
    key: 'b01b02',
    label: 'B-01/B-02',
    proposalId: BigInt('58654035350196392900949207696152763655652189042590194943354964272374651090926'),
    proposeTxHash: '0x89714fb818a12135d88d0d52749bf428b18c043bff7908e4f9e5c5f99b171dd0',
    queueEarliestTrt: '2026-03-26 07:23:22 TRT',
    executeEarliestTrt: '2026-03-28 07:23:22 TRT'
  },
  b03: {
    key: 'b03',
    label: 'B-03',
    proposalId: BigInt('102745141475066169865705909421050107559936801418546675182434592432068222986157'),
    proposeTxHash: '0xce0afc99a1544a994e326115137cab453369d601acafbd1a1f22d6e4383c1791',
    queueEarliestTrt: '2026-03-26 08:46:32 TRT',
    executeEarliestTrt: '2026-03-28 08:46:32 TRT'
  }
};

export const STATE_NAMES = {
  0: 'Pending',
  1: 'Active',
  2: 'Canceled',
  3: 'Defeated',
  4: 'Succeeded',
  5: 'Queued',
  6: 'Expired',
  7: 'Executed'
};

const proposalCreatedEvent = {
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
};

const proposalQueuedEvent = parseAbiItem('event ProposalQueued(uint256 proposalId, uint256 etaSeconds)');

export const governorReadAbi = [
  { type: 'function', name: 'state', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'proposalSnapshot', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'proposalDeadline', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
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
  { type: 'function', name: 'proposalEta', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] }
];

export const governorWriteAbi = [
  ...governorReadAbi,
  {
    type: 'function',
    name: 'queue',
    stateMutability: 'nonpayable',
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
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'descriptionHash', type: 'bytes32' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  proposalCreatedEvent
];

export const timelockAbi = [
  { type: 'function', name: 'getMinDelay', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];

const accessControlAbi = [
  { type: 'function', name: 'grantRole', stateMutability: 'nonpayable', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [] },
  { type: 'function', name: 'revokeRole', stateMutability: 'nonpayable', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [] }
];
const disputeAbi = [
  ...accessControlAbi,
  { type: 'function', name: 'setAdapterRole', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [] }
];

function ensureHexKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('0x') ? raw : `0x${raw}`;
}

export function toIsoFromSeconds(seconds) {
  return new Date(Number(seconds) * 1000).toISOString();
}

export function formatState(stateCode) {
  return `${stateCode} (${STATE_NAMES[stateCode] || 'Unknown'})`;
}

export function selectProposalKeys(argv) {
  const arg = argv.find((part) => part.startsWith('--proposal=')) || '--proposal=all';
  const raw = arg.split('=')[1].trim().toLowerCase();
  if (raw === 'all') return ['b01b02', 'b03'];
  if (raw === 'b01b02' || raw === 'b01-b02' || raw === 'b01') return ['b01b02'];
  if (raw === 'b03') return ['b03'];
  throw new Error(`Unsupported --proposal value "${raw}". Use all | b01b02 | b03`);
}

function getRpcUrl() {
  const rpcUrl = String(process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_RPC_URL || '').trim();
  if (!rpcUrl) {
    throw new Error('Missing BASE_SEPOLIA_RPC_URL (or BASE_RPC_URL) in root .env');
  }
  return rpcUrl;
}

export function createClients({ withWallet }) {
  const rpcUrl = getRpcUrl();
  const publicClient = createPublicClient({ chain: CHAIN, transport: http(rpcUrl) });

  if (!withWallet) return { publicClient, walletClient: null, account: null };

  const deployerPk = ensureHexKey(process.env.ARES_DEPLOYER_KEY);
  if (!deployerPk || !/^0x[0-9a-fA-F]{64}$/.test(deployerPk)) {
    throw new Error('Missing or invalid ARES_DEPLOYER_KEY in root .env');
  }
  const account = privateKeyToAccount(deployerPk);
  const walletClient = createWalletClient({ account, chain: CHAIN, transport: http(rpcUrl) });
  return { publicClient, walletClient, account };
}

export async function resolveProposalPayload(proposalKey) {
  if (proposalKey === 'b01b02') {
    const payloadPath = path.resolve(ROOT, 'deploy/contracts/remediation-conservative-payloads.base-sepolia.json');
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    const actions = (payload.governanceActions || []).map((action) => ({
      label: `${action.contract}.${action.function}`,
      target: getAddress(action.target),
      value: 0n,
      calldata: action.calldata
    }));
    return actions;
  }

  if (proposalKey === 'b03') {
    const addressesPath = path.resolve(ROOT, 'deploy/contracts/addresses.base-sepolia.json');
    const b03RawPath = path.resolve(ROOT, 'reports/mainnet-gates/B03-dispute-v2-cutover-raw.json');
    if (!fs.existsSync(b03RawPath)) {
      throw new Error(`Missing B-03 source artifact: ${b03RawPath}`);
    }
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    const b03Raw = JSON.parse(fs.readFileSync(b03RawPath, 'utf8'));

    const oldDispute = getAddress(addresses.contracts.AresDispute);
    const ledger = getAddress(addresses.contracts.AresScorecardLedger);
    const ariEngine = getAddress(addresses.contracts.AresARIEngine);
    const oldAdapter = getAddress(addresses.contracts.ERC8004ValidationAdapter);
    const rehearsalDispute = getAddress(String(b03Raw.rehearsalDispute || ''));

    const DISPUTE_ROLE = keccak256(toBytes('DISPUTE_ROLE'));

    return [
      {
        label: 'AresScorecardLedger.grantRole(DISPUTE_ROLE,rehearsalDispute)',
        target: ledger,
        value: 0n,
        calldata: encodeFunctionData({
          abi: accessControlAbi,
          functionName: 'grantRole',
          args: [DISPUTE_ROLE, rehearsalDispute]
        })
      },
      {
        label: 'AresARIEngine.grantRole(DISPUTE_ROLE,rehearsalDispute)',
        target: ariEngine,
        value: 0n,
        calldata: encodeFunctionData({
          abi: accessControlAbi,
          functionName: 'grantRole',
          args: [DISPUTE_ROLE, rehearsalDispute]
        })
      },
      {
        label: 'AresDispute.setAdapterRole(oldAdapter,false)',
        target: oldDispute,
        value: 0n,
        calldata: encodeFunctionData({
          abi: disputeAbi,
          functionName: 'setAdapterRole',
          args: [oldAdapter, false]
        })
      },
      {
        label: 'AresScorecardLedger.revokeRole(DISPUTE_ROLE,oldDispute)',
        target: ledger,
        value: 0n,
        calldata: encodeFunctionData({
          abi: accessControlAbi,
          functionName: 'revokeRole',
          args: [DISPUTE_ROLE, oldDispute]
        })
      },
      {
        label: 'AresARIEngine.revokeRole(DISPUTE_ROLE,oldDispute)',
        target: ariEngine,
        value: 0n,
        calldata: encodeFunctionData({
          abi: accessControlAbi,
          functionName: 'revokeRole',
          args: [DISPUTE_ROLE, oldDispute]
        })
      }
    ];
  }

  throw new Error(`Unsupported proposal key: ${proposalKey}`);
}

async function decodeProposalFromReceipt(publicClient, proposalId, txHash) {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== GOVERNOR_ADDRESS) continue;
    try {
      const decoded = decodeEventLog({
        abi: [proposalCreatedEvent],
        data: log.data,
        topics: log.topics
      });
      if (decoded.eventName !== 'ProposalCreated') continue;
      const foundId = BigInt(decoded.args.proposalId.toString());
      if (foundId !== proposalId) continue;
      return {
        proposalId: foundId,
        txHash,
        blockNumber: receipt.blockNumber,
        proposer: getAddress(decoded.args.proposer),
        targets: decoded.args.targets.map((address) => getAddress(address)),
        values: decoded.args.values.map((value) => BigInt(value.toString())),
        calldatas: [...decoded.args.calldatas],
        voteStart: BigInt(decoded.args.voteStart.toString()),
        voteEnd: BigInt(decoded.args.voteEnd.toString()),
        description: decoded.args.description
      };
    } catch {
      // ignore unrelated logs
    }
  }
  return null;
}

async function scanProposalCreatedById(publicClient, proposalId) {
  const latest = Number(await publicClient.getBlockNumber());
  const scanFromDefault = Math.max(0, latest - 2_000_000);
  const scanFrom = Number(process.env.GOVERNOR_SCAN_FROM_BLOCK || scanFromDefault);
  const chunk = Number(process.env.GOVERNOR_SCAN_CHUNK || 5000);

  for (let from = scanFrom; from <= latest; from += chunk) {
    const to = Math.min(latest, from + chunk - 1);
    const logs = await publicClient.getLogs({
      address: GOVERNOR_ADDRESS,
      event: proposalCreatedEvent,
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    });
    for (const log of logs) {
      const foundId = BigInt(log.args.proposalId.toString());
      if (foundId !== proposalId) continue;
      return {
        proposalId: foundId,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        proposer: getAddress(log.args.proposer),
        targets: log.args.targets.map((address) => getAddress(address)),
        values: log.args.values.map((value) => BigInt(value.toString())),
        calldatas: [...log.args.calldatas],
        voteStart: BigInt(log.args.voteStart.toString()),
        voteEnd: BigInt(log.args.voteEnd.toString()),
        description: log.args.description
      };
    }
  }
  throw new Error(
    `Could not resolve ProposalCreated event for proposalId=${proposalId.toString()} in scanned block range.`
  );
}

export async function resolveProposalCreated(publicClient, proposalDef) {
  const knownTxHash = proposalDef.proposeTxHash ? String(proposalDef.proposeTxHash) : '';
  if (knownTxHash) {
    try {
      const found = await decodeProposalFromReceipt(publicClient, proposalDef.proposalId, knownTxHash);
      if (found) return found;
    } catch {
      // fallback to scan mode below
    }
  }
  return scanProposalCreatedById(publicClient, proposalDef.proposalId);
}

export async function fetchQueuedEtaSeconds(publicClient, proposalId, fallbackFromBlock) {
  try {
    const eta = await publicClient.readContract({
      address: GOVERNOR_ADDRESS,
      abi: governorReadAbi,
      functionName: 'proposalEta',
      args: [proposalId]
    });
    if (BigInt(eta) > 0n) return BigInt(eta);
  } catch {
    // fall back to event scan below
  }

  const latest = await publicClient.getBlockNumber();
  const fromBlock = fallbackFromBlock > 0n ? fallbackFromBlock : 0n;
  const chunk = Number(process.env.GOVERNOR_SCAN_CHUNK || 5000);

  for (let start = fromBlock; start <= latest; start += BigInt(chunk)) {
    const end = start + BigInt(chunk - 1) > latest ? latest : start + BigInt(chunk - 1);
    const logs = await publicClient.getLogs({
      address: GOVERNOR_ADDRESS,
      event: proposalQueuedEvent,
      fromBlock: start,
      toBlock: end
    });
    for (let i = logs.length - 1; i >= 0; i -= 1) {
      const log = logs[i];
      if (BigInt(log.args.proposalId.toString()) !== proposalId) continue;
      return BigInt(log.args.etaSeconds.toString());
    }
  }
  return 0n;
}

export async function loadProposalRuntime(publicClient, proposalDef) {
  const created = await resolveProposalCreated(publicClient, proposalDef);
  const descriptionHash = keccak256(toBytes(created.description));
  const [stateCode, snapshotBlock, deadlineBlock, hashProposalValue, currentBlock, currentBlockData, minDelay] =
    await Promise.all([
      publicClient.readContract({
        address: GOVERNOR_ADDRESS,
        abi: governorReadAbi,
        functionName: 'state',
        args: [proposalDef.proposalId]
      }),
      publicClient.readContract({
        address: GOVERNOR_ADDRESS,
        abi: governorReadAbi,
        functionName: 'proposalSnapshot',
        args: [proposalDef.proposalId]
      }),
      publicClient.readContract({
        address: GOVERNOR_ADDRESS,
        abi: governorReadAbi,
        functionName: 'proposalDeadline',
        args: [proposalDef.proposalId]
      }),
      publicClient.readContract({
        address: GOVERNOR_ADDRESS,
        abi: governorReadAbi,
        functionName: 'hashProposal',
        args: [created.targets, created.values, created.calldatas, descriptionHash]
      }),
      publicClient.getBlockNumber(),
      publicClient.getBlock({ blockTag: 'latest' }),
      publicClient.readContract({
        address: TIMELOCK_ADDRESS,
        abi: timelockAbi,
        functionName: 'getMinDelay'
      })
    ]);

  const queueEarliestBlock = BigInt(deadlineBlock) + 1n;
  const blockDelta = queueEarliestBlock > currentBlock ? queueEarliestBlock - currentBlock : 0n;
  const queueEarliestTs = BigInt(currentBlockData.timestamp) + blockDelta * BigInt(BLOCK_SECONDS_ESTIMATE);
  const shouldQueryEta = Number(stateCode) === 5 || Number(stateCode) === 7;
  const etaSeconds = shouldQueryEta
    ? await fetchQueuedEtaSeconds(publicClient, proposalDef.proposalId, created.blockNumber)
    : 0n;
  const expectedExecuteTs = etaSeconds > 0n ? etaSeconds : queueEarliestTs + BigInt(minDelay);

  return {
    proposal: proposalDef,
    created,
    descriptionHash,
    stateCode: Number(stateCode),
    snapshotBlock: BigInt(snapshotBlock),
    deadlineBlock: BigInt(deadlineBlock),
    queueEarliestBlock,
    queueEarliestTs,
    etaSeconds,
    expectedExecuteTs,
    currentBlock,
    currentTs: BigInt(currentBlockData.timestamp),
    minDelay: BigInt(minDelay),
    hashProposalValue: BigInt(hashProposalValue),
    queueWindowOpen: Number(stateCode) === 4,
    executeWindowOpen: Number(stateCode) === 5 && etaSeconds > 0n && BigInt(currentBlockData.timestamp) >= etaSeconds
  };
}

export async function validateProposalPayloadMatchesExpected(proposalRuntime) {
  const expectedActions = await resolveProposalPayload(proposalRuntime.proposal.key);
  const expectedTargets = expectedActions.map((action) => action.target);
  const expectedValues = expectedActions.map((action) => action.value);
  const expectedCalldatas = expectedActions.map((action) => action.calldata.toLowerCase());

  const createdTargets = proposalRuntime.created.targets.map((target) => getAddress(target));
  const createdValues = proposalRuntime.created.values.map((value) => BigInt(value));
  const createdCalldatas = proposalRuntime.created.calldatas.map((value) => String(value).toLowerCase());

  const sameLength =
    expectedTargets.length === createdTargets.length &&
    expectedValues.length === createdValues.length &&
    expectedCalldatas.length === createdCalldatas.length;

  if (!sameLength) {
    throw new Error(
      `[${proposalRuntime.proposal.label}] Proposal payload length mismatch: expected ${expectedTargets.length} actions, got ${createdTargets.length}`
    );
  }

  for (let i = 0; i < expectedTargets.length; i += 1) {
    if (expectedTargets[i] !== createdTargets[i]) {
      throw new Error(
        `[${proposalRuntime.proposal.label}] Target mismatch at index ${i}: expected ${expectedTargets[i]}, got ${createdTargets[i]}`
      );
    }
    if (expectedValues[i] !== createdValues[i]) {
      throw new Error(
        `[${proposalRuntime.proposal.label}] Value mismatch at index ${i}: expected ${expectedValues[i].toString()}, got ${createdValues[i].toString()}`
      );
    }
    if (expectedCalldatas[i] !== createdCalldatas[i]) {
      throw new Error(
        `[${proposalRuntime.proposal.label}] Calldata mismatch at index ${i}: expected ${expectedCalldatas[i]}, got ${createdCalldatas[i]}`
      );
    }
  }
}

export function printProposalDetails(runtime) {
  const hashMatches = runtime.hashProposalValue === runtime.proposal.proposalId;
  console.log(`\n=== ${runtime.proposal.label} ===`);
  console.log(`proposalId: ${runtime.proposal.proposalId.toString()}`);
  console.log(`state: ${formatState(runtime.stateCode)}`);
  console.log(`proposalCreatedTx: ${runtime.created.txHash}`);
  console.log(`description: ${runtime.created.description}`);
  console.log(`descriptionHash: ${runtime.descriptionHash}`);
  console.log(`hashProposal(...) => ${runtime.hashProposalValue.toString()} (matches proposalId: ${hashMatches})`);
  console.log(`snapshotBlock: ${runtime.snapshotBlock.toString()}`);
  console.log(`deadlineBlock: ${runtime.deadlineBlock.toString()}`);
  console.log(`queueEarliestBlock: ${runtime.queueEarliestBlock.toString()}`);
  console.log(`queueEarliestEstimateUtc: ${toIsoFromSeconds(runtime.queueEarliestTs)}`);
  console.log(`queueEarliestReferenceTrt: ${runtime.proposal.queueEarliestTrt}`);
  console.log(`executeEarliestReferenceTrt: ${runtime.proposal.executeEarliestTrt}`);
  if (runtime.etaSeconds > 0n) {
    console.log(`queuedEtaUtc: ${toIsoFromSeconds(runtime.etaSeconds)}`);
  } else {
    console.log('queuedEtaUtc: n/a (proposal not queued yet)');
  }
  console.log(`expectedEarliestExecuteUtc: ${toIsoFromSeconds(runtime.expectedExecuteTs)}`);
  console.log(`currentBlock: ${runtime.currentBlock.toString()}`);
  console.log(`currentTimeUtc: ${toIsoFromSeconds(runtime.currentTs)}`);
  console.log(`timelockMinDelaySeconds: ${runtime.minDelay.toString()}`);
  console.log('targets/values/calldatas:');
  for (let i = 0; i < runtime.created.targets.length; i += 1) {
    console.log(`  [${i}] target=${runtime.created.targets[i]}`);
    console.log(`      value=${runtime.created.values[i].toString()}`);
    console.log(`      calldata=${runtime.created.calldatas[i]}`);
  }
}
