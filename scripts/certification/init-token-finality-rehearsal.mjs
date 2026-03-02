import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const templatesDir = path.join(repoRoot, 'docs', 'certification', 'templates');
const outputRoot = path.join(repoRoot, 'tmp', 'token-finality-rehearsal');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(outputRoot, `ares-token-finality-rehearsal-${ts}`);

const fileMap = [
  ['token-launch-parameters.template.json', '01-token-launch-parameters.json'],
  ['authority-registry.template.json', '02-authority-registry.json'],
  ['token-finality-report.template.md', '03-token-finality-report.md'],
  ['token-finality-report.template.json', '03-token-finality-report.json'],
  ['launch-signoff.template.md', '04-launch-signoff.md'],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [srcName, destName] of fileMap) {
  const src = path.join(templatesDir, srcName);
  const dest = path.join(outDir, destName);
  fs.copyFileSync(src, dest);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  mode: 'draft-rehearsal',
  network: 'base-mainnet',
  files: fileMap.map(([, destName]) => destName),
  nextSteps: [
    'Fill bundle with rehearsal or launch-day values.',
    'Run validate-token-finality-pack.mjs <bundle> --draft for structure validation.',
    'Run validate-token-finality-pack.mjs <bundle> after launch-day values are final.',
  ],
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, 'README.md'),
  [
    '# ARES Token Finality Rehearsal Bundle',
    '',
    `Generated at: ${manifest.generatedAt}`,
    '',
    '## Files',
    ...manifest.files.map((f) => `- ${f}`),
    '- manifest.json',
    '',
    '## Usage',
    '1. Fill the draft fields for rehearsal or launch execution.',
    '2. Validate in draft mode while placeholders remain.',
    '3. Validate in strict mode once all launch-day values exist.',
    '',
    '## Commands',
    '```bash',
    `node scripts/certification/validate-token-finality-pack.mjs ${outDir} --draft`,
    '```',
  ].join('\n') + '\n'
);

console.log(outDir);
