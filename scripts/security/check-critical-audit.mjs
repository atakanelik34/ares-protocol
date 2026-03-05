import { spawnSync } from 'node:child_process';

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const workspaces = process.argv.slice(2);
if (workspaces.length === 0) {
  console.error('Usage: node scripts/security/check-critical-audit.mjs <workspace...>');
  process.exit(2);
}

let hasFailure = false;

for (const workspace of workspaces) {
  const result = spawnSync(
    'npm',
    ['audit', '--workspace', workspace, '--omit=dev', '--json'],
    { encoding: 'utf8' }
  );

  const report = extractJson(String(result.stdout || '')) || extractJson(String(result.stderr || ''));
  if (!report?.metadata?.vulnerabilities) {
    hasFailure = true;
    console.error(`[audit-gate] failed to parse audit output for workspace=${workspace}`);
    if (result.stderr) console.error(result.stderr.trim());
    continue;
  }

  const critical = Number(report.metadata.vulnerabilities.critical || 0);
  const high = Number(report.metadata.vulnerabilities.high || 0);
  const moderate = Number(report.metadata.vulnerabilities.moderate || 0);
  const total = Number(report.metadata.vulnerabilities.total || 0);

  console.log(
    `[audit-gate] workspace=${workspace} critical=${critical} high=${high} moderate=${moderate} total=${total}`
  );

  if (critical > 0) {
    hasFailure = true;
  }
}

if (hasFailure) {
  console.error('[audit-gate] critical dependency gate failed');
  process.exit(1);
}

console.log('[audit-gate] critical dependency gate passed');
