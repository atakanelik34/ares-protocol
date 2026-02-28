#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  encodeAbiParameters,
  formatEther,
  parseEther
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
const subgraphUrl = env.SUBGRAPH_QUERY_URL;
const subgraphApiKey = env.SUBGRAPH_API_KEY || '';
const apiBase = env.DEMO_API_BASE || 'https://ares-protocol.xyz/api';
const deployerPk = env.ARES_DEPLOYER_KEY?.startsWith('0x')
  ? env.ARES_DEPLOYER_KEY
  : env.ARES_DEPLOYER_KEY
    ? `0x${env.ARES_DEPLOYER_KEY}`
    : '';

if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL');
if (!deployerPk) throw new Error('Missing ARES_DEPLOYER_KEY');
if (!subgraphUrl) throw new Error('Missing SUBGRAPH_QUERY_URL');

const addressesPath = path.resolve(root, 'deploy/contracts/addresses.base-sepolia.json');
const addressJson = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
const contracts = addressJson.contracts || {};

const registryAddress = contracts.AresRegistry;
const ledgerAddress = contracts.AresScorecardLedger;
const engineAddress = contracts.AresARIEngine;
const disputeAddress = contracts.AresDispute;
const tokenAddress = contracts.AresToken;

if (!registryAddress || !ledgerAddress || !engineAddress || !disputeAddress || !tokenAddress) {
  throw new Error('Missing contract addresses in addresses.base-sepolia.json');
}

const ADAPTER_ROLE = keccak256(toBytes('ADAPTER_ROLE'));

const registryAbi = [
  { type: 'function', name: 'resolveAgentId', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'isRegisteredAgent', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'registerAgent', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'string' }, { type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minStake', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'setMinStake', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'setAdapterRole', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [] },
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] }
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
  }
];

const engineAbi = [
  {
    type: 'function',
    name: 'getARIByAgentId',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }, { type: 'uint8' }, { type: 'uint32' }, { type: 'uint64' }, { type: 'uint64' }]
  },
  { type: 'function', name: 'getScore', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }
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

const tokenAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] }
];

const account = privateKeyToAccount(deployerPk);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

const TARGET = {
  agents: 40,
  actions: 500,
  disputes: 20,
  pendingDisputes: 2
};

