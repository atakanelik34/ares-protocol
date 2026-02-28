#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  keccak256,
  toBytes,
  encodeAbiParameters,
  formatEther
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = process.env;
const rpcUrl = env.BASE_SEPOLIA_RPC_URL || env.BASE_RPC_URL;
const deployerPk = env.ARES_DEPLOYER_KEY?.startsWith('0x')
  ? env.ARES_DEPLOYER_KEY
  : env.ARES_DEPLOYER_KEY
    ? `0x${env.ARES_DEPLOYER_KEY}`
    : '';

if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL');
if (!deployerPk) throw new Error('Missing ARES_DEPLOYER_KEY');

const addressesPath = env.ARES_ADDRESSES_FILE
  ? path.resolve(env.ARES_ADDRESSES_FILE)
  : path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json');
if (!fs.existsSync(addressesPath)) throw new Error(`Missing addresses file: ${addressesPath}`);

const contracts = JSON.parse(fs.readFileSync(addressesPath, 'utf8')).contracts;
const tokenAddress = contracts.AresToken;
const registryAddress = contracts.AresRegistry;
const ledgerAddress = contracts.AresScorecardLedger;
const engineAddress = contracts.AresARIEngine;
const disputeAddress = contracts.AresDispute;

const ADAPTER_ROLE = keccak256(toBytes('ADAPTER_ROLE'));

const tokenAbi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }
];

const registryAbi = [
  { type: 'function', name: 'minStake', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'setMinStake', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'setAdapterRole', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [] },
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'resolveAgentId', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'registerAgent',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'string' }, { type: 'bytes32' }],
    outputs: [{ type: 'uint256' }]
  }
];

const ledgerAbi = [
  { type: 'function', name: 'authorizedScorers', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'setAuthorizedScorer', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [] },
  {
    type: 'function',
    name: 'recordActionScore',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'bytes32' }, { type: 'uint16[5]' }, { type: 'uint64' }, { type: 'bytes' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'getAction',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'bytes32' }],
    outputs: [{ type: 'uint16[5]' }, { type: 'uint64' }, { type: 'address' }, { type: 'uint8' }]
  }
];

const disputeAbi = [
  { type: 'function', name: 'nextDisputeId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minChallengerStake', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minValidatorStake', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'quorum', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'slashingBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] },
  { type: 'function', name: 'treasury', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'votingPeriod', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  {
    type: 'function',
    name: 'setDisputeParams',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint64' }, { type: 'uint256' }, { type: 'uint16' }, { type: 'address' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'disputeAction',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'string' }],
    outputs: [{ type: 'uint256' }]
  },
  { type: 'function', name: 'validatorJoin', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'vote', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }, { type: 'bool' }], outputs: [] },
  { type: 'function', name: 'finalize', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] }
];

const engineAbi = [
  {
    type: 'function',
    name: 'getARIByAgentId',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }, { type: 'uint8' }, { type: 'uint32' }, { type: 'uint64' }, { type: 'uint64' }]
  }
];

const deployerAccount = privateKeyToAccount(deployerPk);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
const wallet = createWalletClient({ account: deployerAccount, chain: baseSepolia, transport: http(rpcUrl) });

const demoOperators = [
  '0x1000000000000000000000000000000000000001',
  '0x2000000000000000000000000000000000000002',
  '0x3000000000000000000000000000000000000003'
];

const proof = {
  generatedAt: new Date().toISOString(),
  deployer: deployerAccount.address,
  contracts: contracts,
  operators: demoOperators,
  txs: [],
  agentIds: [],
  actionsRecorded: 0,
  dispute: null
};

function log(message) {
  console.log(`[demo] ${message}`);
}

async function writeAndWait(label, args) {
  const hash = await wallet.writeContract(args);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  proof.txs.push({ label, hash, block: Number(receipt.blockNumber) });
  log(`${label}: ${hash}`);
  return receipt;
}

