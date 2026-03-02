import fs from 'node:fs';
import path from 'node:path';

const [bundlePathArg, inputPathArg] = process.argv.slice(2);
if (!bundlePathArg || !inputPathArg) {
  console.error('Usage: node scripts/certification/fill-token-finality-pack.mjs <bundle-dir> <input-json>');
  process.exit(1);
}

const bundlePath = path.resolve(bundlePathArg);
const inputPath = path.resolve(inputPathArg);
const launchParamsPath = path.join(bundlePath, '01-token-launch-parameters.json');
const authorityRegistryPath = path.join(bundlePath, '02-authority-registry.json');
const reportMdPath = path.join(bundlePath, '03-token-finality-report.md');
const reportJsonPath = path.join(bundlePath, '03-token-finality-report.json');
const signoffPath = path.join(bundlePath, '04-launch-signoff.md');

for (const p of [launchParamsPath, authorityRegistryPath, reportMdPath, reportJsonPath, signoffPath, inputPath]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing required path: ${p}`);
    process.exit(1);
  }
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const launchParams = JSON.parse(fs.readFileSync(launchParamsPath, 'utf8'));
const authorityRegistry = JSON.parse(fs.readFileSync(authorityRegistryPath, 'utf8'));
const reportJson = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));

launchParams.network = input.network ?? 'base-mainnet';
launchParams.tokenName = input.tokenName ?? 'ARES Protocol';
launchParams.tokenSymbol = input.tokenSymbol ?? 'ARES';
launchParams.tokenAddress = input.tokenAddress;
launchParams.distributionVaultAddress = input.distributionVaultAddress;
launchParams.treasuryAddress = input.treasuryAddress;
launchParams.liquidityAddress = input.liquidityAddress;
launchParams.communityAddress = input.communityAddress;
launchParams.vestingOrDistributorAddresses = input.vestingOrDistributorAddresses ?? [];
launchParams.totalSupply = String(input.totalSupply ?? '1000000000');
launchParams.mintedToVault = String(input.mintedToVault ?? launchParams.totalSupply);
launchParams.mintTxHash = input.mintTxHash;
launchParams.minterRoleRevokeTxHash = input.minterRoleRevokeTxHash;
launchParams.defaultAdminRenounceTxHash = input.defaultAdminRenounceTxHash;
launchParams.roleGraphSnapshotRef = input.roleGraphSnapshotRef;
launchParams.approverSignatures = input.approverSignatures ?? [];

authorityRegistry.version = Number(input.registryVersion ?? authorityRegistry.version ?? 1);
authorityRegistry.authorityModelVersion = input.authorityModelVersion ?? authorityRegistry.authorityModelVersion;
authorityRegistry.safe.address = input.safeAddress;
authorityRegistry.safe.threshold = Number(input.safeThreshold ?? 3);
authorityRegistry.safe.owners = (input.safeOwners ?? []).map((owner) => ({ seat: owner.seat, address: owner.address }));
authorityRegistry.governance.governor = input.governorAddress;
authorityRegistry.governance.timelock = input.timelockAddress;
authorityRegistry.governance.openExecutor = input.openExecutor ?? true;
authorityRegistry.governance.timelockMinDelaySeconds = Number(input.timelockMinDelaySeconds ?? 172800);
authorityRegistry.launchCriticalEoaPrivileges = input.launchCriticalEoaPrivileges ?? [];

reportJson.version = Number(input.reportVersion ?? reportJson.version ?? 1);
reportJson.network = launchParams.network;
reportJson.tokenAddress = input.tokenAddress;
reportJson.distributionVaultAddress = input.distributionVaultAddress;
reportJson.totalSupply = String(input.totalSupply ?? '1000000000');
reportJson.mintTxHash = input.mintTxHash;
reportJson.minterRoleRevokeTxHash = input.minterRoleRevokeTxHash;
reportJson.defaultAdminRenounceTxHash = input.defaultAdminRenounceTxHash;
reportJson.postCeremonyRoleGraph = {
  governor: input.governorAddress,
  timelock: input.timelockAddress,
  distributionVault: input.distributionVaultAddress,
  remainingPrivilegedEoas: input.remainingPrivilegedEoas ?? [],
};
reportJson.approverSignatures = input.approverSignatures ?? [];

const reportMd = [
  '# Token Finality Report Template',
  '',
  '## Launch summary',
  `- Network: ${launchParams.network}`,
  `- Token address: ${input.tokenAddress}`,
  `- Distribution vault address: ${input.distributionVaultAddress}`,
  `- Total supply: ${launchParams.totalSupply}`,
  '- Mint topology: single-vault',
  '',
  '## Ceremony sequence',
  '1. Token deployed.',
  '2. Distribution vault deployed.',
  '3. Full supply minted to distribution vault.',
  '4. `MINTER_ROLE` revoked.',
  '5. `DEFAULT_ADMIN_ROLE` renounced.',
  '6. Post-ceremony role graph verified.',
  '7. Launch approvers signed off.',
  '',
  '## Required transaction hashes',
  `- Token deployment tx: ${input.tokenDeploymentTxHash ?? '<TOKEN_DEPLOYMENT_TX_HASH>'}`,
  `- Distribution vault deployment tx: ${input.distributionVaultDeploymentTxHash ?? '<DISTRIBUTION_VAULT_DEPLOYMENT_TX_HASH>'}`,
  `- Mint tx: ${input.mintTxHash}`,
  `- \`MINTER_ROLE\` revoke tx: ${input.minterRoleRevokeTxHash}`,
  `- \`DEFAULT_ADMIN_ROLE\` renounce tx: ${input.defaultAdminRenounceTxHash}`,
  '',
  '## Post-ceremony authority graph',
  `- Governor: ${input.governorAddress}`,
  `- Timelock: ${input.timelockAddress}`,
  `- Treasury: ${input.treasuryAddress}`,
  `- Distribution vault: ${input.distributionVaultAddress}`,
  `- Remaining privileged EOAs: ${(input.remainingPrivilegedEoas ?? []).join(', ') || 'none'}`,
  '',
  '## Verification checklist',
  '- [ ] Full supply minted exactly once',
  '- [ ] Mint target was single distribution vault',
  '- [ ] `MINTER_ROLE` revoked',
  '- [ ] `DEFAULT_ADMIN_ROLE` renounced',
  '- [ ] Final role graph captured',
  '- [ ] Explorer verification complete',
  '- [ ] Launch signoff attached',
].join('\n');

