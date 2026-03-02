import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/certification/validate-token-finality-pack.mjs <bundle-path> [--draft]');
  process.exit(1);
}

const bundlePath = path.resolve(args[0]);
const draftMode = args.includes('--draft');

const requiredFiles = [
  '01-token-launch-parameters.json',
  '02-authority-registry.json',
  '03-token-finality-report.md',
  '03-token-finality-report.json',
  '04-launch-signoff.md',
  'manifest.json',
  'README.md',
];

const placeholderPattern = /<[^>]+>/;
const requiredMarkdownMarkers = {
  '03-token-finality-report.md': [
    '## Launch summary',
    '## Ceremony sequence',
    '## Required transaction hashes',
    '## Post-ceremony authority graph',
    '## Verification checklist',
  ],
  '04-launch-signoff.md': [
    '## Release scope',
    '## Signoff statements',
    '## Required approvals',
    '## Attached evidence',
  ],
};

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  const p = path.join(bundlePath, file);
  if (!fs.existsSync(p)) fail(`missing file ${file}`);
}

const tokenLaunch = JSON.parse(fs.readFileSync(path.join(bundlePath, '01-token-launch-parameters.json'), 'utf8'));
const authority = JSON.parse(fs.readFileSync(path.join(bundlePath, '02-authority-registry.json'), 'utf8'));
const finality = JSON.parse(fs.readFileSync(path.join(bundlePath, '03-token-finality-report.json'), 'utf8'));

const requiredTokenFields = [
  'network', 'tokenName', 'tokenSymbol', 'tokenAddress', 'distributionVaultAddress', 'treasuryAddress',
  'totalSupply', 'mintedToVault', 'mintTxHash', 'minterRoleRevokeTxHash', 'defaultAdminRenounceTxHash', 'roleGraphSnapshotRef'
];
const requiredAuthorityFields = ['authorityModelVersion', 'safe', 'governance', 'launchCriticalEoaPrivileges'];
const requiredFinalityFields = ['network', 'tokenAddress', 'distributionVaultAddress', 'totalSupply', 'mintTxHash', 'minterRoleRevokeTxHash', 'defaultAdminRenounceTxHash', 'postCeremonyRoleGraph', 'approverSignatures'];

for (const key of requiredTokenFields) if (!(key in tokenLaunch)) fail(`01-token-launch-parameters.json missing key ${key}`);
for (const key of requiredAuthorityFields) if (!(key in authority)) fail(`02-authority-registry.json missing key ${key}`);
for (const key of requiredFinalityFields) if (!(key in finality)) fail(`03-token-finality-report.json missing key ${key}`);

if (tokenLaunch.distributionVaultAddress !== finality.distributionVaultAddress) {
  fail('distribution vault mismatch between launch parameters and finality report');
}
if (tokenLaunch.tokenAddress !== finality.tokenAddress) {
  fail('token address mismatch between launch parameters and finality report');
}
if (String(tokenLaunch.totalSupply) !== String(finality.totalSupply)) {
  fail('total supply mismatch between launch parameters and finality report');
}

for (const [file, markers] of Object.entries(requiredMarkdownMarkers)) {
  const content = fs.readFileSync(path.join(bundlePath, file), 'utf8');
  for (const marker of markers) {
    if (!content.includes(marker)) fail(`${file} missing markdown section ${marker}`);
  }
}

if (!draftMode) {
  const jsonFiles = [tokenLaunch, authority, finality];
  for (const obj of jsonFiles) {
    const serialized = JSON.stringify(obj);
    if (placeholderPattern.test(serialized)) fail('strict validation failed: unresolved placeholder found in JSON');
  }
  for (const file of Object.keys(requiredMarkdownMarkers)) {
    const content = fs.readFileSync(path.join(bundlePath, file), 'utf8');
    if (placeholderPattern.test(content)) fail(`strict validation failed: unresolved placeholder found in ${file}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: draftMode ? 'draft' : 'strict',
  bundlePath,
  validatedFiles: requiredFiles,
}, null, 2));
