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

registry.version = Number(input.registryVersion ?? registry.version ?? 1);
registry.authorityModelVersion = input.authorityModelVersion ?? registry.authorityModelVersion;
registry.safe.address = input.safeAddress;
registry.safe.threshold = Number(input.threshold ?? 3);
registry.safe.owners = input.owners.map((owner) => ({ seat: owner.seat, address: owner.address }));
registry.governance.governor = input.governorAddress;
registry.governance.timelock = input.timelockAddress;
registry.governance.openExecutor = input.openExecutor ?? true;
registry.governance.timelockMinDelaySeconds = Number(input.timelockMinDelaySeconds ?? 172800);
registry.launchCriticalEoaPrivileges = input.launchCriticalEoaPrivileges ?? [];

const attestationDoc = [
  '# Signer Attestation',
  '',
  `Status date: ${freezeRecord.statusDate}`,
  '',
  '## Signer set',
  ...input.owners.map((owner, idx) => [
    `### Seat ${idx + 1}: ${owner.seat}`,
    `- Name: ${owner.name}`,
    `- Address: ${owner.address}`,
    `- Hardware wallet: ${owner.hardwareWallet !== false ? 'yes' : 'no'}`,
    `- Attestation ref: ${owner.attestationRef ?? '<MISSING_ATTESTATION_REF>'}`,
    `- Compromise acknowledgement: ${owner.compromiseAck ?? 'yes'}`,
    `- Replacement policy acknowledgement: ${owner.replacementPolicyAck ?? 'yes'}`,
    '',
  ].join('\n')),
].join('\n');

const approvalDoc = [
  '# Launch Committee Approval',
  '',
  `Status date: ${freezeRecord.statusDate}`,
  '',
  '## Approval scope',
  `- Authority model version: ${freezeRecord.authorityModelVersion}`,
  `- Safe address: ${input.safeAddress}`,
  `- Governor: ${input.governorAddress}`,
  `- Timelock: ${input.timelockAddress}`,
  '',
  '## Approval references',
  ...input.approverSignatures.map((sig, idx) => `- ${idx + 1}. ${sig.role} / ${sig.signer} / ${sig.signatureRef}`),
  '',
  '## Release acknowledgement',
  `- Evidence refs: ${(input.evidenceRefs ?? []).join(', ') || '<NONE_PROVIDED>'}`,
  `- Notes: ${input.notes ?? 'None'}`,
  '',
].join('\n');

fs.writeFileSync(freezeRecordPath, `${JSON.stringify(freezeRecord, null, 2)}\n`);
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
fs.writeFileSync(attestationPath, `${attestationDoc}\n`);
fs.writeFileSync(approvalPath, `${approvalDoc}\n`);

console.log(bundlePath);
