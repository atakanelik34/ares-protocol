import fs from 'node:fs';
import path from 'node:path';

const [bundlePathArg, inputPathArg] = process.argv.slice(2);
if (!bundlePathArg || !inputPathArg) {
  console.error('Usage: node scripts/certification/fill-authority-freeze-pack.mjs <bundle-dir> <input-json>');
  process.exit(1);
}

const bundlePath = path.resolve(bundlePathArg);
const inputPath = path.resolve(inputPathArg);
const freezeRecordPath = path.join(bundlePath, '01-authority-freeze-record.json');
const registryPath = path.join(bundlePath, '02-launch-authority-registry.json');
const attestationPath = path.join(bundlePath, '03-signer-attestation.md');
const approvalPath = path.join(bundlePath, '04-launch-committee-approval.md');

for (const p of [freezeRecordPath, registryPath, attestationPath, approvalPath, inputPath]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing required path: ${p}`);
    process.exit(1);
  }
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const freezeRecord = JSON.parse(fs.readFileSync(freezeRecordPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

if (!Array.isArray(input.owners) || input.owners.length !== 5) {
  console.error('Input must contain exactly 5 owners');
  process.exit(1);
}
if (!Array.isArray(input.approverSignatures) || input.approverSignatures.length < 1) {
  console.error('Input must contain at least 1 approver signature');
  process.exit(1);
}

freezeRecord.status = input.status ?? 'filled';
freezeRecord.statusDate = input.statusDate ?? new Date().toISOString().slice(0, 10);
freezeRecord.authorityModelVersion = input.authorityModelVersion ?? freezeRecord.authorityModelVersion;
freezeRecord.safe.address = input.safeAddress;
freezeRecord.safe.threshold = Number(input.threshold ?? 3);
freezeRecord.safe.owners = input.owners.map((owner) => ({
  seat: owner.seat,
  name: owner.name,
  address: owner.address,
  hardwareWallet: owner.hardwareWallet !== false,
}));
freezeRecord.governance.governor = input.governorAddress;
freezeRecord.governance.timelock = input.timelockAddress;
freezeRecord.governance.openExecutor = input.openExecutor ?? true;
freezeRecord.governance.timelockMinDelaySeconds = Number(input.timelockMinDelaySeconds ?? 172800);
freezeRecord.launchCriticalEoaPrivileges = input.launchCriticalEoaPrivileges ?? [];
freezeRecord.approverSignatures = input.approverSignatures;

registry.statusDate = input.statusDate ?? new Date().toISOString().slice(0, 10);
registry.authorityModelVersion = input.authorityModelVersion ?? registry.authorityModelVersion;
registry.multisig.address = input.safeAddress;
registry.multisig.threshold = `${Number(input.threshold ?? 3)}/5`;
registry.seats = input.owners.map((owner, idx) => ({
  seat: idx + 1,
  label: owner.seat,
  address: owner.address,
}));
registry.governanceGraph.governor = input.governorAddress;
registry.governanceGraph.timelock = input.timelockAddress;
registry.governanceGraph.openExecutor = input.openExecutor ?? true;
registry.launchCriticalEoaPrivileges = input.launchCriticalEoaPrivileges ?? [];

const attestationDoc = [
  '# Signer Attestation Template',
  '',
  '## Signer identity',
  ...input.owners.map((owner, idx) => [
    `### Seat ${idx + 1}`,
    `- Seat: ${owner.seat}`,
    `- Name: ${owner.name}`,
    `- Address: ${owner.address}`,
    `- Device / wallet class: ${owner.hardwareWallet !== false ? 'hardware wallet' : 'software wallet'}`,
    '',
    '## Attestations',
    '- I control the listed signer address.',
    `- I use a hardware-wallet-backed signing flow for launch-critical approvals: ${owner.hardwareWallet !== false ? 'yes' : 'no'}.`,
    `- I understand the compromised-signer and replacement playbooks: ${owner.compromiseAck ?? 'yes'}.`,
    '- I understand that I must not delegate my signer role to an undisclosed party.',
    '- I confirm I do not control any additional signer seat in the ARES launch Safe.',
    '',
    '## Signature reference',
    `- Signature / evidence reference: ${owner.attestationRef ?? '<MISSING_ATTESTATION_REF>'}`,
    '',
  ].join('\n')),
].join('\n');

const approvalDoc = [
  '# Launch Committee Approval Template',
  '',
  '## Scope',
  `- Safe address: ${input.safeAddress}`,
  `- Governor address: ${input.governorAddress}`,
  `- Timelock address: ${input.timelockAddress}`,
  `- Authority model version: ${freezeRecord.authorityModelVersion}`,
  '',
  '## Approval statements',
  '- Final signer set has been frozen.',
  '- Safe threshold and seat mapping match the intended launch topology.',
  '- No launch-critical residual EOA privilege remains outside the declared authority graph.',
  '- Signer attestation evidence has been collected.',
  '- Remaining residual risks are accepted for launch evaluation.',
  '',
  '## Required approvals',
  ...input.approverSignatures.map((sig) => `- ${sig.role}: ${sig.signer} / ${sig.signatureRef}`),
  '',
].join('\n');

fs.writeFileSync(freezeRecordPath, `${JSON.stringify(freezeRecord, null, 2)}\n`);
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
fs.writeFileSync(attestationPath, `${attestationDoc}\n`);
fs.writeFileSync(approvalPath, `${approvalDoc}\n`);

console.log(bundlePath);