function scoresFor(i) {
  const b = 120 + (i % 20);
  return [b, b - 5, b - 10, b - 15, b - 20];
}

async function main() {
  const deployerBalance = await publicClient.getBalance({ address: deployerAccount.address });
  log(`deployer balance: ${formatEther(deployerBalance)} ETH`);
  if (deployerBalance < parseEther('0.005')) {
    throw new Error('Not enough ETH for demo run. Top up deployer on Base Sepolia.');
  }

  const oldMinStake = await publicClient.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'minStake'
  });
  const hadAdapterRole = await publicClient.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'hasRole',
    args: [ADAPTER_ROLE, deployerAccount.address]
  });

  if (!hadAdapterRole) {
    await writeAndWait('grant-adapter-role-to-deployer', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setAdapterRole',
      args: [deployerAccount.address, true]
    });
  }

  if (oldMinStake > 0n) {
    await writeAndWait('set-min-stake-0-for-demo-registration', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setMinStake',
      args: [0n]
    });
  }

  for (let i = 0; i < demoOperators.length; i++) {
    const op = demoOperators[i];
    let agentId = await publicClient.readContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: 'resolveAgentId',
      args: [op]
    });
    if (agentId === 0n) {
      const metadataURI = `ipfs://ares/demo/agent-${i + 1}.json`;
      const metadataHash = keccak256(toBytes(`ares-demo-agent-${i + 1}`));
      await writeAndWait(`register-agent-${i + 1}`, {
        address: registryAddress,
        abi: registryAbi,
        functionName: 'registerAgent',
        args: [op, metadataURI, metadataHash]
      });
      agentId = await publicClient.readContract({
        address: registryAddress,
        abi: registryAbi,
        functionName: 'resolveAgentId',
        args: [op]
      });
    }
    proof.agentIds.push(agentId.toString());
  }

  if (oldMinStake > 0n) {
    await writeAndWait('restore-min-stake', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setMinStake',
      args: [oldMinStake]
    });
  }
  if (!hadAdapterRole) {
    await writeAndWait('revoke-adapter-role-from-deployer', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setAdapterRole',
      args: [deployerAccount.address, false]
    });
  }

  const scorerAuthorized = await publicClient.readContract({
    address: ledgerAddress,
    abi: ledgerAbi,
    functionName: 'authorizedScorers',
    args: [deployerAccount.address]
  });
  if (!scorerAuthorized) {
    await writeAndWait('authorize-scorer', {
      address: ledgerAddress,
      abi: ledgerAbi,
      functionName: 'setAuthorizedScorer',
      args: [deployerAccount.address, true]
    });
  }

  const minChallengerStake = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'minChallengerStake'
  });
  const minValidatorStake = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'minValidatorStake'
  });
  const quorum = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'quorum'
  });
  const slashingBps = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'slashingBps'
  });
  const treasury = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'treasury'
  });
  const oldVotingPeriod = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'votingPeriod'
  });

  if (Number(oldVotingPeriod) > 15) {
    await writeAndWait('set-voting-period-10s', {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'setDisputeParams',
      args: [minChallengerStake, minValidatorStake, 10, quorum, slashingBps, treasury]
    });
  }

  const neededStake = minChallengerStake + minValidatorStake + parseEther('5');
  const tokenBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [deployerAccount.address]
  });
  if (tokenBalance < neededStake) {
    await writeAndWait('mint-token-for-dispute-stakes', {
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'mint',
      args: [deployerAccount.address, neededStake - tokenBalance + parseEther('20')]
    });
  }

  await writeAndWait('approve-token-to-dispute', {
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'approve',
    args: [disputeAddress, parseEther('1000000')]
  });

  const actionSpecs = [];
  for (let i = 0; i < 20; i++) {
    const op = demoOperators[i % demoOperators.length];
    const agentId = proof.agentIds[i % proof.agentIds.length];
    actionSpecs.push({
      label: `demo-action-${i + 1}`,
      operator: op,
      agentId,
      actionId: keccak256(toBytes(`demo-action-${i + 1}`)),
      timestamp: BigInt(Math.floor(Date.now() / 1000) - (20 - i) * 45)
    });
  }

  for (let i = 0; i < actionSpecs.length; i++) {
    const spec = actionSpecs[i];
    const state = await publicClient.readContract({
      address: ledgerAddress,
      abi: ledgerAbi,
      functionName: 'getAction',
      args: [BigInt(spec.agentId), spec.actionId]
    });
    if (Number(state[3]) !== 0) continue;

    const scores = scoresFor(i);
    const scoresHash = keccak256(
      encodeAbiParameters(
        [{ type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }],
        scores
      )
    );

    const signature = await wallet.signTypedData({
      domain: {
        name: 'AresScorecardLedger',
        version: '1',
        chainId: baseSepolia.id,
        verifyingContract: ledgerAddress
      },
      types: {
        ActionScore: [
          { name: 'agent', type: 'address' },
          { name: 'actionId', type: 'bytes32' },
          { name: 'scoresHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint64' }
        ]
      },
      primaryType: 'ActionScore',
      message: {
        agent: spec.operator,
        actionId: spec.actionId,
        scoresHash,
        timestamp: spec.timestamp
      }
    });

    await writeAndWait(`record-${spec.label}`, {
      address: ledgerAddress,
      abi: ledgerAbi,
      functionName: 'recordActionScore',
      args: [spec.operator, spec.actionId, scores, spec.timestamp, signature]
    });
    proof.actionsRecorded += 1;
  }

  const target = actionSpecs.find((spec) => {
    return spec.agentId === proof.agentIds[0];
  });
  if (!target) throw new Error('No dispute target found');

  const before = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getARIByAgentId',
    args: [BigInt(target.agentId)]
  });

  const nextDisputeId = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'nextDisputeId'
  });

  await writeAndWait('open-dispute', {
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'disputeAction',
    args: [BigInt(target.agentId), target.actionId, minChallengerStake, 'ipfs://ares/demo/disputes/1.json']
  });
  await writeAndWait('validator-join', {
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'validatorJoin',
    args: [nextDisputeId, minValidatorStake]
  });
  await writeAndWait('vote-accept', {
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'vote',
    args: [nextDisputeId, true]
  });

  log('waiting 12s for voting deadline...');
  await new Promise((r) => setTimeout(r, 12_000));

  await writeAndWait('finalize-dispute', {
    address: disputeAddress,
    abi: disputeAbi,
    functionName: 'finalize',
    args: [nextDisputeId]
  });

  const after = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getARIByAgentId',
    args: [BigInt(target.agentId)]
  });
  const targetState = await publicClient.readContract({
    address: ledgerAddress,
    abi: ledgerAbi,
    functionName: 'getAction',
    args: [BigInt(target.agentId), target.actionId]
  });

  proof.dispute = {
    disputeId: nextDisputeId.toString(),
    actionId: target.actionId,
    targetAgentId: target.agentId,
    ariBefore: Number(before[0]),
    ariAfter: Number(after[0]),
    validActionsBefore: Number(before[2]),
    validActionsAfter: Number(after[2]),
    actionStatusAfter: Number(targetState[3])
  };

  if (Number(oldVotingPeriod) > 15) {
    await writeAndWait('restore-voting-period', {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'setDisputeParams',
      args: [minChallengerStake, minValidatorStake, oldVotingPeriod, quorum, slashingBps, treasury]
    });
  }

  const outDir = path.resolve(root, 'docs/demo');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, 'sepolia-demo-proof.json');
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2) + '\n');

  log(`done -> ${outPath}`);
  log(`ARI: ${proof.dispute.ariBefore} -> ${proof.dispute.ariAfter}`);
  log(`valid actions: ${proof.dispute.validActionsBefore} -> ${proof.dispute.validActionsAfter}`);
}

main().catch((error) => {
  console.error('[demo] failed:', error);
  process.exit(1);
});