const signoffMd = [
  '# Launch Signoff',
  '',
  '## Release scope',
  `- Network: ${launchParams.network}`,
  `- Token: ${input.tokenAddress}`,
  `- Governor: ${input.governorAddress}`,
  `- Timelock: ${input.timelockAddress}`,
  `- Distribution vault: ${input.distributionVaultAddress}`,
  '',
  '## Signoff statements',
  '- Smart contract deployment matches reviewed artifact set.',
  '- Governance authority matches intended mainnet role graph.',
  '- Token finality ceremony completed and evidenced.',
  '- No unresolved critical blockers remain.',
  '- Residual assumptions are accepted by launch signers.',
  '',
  '## Approver signatures',
  ...(input.approverSignatures ?? []).map((sig, idx) => `- ${idx + 1}. ${sig.role} / ${sig.signer} / ${sig.signatureRef}`),
  '',
  '## Required approvals',
  '- Founder / Product:',
  '- Founder / Engineering:',
  '- Protocol / Security Lead:',
  '- Independent Technical Signer:',
  '- Independent Business / Ops Signer:',
  '',
  '## Attached evidence',
  '- Token finality report',
  '- Authority registry',
  '- Verification links',
  '- Audit closeout summary',
].join('\n');

fs.writeFileSync(launchParamsPath, `${JSON.stringify(launchParams, null, 2)}\n`);
fs.writeFileSync(authorityRegistryPath, `${JSON.stringify(authorityRegistry, null, 2)}\n`);
fs.writeFileSync(reportJsonPath, `${JSON.stringify(reportJson, null, 2)}\n`);
fs.writeFileSync(reportMdPath, `${reportMd}\n`);
fs.writeFileSync(signoffPath, `${signoffMd}\n`);

console.log(bundlePath);
