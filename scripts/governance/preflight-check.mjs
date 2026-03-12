#!/usr/bin/env node
import {
  PROPOSALS,
  createClients,
  loadProposalRuntime,
  printProposalDetails,
  selectProposalKeys,
  validateProposalPayloadMatchesExpected
} from './_common.mjs';

async function main() {
  const selectedKeys = selectProposalKeys(process.argv.slice(2));
  const { publicClient } = createClients({ withWallet: false });

  console.log('ARES Governance Preflight Check (Base Sepolia)');
  console.log(`Selected proposals: ${selectedKeys.join(', ')}`);

  let hasError = false;
  for (const key of selectedKeys) {
    const proposalDef = PROPOSALS[key];
    const runtime = await loadProposalRuntime(publicClient, proposalDef);
    await validateProposalPayloadMatchesExpected(runtime);
    printProposalDetails(runtime);

    const queueReady = runtime.stateCode === 4;
    const executeReady = runtime.stateCode === 5 && runtime.executeWindowOpen;

    console.log(`queueWindowOpen: ${queueReady ? 'YES' : 'NO'}`);
    console.log(`executeWindowOpen: ${executeReady ? 'YES' : 'NO'}`);
    if (!queueReady && runtime.stateCode !== 5 && runtime.stateCode !== 7) {
      hasError = true;
    }
  }

  if (hasError) {
    console.log('\nResult: Not ready for queue/execute yet. Keep monitoring proposal states.');
    process.exitCode = 1;
    return;
  }

  console.log('\nResult: Preflight checks indicate queue/execute windows are open for selected proposals.');
}

main().catch((error) => {
  console.error(`preflight-check failed: ${error?.message || String(error)}`);
  process.exit(1);
});