const TARGET_COUNTS_PER_AGENT = [
  10, 10, 10, 95, 9, 50, 60, 55, 45, 30,
  20, 15, 12, 10, 8, 7, 6, 5, 5, 4,
  4, 3, 3, 2, 2, 2, 2, 2, 2, 2,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(msg) {
  console.log(`[enhance-demo] ${msg}`);
}

async function querySubgraph(query, variables = {}) {
  const headers = { 'content-type': 'application/json' };
  if (subgraphApiKey) headers.authorization = `Bearer ${subgraphApiKey}`;
  const res = await fetch(subgraphUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    throw new Error(`Subgraph HTTP ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`Subgraph errors: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

async function fetchAllSubgraph() {
  const agents = [];
  const actions = [];
  const disputes = [];

  let skip = 0;
  while (true) {
    const data = await querySubgraph(
      `query($s:Int!){agents(first:1000,skip:$s,orderBy:canonicalAgentId,orderDirection:asc){id canonicalAgentId operator ari tier validActionsCount registeredAt firstActionAt}}`,
      { s: skip }
    );
    const rows = data.agents || [];
    agents.push(...rows);
    if (rows.length < 1000) break;
    skip += 1000;
  }

  skip = 0;
  while (true) {
    const data = await querySubgraph(
      `query($s:Int!){actionScores(first:1000,skip:$s,orderBy:timestamp,orderDirection:desc){id actionId status timestamp agent{id}}}`,
      { s: skip }
    );
    const rows = data.actionScores || [];
    actions.push(...rows);
    if (rows.length < 1000) break;
    skip += 1000;
  }

  skip = 0;
  while (true) {
    const data = await querySubgraph(
      `query($s:Int!){disputes(first:1000,skip:$s,orderBy:id,orderDirection:asc){id actionId accepted finalizedAt agent{id} challenger}}`,
      { s: skip }
    );
    const rows = data.disputes || [];
    disputes.push(...rows);
    if (rows.length < 1000) break;
    skip += 1000;
  }

  return { agents, actions, disputes };
}

function deterministicAddress(seed) {
  const hash = keccak256(toBytes(seed));
  return `0x${hash.slice(-40)}`.toLowerCase();
}

function tierName(tier) {
  const x = Number(tier);
  if (x <= 0) return 'UNVERIFIED';
  if (x === 1) return 'PROVISIONAL';
  if (x === 2) return 'ESTABLISHED';
  if (x === 3) return 'TRUSTED';
  return 'ELITE';
}

let nextNonce = null;

async function refreshPendingNonce() {
  const pending = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: 'pending'
  });
  nextNonce = BigInt(pending);
  return nextNonce;
}

function looksLikeNonceConflict(error) {
  const raw = String(error?.shortMessage || error?.message || error || '').toLowerCase();
  return (
    raw.includes('nonce') ||
    raw.includes('already known') ||
    raw.includes('already imported') ||
    raw.includes('replacement transaction underpriced')
  );
}

async function writeAndWait(label, tx) {
  const maxRetries = 6;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (nextNonce == null) await refreshPendingNonce();
      const nonce = nextNonce;
      const hash = await walletClient.writeContract({ ...tx, nonce });
      nextNonce = nonce + 1n;
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`${label}: ${hash}`);
      return receipt;
    } catch (error) {
      if (!looksLikeNonceConflict(error) || attempt === maxRetries) {
        throw error;
      }
      const msg = String(error?.shortMessage || error?.message || error).split('\n')[0];
      await refreshPendingNonce();
      log(`${label}: nonce-retry ${attempt}/${maxRetries} (${msg})`);
      await sleep(350 * attempt);
    }
  }
}

function scoreProfile(agentIndex, actionOrdinal, targetCount) {
  // Agent A: hero, very high and stable
  if (agentIndex === 3) {
    const bump = actionOrdinal % 4;
    return [200 - bump, 198 - bump, 196 - bump, 193 - bump, 191 - bump].map((x) => Math.max(0, Math.min(200, x)));
  }
  // Agent B: initially decent, then disputes will slash validity
  if (agentIndex === 4) {
    const base = 152 + (actionOrdinal % 6);
    return [base, base - 4, base - 8, base - 10, base - 12].map((x) => Math.max(0, Math.min(200, x)));
  }
  // Agent C: upward trend (grower)
  if (agentIndex === 5) {
    const p = targetCount <= 1 ? 1 : actionOrdinal / (targetCount - 1);
    const top = Math.round(160 + p * 40);
    return [top, top - 2, top - 4, top - 6, top - 8].map((x) => Math.max(0, Math.min(200, x)));
  }

  let base;
  if (targetCount >= 60) base = 188;
  else if (targetCount >= 45) base = 174;
  else if (targetCount >= 30) base = 158;
  else if (targetCount >= 15) base = 142;
  else if (targetCount >= 8) base = 128;
  else base = 112;

  const wave = (actionOrdinal % 5) - 2;
  const b = base + wave;
  return [b, b - 3, b - 6, b - 9, b - 12].map((x) => Math.max(0, Math.min(200, x)));
}

function timestampFor(agentIndex, actionOrdinal, targetCount) {
  const now = Math.floor(Date.now() / 1000);
  let spanHours = 120;
  if (agentIndex === 3) spanHours = 72;
  else if (agentIndex === 4) spanHours = 48;
  else if (agentIndex === 5) spanHours = 240;
  else spanHours = 96 + (agentIndex % 6) * 12;

  const spacing = Math.max(1, Math.floor((spanHours * 3600) / Math.max(1, targetCount)));
  return BigInt(now - (targetCount - actionOrdinal) * spacing);
}

