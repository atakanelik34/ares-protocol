import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const timestamp = new Date().toISOString().replace(/[:]/g, '-');
const outDir = path.join(repoRoot, 'tmp', 'audit-bundle', `ares-audit-bundle-${timestamp}`);

const files = [
  'docs/audit/README.md',
  'docs/audit/scope.md',
  'docs/audit/frozen-contracts.md',
  'docs/audit/deployment-inventory.md',
  'docs/audit/role-matrix.md',
  'docs/audit/known-risks-and-assumptions.md',
  'docs/audit/test-and-certification-index.md',
  'docs/audit/open-questions-for-auditor.md',
  'docs/mainnet-certification-framework-v1.md',
  'docs/certification/README.md',
  'docs/certification/execution-matrix.md',
  'docs/certification/evidence-index.md',
  'docs/certification/authority/authority-package.md',
  'docs/certification/authority/role-matrix.md',
  'docs/certification/authority/signer-matrix.md',
  'docs/certification/authority/signer-replacement-playbook.md',
  'docs/certification/authority/compromised-signer-playbook.md',
  'docs/certification/authority/launch-authority-registry.json',
  'docs/certification/generated/base-delayed-inclusion-policy-2026-03-01.md',
  'docs/certification/generated/base-l2-resilience-baseline-2026-03-01.md',
  'docs/certification/generated/base-no-inclusion-scenarios-2026-03-01.json',
  'docs/certification/generated/base-no-inclusion-simulation-2026-03-01.md',
  'docs/certification/generated/dispute-window-decision-2026-03-01.md',
  'docs/certification/generated/economic-warfare-scenario-matrix.md',
  'docs/certification/generated/governance-capture-baseline-2026-03-01.md',
  'docs/certification/generated/governance-capture-cost-model-2026-03-01.md',
  'docs/certification/generated/governance-capture-scenarios-2026-03-01.json',
  'docs/certification/generated/governance-immunity-baseline-2026-03-01.md',
  'docs/certification/generated/governance-parameter-decision-2026-03-01.md',
  'docs/certification/generated/governance-threshold-model-2026-03-01.json',
  'docs/certification/generated/invariant-registry.md',
  'docs/certification/generated/mainnet-readiness-sprint-2026-03-01.md',
  'docs/certification/generated/security-suite-baseline-2026-03-01.md',
  'docs/certification/generated/signer-key-management-baseline-2026-03-01.md',
  'docs/certification/generated/token-mint-finality-baseline-2026-03-01.md',
  'docs/certification/templates/token-launch-parameters.template.json',
  'docs/certification/templates/token-finality-report.template.md',
  'docs/certification/templates/token-finality-report.template.json',
  'docs/certification/templates/launch-signoff.template.md',
  'docs/certification/templates/authority-registry.template.json',
  'contracts/core/AresRegistry.sol',
  'contracts/core/AresScorecardLedger.sol',
  'contracts/core/AresARIEngine.sol',
  'contracts/core/AresDispute.sol',
  'contracts/core/AresApiAccess.sol',
  'contracts/token/AresToken.sol',
  'contracts/token/AresGovernor.sol',
  'contracts/erc8004-adapters/ERC8004IdentityAdapter.sol',
  'contracts/erc8004-adapters/ERC8004ReputationAdapter.sol',
  'contracts/erc8004-adapters/ERC8004ValidationAdapter.sol'
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const manifest = {
    pack: 'ARES External Audit Bundle',
    generatedAt: new Date().toISOString(),
    sourceCommit: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
    files: []
  };

  for (const rel of files) {
    const src = path.join(repoRoot, rel);
    const dst = path.join(outDir, rel);
    await ensureDir(dst);
    await copyFile(src, dst);
    const data = await readFile(src);
    manifest.files.push({
      path: rel,
      sha256: sha256(data),
      bytes: data.length
    });
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
