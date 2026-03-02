import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/certification/validate-authority-freeze-pack.mjs <bundle-path> [--draft]');
  process.exit(1);
}

const bundlePath = path.resolve(args[0]);
const draftMode = args.includes('--draft');
const placeholderPattern = /<[^>]+>/;
const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const requiredFiles = [
  '01-authority-freeze-record.json',
  '02-launch-authority-registry.json',
  '03-signer-attestation.md',
  '04-launch-committee-approval.md',
  'manifest.json',
  'README.md',
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(bundlePath, file))) fail(`missing file ${file}`);
}

const freezeRecord = JSON.parse(fs.readFileSync(path.join(bundlePath, '01-authority-freeze-record.json'), 'utf8'));
const authorityRegistry = JSON.parse(fs.readFileSync(path.join(bundlePath, '02-launch-authority-registry.json'), 'utf8'));

for (const key of ['authorityModelVersion', 'status', 'safe', 'governance', 'launchCriticalEoaPrivileges', 'approverSignatures']) {
  if (!(key in freezeRecord)) fail(`01-authority-freeze-record.json missing key ${key}`);
}
for (const key of ['statusDate', 'authorityModelVersion', 'multisig', 'seats', 'governanceGraph']) {
  if (!(key in authorityRegistry)) fail(`02-launch-authority-registry.json missing key ${key}`);
}

if (String(freezeRecord.safe.threshold) !== '3') fail('authority freeze record threshold must be 3');
if (String(authorityRegistry.multisig.threshold) !== '3/5') fail('launch authority registry threshold must be 3/5');
if (!Array.isArray(freezeRecord.safe.owners) || freezeRecord.safe.owners.length !== 5) fail('authority freeze record must include 5 Safe owners');
if (!Array.isArray(authorityRegistry.seats) || authorityRegistry.seats.length !== 5) fail('launch authority registry must include 5 seats');

const seatLabels = new Set();
const signerAddresses = new Set();
for (const owner of freezeRecord.safe.owners) {
  if (seatLabels.has(owner.seat)) fail(`duplicate seat in authority freeze record: ${owner.seat}`);
  seatLabels.add(owner.seat);
  if (!draftMode && !addressPattern.test(owner.address)) fail(`invalid owner address for seat ${owner.seat}`);
  if (!draftMode) {
    if (signerAddresses.has(owner.address.toLowerCase())) fail(`duplicate owner address in authority freeze record: ${owner.address}`);
    signerAddresses.add(owner.address.toLowerCase());
  }
}

const registrySeatLabels = new Set();
for (const seat of authorityRegistry.seats) {
  if (registrySeatLabels.has(seat.label)) fail(`duplicate seat label in launch authority registry: ${seat.label}`);
  registrySeatLabels.add(seat.label);
  if (!draftMode && !addressPattern.test(seat.address)) fail(`invalid seat address in launch authority registry: ${seat.label}`);
  if (!seatLabels.has(seat.label)) fail(`seat label mismatch between freeze record and launch authority registry: ${seat.label}`);
}

const approvalDoc = fs.readFileSync(path.join(bundlePath, '04-launch-committee-approval.md'), 'utf8');
for (const marker of ['## Scope', '## Approval statements', '## Required approvals']) {
  if (!approvalDoc.includes(marker)) fail(`04-launch-committee-approval.md missing section ${marker}`);
}
const attestationDoc = fs.readFileSync(path.join(bundlePath, '03-signer-attestation.md'), 'utf8');
for (const marker of ['## Signer identity', '## Attestations', '## Signature reference']) {
  if (!attestationDoc.includes(marker)) fail(`03-signer-attestation.md missing section ${marker}`);
}

if (!draftMode) {
  if (placeholderPattern.test(JSON.stringify(freezeRecord))) fail('strict validation failed: unresolved placeholder in authority freeze record');
  if (placeholderPattern.test(JSON.stringify(authorityRegistry))) fail('strict validation failed: unresolved placeholder in launch authority registry');
  if (placeholderPattern.test(attestationDoc)) fail('strict validation failed: unresolved placeholder in signer attestation');
  if (placeholderPattern.test(approvalDoc)) fail('strict validation failed: unresolved placeholder in launch committee approval');
}

console.log(JSON.stringify({
  ok: true,
  mode: draftMode ? 'draft' : 'strict',
  bundlePath,
  validatedFiles: requiredFiles,
  seats: [...seatLabels],
}, null, 2));
