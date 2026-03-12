#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  PROPOSALS,
  ROOT,
  createClients,
  formatState,
  loadProposalRuntime,
  selectProposalKeys,
  validateProposalPayloadMatchesExpected
} from './_common.mjs';

function argValue(name, fallback = '') {
  const arg = process.argv.find((part) => part.startsWith(`${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 1);
}

function toIso(seconds) {
  return new Date(Number(seconds) * 1000).toISOString();
}

async function main() {
  const selectedKeys = selectProposalKeys(process.argv.slice(2));
  const cadenceHours = Number(argValue('--cadence-hours', '6'));
  const outDir = path.resolve(
    ROOT,
    argValue('--out-dir', 'reports/governance/execution-prep/monitoring')
  );
  fs.mkdirSync(outDir, { recursive: true });

  const { publicClient } = createClients({ withWallet: false });
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');

  const proposalRows = [];
  for (const key of selectedKeys) {
    const runtime = await loadProposalRuntime(publicClient, PROPOSALS[key]);
    await validateProposalPayloadMatchesExpected(runtime);
    proposalRows.push({
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
      proposeTxHash: runtime.created.txHash
    });
  }

  const payload = {
    generatedAt: now.toISOString(),
    cadenceHours,
    network: {
      name: 'base-sepolia',
      chainId: 84532
    },
    proposals: proposalRows
  };

  const jsonPath = path.join(outDir, `preflight-${timestamp}.json`);
  const latestJsonPath = path.join(outDir, 'latest-preflight.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  const md = [
    '# Governance Preflight Monitoring Snapshot',
    '',
    `- Generated: ${payload.generatedAt}`,
    `- Cadence target: every ${cadenceHours} hours`,
    '- Network: Base Sepolia (84532)',
    '',
    '## Proposal status',
    '',
    '| Proposal | ID | State | Queue Open | Execute Open | Queue Earliest (UTC) | Execute Earliest (UTC) |',
    '|---|---:|---|---|---|---|---|',
    ...proposalRows.map(
      (row) =>
        `| ${row.label} | \`${row.proposalId}\` | ${row.stateName} | ${row.queueWindowOpen ? 'YES' : 'NO'} | ${row.executeWindowOpen ? 'YES' : 'NO'} | ${row.queueEarliestEstimateUtc} | ${row.expectedExecuteUtc} |`
    ),
    '',
    '## References',
    '',
    ...proposalRows.flatMap((row) => [
      `### ${row.label}`,
      `- Proposal tx: \`${row.proposeTxHash}\``,
      `- Description hash: \`${row.descriptionHash}\``,
      `- Queue reference (TRT): ${row.referenceQueueTrt}`,
      `- Execute reference (TRT): ${row.referenceExecuteTrt}`,
      ''
    ]),
    '## Next check',
    '',
    `- Run again in ~${cadenceHours}h or sooner if state changes.`,
    ''
  ].join('\n');

  const mdPath = path.join(outDir, `preflight-${timestamp}.md`);
  const latestMdPath = path.join(outDir, 'latest-preflight.md');
  fs.writeFileSync(mdPath, `${md}\n`);
  fs.writeFileSync(latestMdPath, `${md}\n`);

  console.log(`json=${jsonPath}`);
  console.log(`md=${mdPath}`);
}

main().catch((error) => {
  console.error(`monitor-preflight failed: ${error?.message || String(error)}`);
  process.exit(1);
});
