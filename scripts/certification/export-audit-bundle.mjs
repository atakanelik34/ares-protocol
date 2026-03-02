import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const timestamp = new Date().toISOString().replace(/[:]/g, '-');
const outDir = path.join(repoRoot, 'tmp', 'audit-bundle', `ares-audit-bundle-${timestamp}`);
const manifestPath = path.join(repoRoot, 'docs', 'audit', 'artifact-manifest.json');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const manifestDoc = JSON.parse(await readFile(manifestPath, 'utf8'));
  const files = [...new Set((manifestDoc.files || []).slice().sort())];
  await mkdir(outDir, { recursive: true });

  const bundleManifest = {
    pack: manifestDoc.pack || 'ARES External Audit Bundle',
    generatedAt: new Date().toISOString(),
    sourceCommit: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
    fileCount: files.length,
    files: []
  };

  for (const rel of files) {
    const src = path.join(repoRoot, rel);
    const dst = path.join(outDir, rel);
    await ensureDir(dst);
    await copyFile(src, dst);
    const data = await readFile(src);
    bundleManifest.files.push({
      path: rel,
      sha256: sha256(data),
      bytes: data.length
    });
  }

  const checksumManifest = {
    generatedAt: bundleManifest.generatedAt,
    sourceCommit: bundleManifest.sourceCommit,
    checksums: bundleManifest.files
  };

  await writeFile(path.join(outDir, 'bundle-manifest.json'), `${JSON.stringify(bundleManifest, null, 2)}\n`);
  await writeFile(path.join(outDir, 'checksum-manifest.json'), `${JSON.stringify(checksumManifest, null, 2)}\n`);

  const readme = [
    '# ARES Audit Bundle',
    '',
    `Generated at: ${bundleManifest.generatedAt}`,
    `Source commit: ${bundleManifest.sourceCommit}`,
    '',
    '## Contents',
    '- docs/audit/*',
    '- docs/certification/* (selected control-plane docs)',
    '- docs/certification/generated/* (selected baselines)',
    '- authority freeze and token finality rehearsal packs',
    '- frozen launch-critical contracts',
    '- bundle-manifest.json',
    '- checksum-manifest.json',
    '',
    '## Validation expectation',
    'Use the included manifests to confirm deterministic file set and SHA-256 integrity.',
  ].join('\n');
  await writeFile(path.join(outDir, 'README.md'), `${readme}\n`);

  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
