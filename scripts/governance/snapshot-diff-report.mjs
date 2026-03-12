#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  PROPOSALS,
  ROOT,
  createClients,
  formatState,
  loadProposalRuntime,
  validateProposalPayloadMatchesExpected
} from './_common.mjs';

const MONITORING_DIR = path.resolve(ROOT, 'reports/governance/execution-prep/monitoring');
const SNAPSHOT_DIR = path.resolve(MONITORING_DIR, 'snapshots');
const LATEST_JSON = path.resolve(MONITORING_DIR, 'latest-preflight.json');

function tsFileName(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}

function toIso(seconds) {
  return new Date(Number(seconds) * 1000).toISOString();
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pickComparable(row) {
  return {
    key: row.key,
    stateCode: row.stateCode,
    queueWindowOpen: row.queueWindowOpen,
    executeWindowOpen: row.executeWindowOpen,
    snapshotBlock: String(row.snapshotBlock),
    deadlineBlock: String(row.deadlineBlock),
    queueEarliestBlock: String(row.queueEarliestBlock),
    queuedEtaUtc: row.queuedEtaUtc,
    expectedExecuteUtc: row.expectedExecuteUtc,
    descriptionHash: row.descriptionHash,
    proposeTxHash: row.proposeTxHash
  };
}

function buildDiffSummary(prevRows, currRows) {
  const prevMap = new Map((prevRows || []).map((r) => [r.key, pickComparable(r)]));
  const currMap = new Map((currRows || []).map((r) => [r.key, pickComparable(r)]));

  const diffs = [];
  for (const [key, curr] of currMap.entries()) {
    const prev = prevMap.get(key);
    if (!prev) {
      diffs.push({ key, field: 'row', before: 'missing', after: 'added' });
      continue;
    }

    for (const field of Object.keys(curr)) {
      if (field === 'key') continue;
      if (prev[field] !== curr[field]) {
        diffs.push({ key, field, before: String(prev[field]), after: String(curr[field]) });
      }
    }
  }

  return diffs;
}

async function captureCurrentSnapshot() {
  const { publicClient } = createClients({ withWallet: false });
  const rows = [];

  for (const key of ['b01b02', 'b03']) {
    const runtime = await loadProposalRuntime(publicClient, PROPOSALS[key]);
    await validateProposalPayloadMatchesExpected(runtime);
    rows.push({
      key,
      label: runtime.proposal.label,
      proposalId: runtime.proposal.proposalId.toString(),
      stateCode: runtime.stateCode,
      stateName: formatState(runtime.stateCode),
      queueWindowOpen: runtime.queueWindowOpen,
      executeWindowOpen: runtime.executeWindowOpen,
      currentBlock: runtime.currentBlock.toString(),
      currentTimeUtc: toIso(runtime.currentTs),
      snapshotBlock: runtime.snapshotBlock.toString(),
      deadlineBlock: runtime.deadlineBlock.toString(),
      queueEarliestBlock: runtime.queueEarliestBlock.toString(),
      queueEarliestEstimateUtc: toIso(runtime.queueEarliestTs),
      queuedEtaUtc: runtime.etaSeconds > 0n ? toIso(runtime.etaSeconds) : null,
      expectedExecuteUtc: toIso(runtime.expectedExecuteTs),
      referenceQueueTrt: runtime.proposal.queueEarliestTrt,
      referenceExecuteTrt: runtime.proposal.executeEarliestTrt,
      descriptionHash: runtime.descriptionHash,
      description: runtime.created.description,
      proposeTxHash: runtime.created.txHash,
      preflightQueueReady: runtime.stateCode === 4,
      preflightExecuteReady: runtime.stateCode === 5 && runtime.executeWindowOpen
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    network: { name: 'base-sepolia', chainId: 84532 },
    proposals: rows
  };
}

function runPreflightCapture() {
  const scriptPath = path.resolve(ROOT, 'scripts/governance/preflight-check.mjs');
  const result = spawnSync(process.execPath, [scriptPath, '--proposal=all'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  return {
    command: `${process.execPath} scripts/governance/preflight-check.mjs --proposal=all`,
    exitCode: result.status === null ? 1 : result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

async function main() {
  fs.mkdirSync(MONITORING_DIR, { recursive: true });
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const now = new Date();
  const stamp = tsFileName(now);

  const preflight = runPreflightCapture();
  const current = await captureCurrentSnapshot();
  const previous = readJsonIfExists(LATEST_JSON);

  const snapshotPath = path.resolve(SNAPSHOT_DIR, `${stamp}.json`);
  const logPath = path.resolve(SNAPSHOT_DIR, `${stamp}.preflight.log`);

  const payload = {
    ...current,
    preflightCapture: {
      command: preflight.command,
      exitCode: preflight.exitCode,
      capturedAt: now.toISOString(),
      logFile: logPath
    }
  };

  fs.writeFileSync(logPath, `${preflight.stdout}${preflight.stderr ? `\n[stderr]\n${preflight.stderr}` : ''}`);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(LATEST_JSON, `${JSON.stringify(payload, null, 2)}\n`);

  if (!previous) {
    console.log('State changed: initial baseline snapshot created.');
    console.log(`Snapshot saved: ${snapshotPath}`);
    console.log(`Preflight log saved: ${logPath}`);
    process.exit(0);
  }

  const diffs = buildDiffSummary(previous.proposals || [], payload.proposals || []);
  if (diffs.length === 0) {
    console.log('No state change');
    console.log(`Snapshot saved: ${snapshotPath}`);
    console.log(`Preflight log saved: ${logPath}`);
    process.exit(0);
  }

  console.log(`State changed (${diffs.length} field change(s)):`);
  for (const diff of diffs) {
    console.log(`- ${diff.key}.${diff.field}: ${diff.before} -> ${diff.after}`);
  }
  console.log(`Snapshot saved: ${snapshotPath}`);
  console.log(`Preflight log saved: ${logPath}`);
}

main().catch((error) => {
  console.error(`snapshot-diff-report failed: ${error?.message || String(error)}`);
  process.exit(1);
});