function ensureArrayMap(map, key) {
  if (!map.has(key)) map.set(key, []);
  return map.get(key);
}

function computeMinActionsForRequestedDistribution() {
  // lower bounds from tier windows due volume cap (ari <= 10 * validActions)
  return 3 * 85 + 12 * 60 + 12 * 30 + 8 * 10 + 5 * 0;
}

async function fetchApiJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function main() {
  log(`deployer: ${account.address}`);
  const ethBalance = await publicClient.getBalance({ address: account.address });
  log(`deployer ETH: ${formatEther(ethBalance)} ETH`);

  const pre = await fetchAllSubgraph();
  const preFinalized = pre.disputes.filter((d) => d.finalizedAt != null).length;
  const prePending = pre.disputes.length - preFinalized;
  log(`pre-snapshot => agents=${pre.agents.length}, actions=${pre.actions.length}, disputes=${pre.disputes.length} (finalized=${preFinalized}, pending=${prePending})`);

  const minNeeded = computeMinActionsForRequestedDistribution();
  if (TARGET.actions < minNeeded) {
    log(`WARNING: Requested tier distribution is mathematically incompatible with total actions=${TARGET.actions}. Minimum valid actions needed is ~${minNeeded}. Proceeding with 40/500/20 and strongest possible showcase.`);
  }

  // Build cohort of 40 operators (existing first, deterministic new after)
  const existingOperators = pre.agents
    .map((a) => String(a.operator || '').toLowerCase())
    .filter((x) => /^0x[a-f0-9]{40}$/.test(x));
  const unique = new Set(existingOperators);
  const cohort = [...existingOperators];
  let seed = 1;
  while (cohort.length < TARGET.agents) {
    const addr = deterministicAddress(`ares-video-agent-${seed}`);
    seed += 1;
    if (unique.has(addr)) continue;
    unique.add(addr);
    cohort.push(addr);
  }

  // Ensure registrations (temporary adapter role + minStake=0 if needed)
  const oldMinStake = await publicClient.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'minStake'
  });
  const hadAdapterRole = await publicClient.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'hasRole',
    args: [ADAPTER_ROLE, account.address]
  });

  if (!hadAdapterRole) {
    await writeAndWait('grant-adapter-role', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setAdapterRole',
      args: [account.address, true]
    });
  }
  if (oldMinStake > 0n) {
    await writeAndWait('set-min-stake-zero', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setMinStake',
      args: [0n]
    });
  }

  let addedAgents = 0;
  const agentByOperator = new Map();
  for (let i = 0; i < cohort.length; i++) {
    const op = cohort[i];
    let agentId = await publicClient.readContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: 'resolveAgentId',
      args: [op]
    });
    if (agentId === 0n) {
      const metadataURI = `ipfs://ares/video/agent-${String(i + 1).padStart(2, '0')}.json`;
      const metadataHash = keccak256(toBytes(`ares-video-agent-${i + 1}`));
      await writeAndWait(`register-agent-${i + 1}`, {
        address: registryAddress,
        abi: registryAbi,
        functionName: 'registerAgent',
        args: [op, metadataURI, metadataHash]
      });
      addedAgents += 1;
      agentId = await publicClient.readContract({
        address: registryAddress,
        abi: registryAbi,
        functionName: 'resolveAgentId',
        args: [op]
      });
    }
    agentByOperator.set(op, Number(agentId));
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
    await writeAndWait('revoke-adapter-role', {
      address: registryAddress,
      abi: registryAbi,
      functionName: 'setAdapterRole',
      args: [account.address, false]
    });
  }

  // Ensure scorer authorization
  const scorerAuthorized = await publicClient.readContract({
    address: ledgerAddress,
    abi: ledgerAbi,
    functionName: 'authorizedScorers',
    args: [account.address]
  });
  if (!scorerAuthorized) {
    await writeAndWait('authorize-scorer', {
      address: ledgerAddress,
      abi: ledgerAbi,
      functionName: 'setAuthorizedScorer',
      args: [account.address, true]
    });
  }

  // Baseline actions by agent from subgraph
  const preByAgentId = new Map();
  for (const action of pre.actions) {
    const agentId = Number(action?.agent?.id || 0);
    if (!agentId) continue;
    const list = ensureArrayMap(preByAgentId, agentId);
    list.push({
      actionId: String(action.actionId),
      status: String(action.status || 'VALID'),
      timestamp: Number(action.timestamp || 0)
    });
  }
  for (const list of preByAgentId.values()) {
    list.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Assign per-agent targets and compute additions
  const entries = cohort.map((operator, i) => {
    const agentId = agentByOperator.get(operator);
    const currentActions = (preByAgentId.get(agentId) || []).length;
    return {
      idx: i,
      operator,
      agentId,
      targetActions: TARGET_COUNTS_PER_AGENT[i] ?? 1,
      currentActions,
      toAdd: 0,
      created: []
    };
  });

  for (const e of entries) {
    e.targetActions = Math.max(e.targetActions, e.currentActions);
    e.toAdd = e.targetActions - e.currentActions;
  }

  const currentGlobalActions = pre.actions.length;
  const desiredAdditional = Math.max(0, TARGET.actions - currentGlobalActions);
  let plannedAdditional = entries.reduce((acc, e) => acc + e.toAdd, 0);

  if (plannedAdditional !== desiredAdditional) {
    const delta = desiredAdditional - plannedAdditional;
    if (delta > 0) {
      // Distribute extra actions into Agent A then trusted/high buckets
      const preferredIdx = [3, 6, 7, 8, 5, 9, 10];
      let remain = delta;
      let p = 0;
      while (remain > 0) {
        const idx = preferredIdx[p % preferredIdx.length];
        const row = entries[idx];
        row.targetActions += 1;
        row.toAdd += 1;
        remain -= 1;
        p += 1;
      }
    } else {
      // Trim from tail low-priority agents but never below current actions
      let remain = -delta;
      for (let i = entries.length - 1; i >= 0 && remain > 0; i--) {
        const row = entries[i];
        const reducible = Math.max(0, row.toAdd);
        if (!reducible) continue;
        const cut = Math.min(reducible, remain);
        row.targetActions -= cut;
        row.toAdd -= cut;
        remain -= cut;
      }
    }
    plannedAdditional = entries.reduce((acc, e) => acc + e.toAdd, 0);
  }

  log(`actions plan => current=${currentGlobalActions}, target=${TARGET.actions}, toAdd=${plannedAdditional}`);

  // Record actions
  let addedActions = 0;
  for (const row of entries) {
    if (row.toAdd <= 0) continue;

    for (let j = 0; j < row.toAdd; j++) {
      const actionOrdinal = row.currentActions + j;
      const ts = timestampFor(row.idx, actionOrdinal, row.targetActions);
      const scores = scoreProfile(row.idx, actionOrdinal, row.targetActions).map((x) => Number(x));
      const actionLabel = `video-v2-${row.agentId}-${actionOrdinal + 1}`;
      const actionId = keccak256(toBytes(actionLabel));

      const scoresHash = keccak256(
        encodeAbiParameters(
          [{ type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }],
          scores
        )
      );

      const signature = await walletClient.signTypedData({
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
          agent: row.operator,
          actionId,
          scoresHash,
          timestamp: ts
        }
      });

      await writeAndWait(`score-agent-${row.agentId}-#${actionOrdinal + 1}`, {
        address: ledgerAddress,
        abi: ledgerAbi,
        functionName: 'recordActionScore',
        args: [row.operator, actionId, scores, ts, signature]
      });

      row.created.push({ actionId, timestamp: Number(ts), status: 'VALID' });
      const list = ensureArrayMap(preByAgentId, row.agentId);
      list.unshift({ actionId, timestamp: Number(ts), status: 'VALID' });
      addedActions += 1;
    }
  }

  // Prepare dispute operations
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

  if (Number(oldVotingPeriod) > 12) {
    await writeAndWait('set-voting-period-10s', {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'setDisputeParams',
      args: [minChallengerStake, minValidatorStake, 10, quorum, slashingBps, treasury]
    });
  }

  const preDisputesCount = pre.disputes.length;
  const prePendingCount = pre.disputes.filter((d) => d.finalizedAt == null).length;
  const needToAddDisputes = Math.max(0, TARGET.disputes - preDisputesCount);
  let pendingToAdd = Math.max(0, TARGET.pendingDisputes - prePendingCount);
  if (pendingToAdd > needToAddDisputes) pendingToAdd = needToAddDisputes;
  const finalizedToAdd = needToAddDisputes - pendingToAdd;

  // Ensure stake balances for dispute operations
  const tokenBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [account.address]
  });
  const requiredStake = (minChallengerStake + minValidatorStake) * BigInt(Math.max(needToAddDisputes + 5, 10));
  if (tokenBalance < requiredStake) {
    await writeAndWait('mint-token-for-disputes', {
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'mint',
      args: [account.address, requiredStake - tokenBalance + parseEther('500')]
    });
  }
  await writeAndWait('approve-token-to-dispute', {
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'approve',
    args: [disputeAddress, parseEther('100000000')]
  });

  const usedAction = new Set();

  function pickAction(agentId, requireValid = true) {
    const list = preByAgentId.get(agentId) || [];
    for (const row of list) {
      const key = `${agentId}:${String(row.actionId).toLowerCase()}`;
      if (usedAction.has(key)) continue;
      if (requireValid && String(row.status || 'VALID') !== 'VALID') continue;
      usedAction.add(key);
      return String(row.actionId);
    }
    return null;
  }

  const idxA = 3;
  const idxB = 4;
  const idxC = 5;
  const idxProvisionalCase = 11;

  const agentA = entries[idxA];
  const agentB = entries[idxB];
  const agentC = entries[idxC];

  const bBefore = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getARIByAgentId',
    args: [BigInt(agentB.agentId)]
  });

  const disputeOps = [];

  // Mandatory: 2 finalized challenger-won for Agent B
  for (let i = 0; i < Math.min(2, finalizedToAdd); i++) {
    const actionId = pickAction(agentB.agentId, true);
    if (actionId) {
      disputeOps.push({ agentId: agentB.agentId, actionId, accept: true, reason: `ipfs://ares/video/disputes/b-win-${i + 1}.json` });
    }
  }

  // Mandatory: 1 finalized challenger-lost on provisional-like agent
  if (disputeOps.length < finalizedToAdd) {
    const prov = entries[idxProvisionalCase] || entries[10];
    const actionId = pickAction(prov.agentId, true);
    if (actionId) {
      disputeOps.push({ agentId: prov.agentId, actionId, accept: false, reason: 'ipfs://ares/video/disputes/provisional-lost.json' });
    }
  }

  // Fill remaining finalized disputes with mix (accepted/rejected)
  let mixToggle = true;
  let cursor = 0;
  while (disputeOps.length < finalizedToAdd) {
    const row = entries[(6 + cursor) % entries.length];
    cursor += 1;
    if (!row) break;
    const actionId = pickAction(row.agentId, true);
    if (!actionId) continue;
    disputeOps.push({
      agentId: row.agentId,
      actionId,
      accept: mixToggle,
      reason: mixToggle ? 'ipfs://ares/video/disputes/quality-failed.json' : 'ipfs://ares/video/disputes/challenge-rejected.json'
    });
    mixToggle = !mixToggle;
  }

  // Pending disputes (open only)
  const pendingOps = [];
  cursor = 0;
  while (pendingOps.length < pendingToAdd) {
    const row = entries[(20 + cursor) % entries.length];
    cursor += 1;
    if (!row) break;
    const actionId = pickAction(row.agentId, true);
    if (!actionId) continue;
    pendingOps.push({
      agentId: row.agentId,
      actionId,
      reason: `ipfs://ares/video/disputes/pending-${pendingOps.length + 1}.json`
    });
  }

  const finalizedDisputeIds = [];
  let addedDisputes = 0;

  // Open + vote finalized disputes
  for (let i = 0; i < disputeOps.length; i++) {
    const op = disputeOps[i];
    const nextDisputeId = await publicClient.readContract({
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'nextDisputeId'
    });

    await writeAndWait(`open-dispute-${i + 1}`, {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'disputeAction',
      args: [BigInt(op.agentId), op.actionId, minChallengerStake, op.reason]
    });
    await writeAndWait(`validator-join-${i + 1}`, {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'validatorJoin',
      args: [nextDisputeId, minValidatorStake]
    });
    await writeAndWait(`vote-${i + 1}`, {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'vote',
      args: [nextDisputeId, op.accept]
    });

    finalizedDisputeIds.push({ id: nextDisputeId, accept: op.accept, agentId: op.agentId, actionId: op.actionId });
    addedDisputes += 1;
  }

  // Open pending disputes only
  for (let i = 0; i < pendingOps.length; i++) {
    const op = pendingOps[i];
    await writeAndWait(`open-pending-dispute-${i + 1}`, {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'disputeAction',
      args: [BigInt(op.agentId), op.actionId, minChallengerStake, op.reason]
    });
    addedDisputes += 1;
  }

  if (finalizedDisputeIds.length > 0) {
    const waitMs = Math.max(12_000, (Number(oldVotingPeriod) > 12 ? 12_000 : (Number(oldVotingPeriod) + 2) * 1000));
    log(`waiting ${Math.round(waitMs / 1000)}s for dispute deadlines...`);
    await sleep(waitMs);

    for (let i = 0; i < finalizedDisputeIds.length; i++) {
      await writeAndWait(`finalize-dispute-${i + 1}`, {
        address: disputeAddress,
        abi: disputeAbi,
        functionName: 'finalize',
        args: [finalizedDisputeIds[i].id]
      });

      // local mirror for status tracking
      if (finalizedDisputeIds[i].accept) {
        const rows = preByAgentId.get(finalizedDisputeIds[i].agentId) || [];
        const key = String(finalizedDisputeIds[i].actionId).toLowerCase();
        const hit = rows.find((r) => String(r.actionId).toLowerCase() === key);
        if (hit) hit.status = 'INVALID';
      }
    }
  }

  if (Number(oldVotingPeriod) > 12) {
    await writeAndWait('restore-voting-period', {
      address: disputeAddress,
      abi: disputeAbi,
      functionName: 'setDisputeParams',
      args: [minChallengerStake, minValidatorStake, oldVotingPeriod, quorum, slashingBps, treasury]
    });
  }

  const aScore = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getScore',
    args: [agentA.operator]
  });
  const bScore = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getScore',
    args: [agentB.operator]
  });
  const cScore = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getScore',
    args: [agentC.operator]
  });

  const bAfter = await publicClient.readContract({
    address: engineAddress,
    abi: engineAbi,
    functionName: 'getARIByAgentId',
    args: [BigInt(agentB.agentId)]
  });

  // Allow indexer some time and fetch post snapshot
  log('waiting 45s for subgraph indexing...');
  await sleep(45_000);
  let post = await fetchAllSubgraph();
  for (let i = 0; i < 6; i++) {
    if (post.actions.length >= TARGET.actions && post.disputes.length >= TARGET.disputes && post.agents.length >= TARGET.agents) break;
    await sleep(20_000);
    post = await fetchAllSubgraph();
  }

  const postFinalized = post.disputes.filter((d) => d.finalizedAt != null).length;
  const postPending = post.disputes.length - postFinalized;

  const postTier = { UNVERIFIED: 0, PROVISIONAL: 0, ESTABLISHED: 0, TRUSTED: 0, ELITE: 0 };
  for (const ag of post.agents) {
    const t = String(ag.tier || 'UNVERIFIED').toUpperCase();
    postTier[t] = (postTier[t] || 0) + 1;
  }

  // API verification
  const apiScoreA = await fetchApiJson(`${apiBase}/v1/score/${agentA.operator}`);
  const apiScoreB = await fetchApiJson(`${apiBase}/v1/score/${agentB.operator}`);
  const apiScoreC = await fetchApiJson(`${apiBase}/v1/score/${agentC.operator}`);
  const apiAgents = await fetchApiJson(`${apiBase}/v1/agents`);
  const apiLeaderboard = await fetchApiJson(`${apiBase}/v1/leaderboard?limit=100`);

  const sheet = {
    generatedAt: new Date().toISOString(),
    network: 'Base Sepolia',
    contracts: {
      AresRegistry: registryAddress,
      AresScorecardLedger: ledgerAddress,
      AresARIEngine: engineAddress,
      AresDispute: disputeAddress,
      AresApiAccess: contracts.AresApiAccess
    },
    showcaseAgents: {
      agentA: {
        label: 'The Star',
        address: agentA.operator,
        agentId: agentA.agentId,
        ariOnChain: Number(aScore)
      },
      agentB: {
        label: 'The Fallen',
        address: agentB.operator,
        agentId: agentB.agentId,
        ariOnChain: Number(bScore),
        ariBeforeDisputes: Number(bBefore[0]),
        ariAfterDisputes: Number(bAfter[0])
      },
      agentC: {
        label: 'The Grower',
        address: agentC.operator,
        agentId: agentC.agentId,
        ariOnChain: Number(cScore)
      }
    },
    totals: {
      pre: {
        agents: pre.agents.length,
        actions: pre.actions.length,
        disputes: pre.disputes.length,
        finalizedDisputes: preFinalized,
        pendingDisputes: prePending
      },
      post: {
        agents: post.agents.length,
        actions: post.actions.length,
        disputes: post.disputes.length,
        finalizedDisputes: postFinalized,
        pendingDisputes: postPending,
        tiers: postTier
      },
      addedByScript: {
        agents: addedAgents,
        actions: addedActions,
        disputes: addedDisputes
      }
    },
    apiChecks: {
      scoreA: { status: apiScoreA.status, body: apiScoreA.body },
      scoreB: { status: apiScoreB.status, body: apiScoreB.body },
      scoreC: { status: apiScoreC.status, body: apiScoreC.body },
      agentsEndpoint: { status: apiAgents.status, body: apiAgents.body },
      leaderboardFallback: { status: apiLeaderboard.status, body: apiLeaderboard.body }
    },
    notes: [
      'Requested tier-distribution and 500 total actions are mathematically incompatible under current ARI volume-confidence cap.',
      'This run prioritizes strict 40 agents / 500 actions / 20 disputes with real on-chain finalization and showcase A/B/C behavior.'
    ]
  };

  const outDir = path.resolve(root, 'docs/demo');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, 'video-demo-cheat-sheet.json');
  fs.writeFileSync(outPath, JSON.stringify(sheet, null, 2) + '\n');

  console.log('');
  console.log('================ VIDEO DEMO CHEAT SHEET ================');
  console.log(`Agent A (The Star): ${agentA.operator} | ARI=${Number(aScore)}`);
  console.log(`Agent B (The Fallen): ${agentB.operator} | ARI=${Number(bScore)} | before=${Number(bBefore[0])} -> after=${Number(bAfter[0])}`);
  console.log(`Agent C (The Grower): ${agentC.operator} | ARI=${Number(cScore)}`);
  console.log(`Total agents: ${post.agents.length}`);
  console.log(`Total actions: ${post.actions.length}`);
  console.log(`Total disputes: ${post.disputes.length} (pending=${postPending}, finalized=${postFinalized})`);
  console.log(`API verify endpoint: ${apiBase}/v1/agents`);
  console.log(`Fallback endpoint: ${apiBase}/v1/leaderboard?limit=100`);
  console.log(`Output JSON: ${outPath}`);
  console.log('========================================================');
}

main().catch((error) => {
  console.error('[enhance-demo] failed:', error);
  process.exit(1);
});
