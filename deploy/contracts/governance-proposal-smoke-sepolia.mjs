#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  keccak256,
  parseAbi,
  toBytes
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

const env = { ...loadEnv(path.resolve(root, '.env')), ...process.env };
const rpcUrl = env.BASE_SEPOLIA_RPC_URL || env.BASE_RPC_URL;
const deployerPk = env.DEPLOYER_PRIVATE_KEY?.startsWith('0x')
  ? env.DEPLOYER_PRIVATE_KEY
  : env.DEPLOYER_PRIVATE_KEY
    ? `0x${env.DEPLOYER_PRIVATE_KEY}`
    : '';
const proofPath = path.resolve(root, 'docs/demo/governance-proposal-smoke-sepolia.json');

if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL');
if (!deployerPk) throw new Error('Missing DEPLOYER_PRIVATE_KEY');

const governanceJson = JSON.parse(
  fs.readFileSync(path.resolve(root, 'deploy/contracts/governance.base-sepolia.json'), 'utf8')
);
const coreJson = JSON.parse(
  fs.readFileSync(path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json'), 'utf8')
);

const governor = getAddress(governanceJson.governance.AresGovernor);
const timelock = getAddress(governanceJson.governance.TimelockController);
const token = getAddress(coreJson.contracts.AresToken);
const registry = getAddress(coreJson.contracts.AresRegistry);
const account = privateKeyToAccount(deployerPk);

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

const tokenAbi = parseAbi([
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function delegates(address) view returns (address)',
  'function getVotes(address) view returns (uint256)',
  'function delegate(address delegatee)'
]);

const governorAbi = parseAbi([
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
  'function quorum(uint256 blockNumber) view returns (uint256)',
  'function hashProposal(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash) view returns (uint256)',
  'function propose(address[] targets,uint256[] values,bytes[] calldatas,string description) returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalSnapshot(uint256 proposalId) view returns (uint256)',
  'function proposalDeadline(uint256 proposalId) view returns (uint256)'
]);

const timelockAbi = parseAbi(['function getMinDelay() view returns (uint256)']);
const registryAbi = parseAbi(['function minStake() view returns (uint256)', 'function setMinStake(uint256 newMinStake)']);

function stateName(state) {
  switch (Number(state)) {
    case 0:
      return 'Pending';
    case 1:
      return 'Active';
    case 2:
      return 'Canceled';
    case 3:
      return 'Defeated';
    case 4:
      return 'Succeeded';
    case 5:
      return 'Queued';
    case 6:
      return 'Expired';
    case 7:
      return 'Executed';
    default:
      return 'Unknown';
  }
}

function toIsoFromNow(secondsFromNow) {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

async function main() {
  const [currentBlock, symbol, votingDelay, votingPeriod, proposalThreshold, timelockDelay, currentMinStake] =
    await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'symbol' }),
      publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'votingDelay' }),
      publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'votingPeriod' }),
      publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalThreshold' }),
      publicClient.readContract({ address: timelock, abi: timelockAbi, functionName: 'getMinDelay' }),
      publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'minStake' })
    ]);

  const quorumBlock = currentBlock > 0n ? currentBlock - 1n : 0n;
  const [quorumAtCurrentBlock, balanceBefore, delegatesBefore, votesBefore] = await Promise.all([
    publicClient.readContract({
      address: governor,
      abi: governorAbi,
      functionName: 'quorum',
      args: [quorumBlock]
    }),
    publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'delegates', args: [account.address] }),
    publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'getVotes', args: [account.address] })
  ]);

  let delegateTxHash = null;
  if (balanceBefore > 0n && (delegatesBefore === '0x0000000000000000000000000000000000000000' || votesBefore === 0n)) {
    delegateTxHash = await walletClient.writeContract({
      address: token,
      abi: tokenAbi,
      functionName: 'delegate',
      args: [account.address]
    });
    await publicClient.waitForTransactionReceipt({ hash: delegateTxHash });
  }

  const [delegatesAfter, votesAfter] = await Promise.all([
    publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'delegates', args: [account.address] }),
    publicClient.readContract({ address: token, abi: tokenAbi, functionName: 'getVotes', args: [account.address] })
  ]);

  const newMinStake = currentMinStake + 1n;
  const description = `SMOKE-SEP-2026-02-27: setMinStake +1 wei (${currentMinStake} -> ${newMinStake})`;
  const calldata = encodeFunctionData({
    abi: registryAbi,
    functionName: 'setMinStake',
    args: [newMinStake]
  });
  const targets = [registry];
  const values = [0n];
  const calldatas = [calldata];
  const descriptionHash = keccak256(toBytes(description));

  const proposalId = await publicClient.readContract({
    address: governor,
    abi: governorAbi,
    functionName: 'hashProposal',
    args: [targets, values, calldatas, descriptionHash]
  });

  const proposeTxHash = await walletClient.writeContract({
    address: governor,
    abi: governorAbi,
    functionName: 'propose',
    args: [targets, values, calldatas, description]
  });
  const proposeReceipt = await publicClient.waitForTransactionReceipt({ hash: proposeTxHash });

  const [proposalState, snapshotBlock, deadlineBlock] = await Promise.all([
    publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'state', args: [proposalId] }),
    publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalSnapshot', args: [proposalId] }),
    publicClient.readContract({ address: governor, abi: governorAbi, functionName: 'proposalDeadline', args: [proposalId] })
  ]);

  const averageBlockSeconds = 2;
  const etaActiveSeconds = Number(votingDelay) * averageBlockSeconds;
  const etaVoteEndSeconds = Number(votingDelay + votingPeriod) * averageBlockSeconds;
  const etaQueueSeconds = etaVoteEndSeconds;
  const etaExecuteSeconds = etaVoteEndSeconds + Number(timelockDelay);

  const proof = {
    generatedAt: new Date().toISOString(),
    chain: {
      name: 'base-sepolia',
      chainId: 84532,
      rpc: rpcUrl
    },
    contracts: {
      governor,
      timelock,
      token,
      registry
    },
    proposer: account.address,
    tokenVoting: {
      symbol,
      balanceBefore: balanceBefore.toString(),
      delegatesBefore,
      votesBefore: votesBefore.toString(),
      delegateTxHash,
      delegatesAfter,
      votesAfter: votesAfter.toString()
    },
    governanceParams: {
      votingDelayBlocks: votingDelay.toString(),
      votingPeriodBlocks: votingPeriod.toString(),
      proposalThreshold: proposalThreshold.toString(),
      quorumBlock: quorumBlock.toString(),
      quorumAtCurrentBlock: quorumAtCurrentBlock.toString(),
      timelockMinDelaySeconds: timelockDelay.toString()
    },
    proposal: {
      proposalId: proposalId.toString(),
      description,
      descriptionHash,
      target: registry,
      function: 'setMinStake(uint256)',
      currentMinStake: currentMinStake.toString(),
      proposedMinStake: newMinStake.toString(),
      calldata,
      proposeTxHash,
      proposeBlockNumber: proposeReceipt.blockNumber.toString(),
      state: {
        code: Number(proposalState),
        name: stateName(proposalState)
      },
      snapshotBlock: snapshotBlock.toString(),
      deadlineBlock: deadlineBlock.toString()
    },
    estimatedTimeline: {
      assumption: '2 sec/block approximation for planning only',
      activeAround: toIsoFromNow(etaActiveSeconds),
      voteEndsAround: toIsoFromNow(etaVoteEndSeconds),
      queueEarliestAround: toIsoFromNow(etaQueueSeconds),
      executeEarliestAround: toIsoFromNow(etaExecuteSeconds),
      note:
        'This smoke test proves on-chain proposal creation on live governance. Vote/queue/execute require waiting for configured delay/period/minDelay windows.'
    },
    explorerLinks: {
      proposeTx: `https://sepolia.basescan.org/tx/${proposeTxHash}`,
      governor: `https://sepolia.basescan.org/address/${governor}`,
      timelock: `https://sepolia.basescan.org/address/${timelock}`
    }
  };

  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);

  console.log(`Wrote: ${proofPath}`);
  console.log(`Proposal ID: ${proof.proposal.proposalId}`);
  console.log(`Proposal state: ${proof.proposal.state.name}`);
  console.log(`Propose tx: ${proof.proposal.proposeTxHash}`);
  console.log(`Votes after delegation: ${formatEther(votesAfter)} ${symbol}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
