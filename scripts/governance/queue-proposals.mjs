#!/usr/bin/env node
import {
  GOVERNOR_ADDRESS,
  PROPOSALS,
  createClients,
  governorWriteAbi,
  loadProposalRuntime,
  printProposalDetails,
  selectProposalKeys,
  validateProposalPayloadMatchesExpected
} from './_common.mjs';

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

async function main() {
  const selectedKeys = selectProposalKeys(process.argv.slice(2));
  const broadcast = hasFlag('--broadcast');
  const { publicClient, walletClient, account } = createClients({ withWallet: broadcast });

  console.log('ARES Governance Queue Script (Base Sepolia)');
  console.log(`Mode: ${broadcast ? 'BROADCAST' : 'DRY-RUN (no transactions)'}`);
  console.log(`Selected proposals: ${selectedKeys.join(', ')}`);
  if (broadcast) console.log(`Signer: ${account.address}`);

  for (const key of selectedKeys) {
    const proposalDef = PROPOSALS[key];
    const runtime = await loadProposalRuntime(publicClient, proposalDef);
    await validateProposalPayloadMatchesExpected(runtime);
    printProposalDetails(runtime);

    if (runtime.stateCode !== 4) {
      console.error(
        `[${proposalDef.label}] Queue preflight failed: expected state Succeeded (4), got ${runtime.stateCode}. Aborting.`
      );
      process.exit(1);
    }

    if (!broadcast) {
      console.log(`[${proposalDef.label}] DRY-RUN: preflight passed; queue call not sent.`);
      continue;
    }

    const txHash = await walletClient.writeContract({
      address: GOVERNOR_ADDRESS,
      abi: governorWriteAbi,
      functionName: 'queue',
      args: [
        runtime.created.targets,
        runtime.created.values,
        runtime.created.calldatas,
        runtime.descriptionHash
      ]
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
      throw new Error(`[${proposalDef.label}] Queue transaction reverted: ${txHash}`);
    }
    console.log(`[${proposalDef.label}] queued tx=${txHash} block=${receipt.blockNumber.toString()}`);
  }
}

main().catch((error) => {
  console.error(`queue-proposals failed: ${error?.message || String(error)}`);
  process.exit(1);
});
