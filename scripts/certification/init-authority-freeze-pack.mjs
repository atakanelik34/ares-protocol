import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const authorityDir = path.join(repoRoot, 'docs', 'certification', 'authority');
const freezeDir = path.join(authorityDir, 'freeze');
const outputRoot = path.join(repoRoot, 'tmp', 'authority-freeze-pack');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(outputRoot, `ares-authority-freeze-${ts}`);

const fileMap = [
  [path.join(freezeDir, 'authority-freeze-record.template.json'), '01-authority-freeze-record.json'],
  [path.join(authorityDir, 'launch-authority-registry.json'), '02-launch-authority-registry.json'],
  [path.join(freezeDir, 'signer-attestation.template.md'), '03-signer-attestation.md'],
  [path.join(freezeDir, 'launch-committee-approval.template.md'), '04-launch-committee-approval.md'],
];

fs.mkdirSync(outDir, { recursive: true });
for (const [src, dest] of fileMap) fs.copyFileSync(src, path.join(outDir, dest));

const manifest = {
  generatedAt: new Date().toISOString(),
  mode: 'draft-authority-freeze',
  files: fileMap.map(([, dest]) => dest),
  nextSteps: [
    'Fill signer identities, addresses, and Safe details.',
    'Attach attestation and approval references.',
    'Run authority freeze validator in draft mode, then strict mode once finalized.',
  ],
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, 'README.md'),
  [
    '# ARES Authority Freeze Bundle',
    '',
    `Generated at: ${manifest.generatedAt}`,
    '',
    '## Files',
    ...manifest.files.map((f) => `- ${f}`),
    '- manifest.json',
    '',
    '## Commands',
    '```bash',
    `node scripts/certification/validate-authority-freeze-pack.mjs ${outDir} --draft`,
    '```',
  ].join('\n') + '\n'
);

console.log(outDir);
