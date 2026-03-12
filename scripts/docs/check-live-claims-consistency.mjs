#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const README_PATH = path.resolve(ROOT, 'README.md');
const MAINNET_DOC_PATH = path.resolve(ROOT, 'docs/mainnet-go-no-go.md');
const BLOCKER_BOARD_PATH = path.resolve(ROOT, 'reports/mainnet-gates/ARES_MAINNET_BLOCKER_BOARD_2026-03-12.md');
const API_SRC_PATH = path.resolve(ROOT, 'api/query-gateway/src/index.js');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode || 0, body: JSON.parse(raw) });
          } catch (error) {
            reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

function collectApiRoutes(src) {
  const routes = new Set();
  const re = /app\.(get|post|put|delete|patch)\('([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    routes.add(m[2]);
  }
  return routes;
}

function getLiveDisputeCounts() {
  return new Promise((resolve, reject) => {
    const items = [];
    function pull(cursor = '') {
      const url = `https://ares-protocol.xyz/api/v1/disputes?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      https
        .get(url, (res) => {
          let raw = '';
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed.items)) items.push(...parsed.items);
              if (parsed.nextCursor === null || parsed.nextCursor === undefined) {
                const finalized = items.filter((row) => row.resolution !== null && row.resolution !== undefined).length;
                const pending = items.length - finalized;
                resolve({ total: items.length, finalized, pending });
                return;
              }
              pull(String(parsed.nextCursor));
            } catch (error) {
              reject(new Error(`Invalid dispute feed JSON: ${error.message}`));
            }
          });
        })
        .on('error', reject);
    }
    pull('');
  });
}

function extractBlockerStatus(board) {
  const status = new Map();
  for (const line of board.split('\n')) {
    const match = line.match(/\|\s*\*\*(B-\d{2}(?:\/B-\d{2})?)\*\*\s*\|\s*([^|]+)\|/);
    if (match) {
      status.set(match[1], match[2].trim());
    }
  }
  return status;
}

function statusForMainnetClaim(line) {
  const lower = line.toLowerCase();
  if (lower.includes('not mainnet-ready') || lower.includes('no-go')) return 'OK';
  return 'STALE';
}

function printReport(rows) {
  console.log('| File | Claim | Status | Evidence |');
  console.log('|---|---|---|---|');
  for (const row of rows) {
    console.log(`| ${row.file} | ${row.claim} | ${row.status} | ${row.evidence} |`);
  }
}

async function main() {
  const readme = readFile(README_PATH);
  const mainnetDoc = readFile(MAINNET_DOC_PATH);
  const blockerBoard = readFile(BLOCKER_BOARD_PATH);
  const apiSrc = readFile(API_SRC_PATH);

  const rows = [];
  const apiRoutes = collectApiRoutes(apiSrc);
  const blockerStatus = extractBlockerStatus(blockerBoard);

  const health = await fetchJson('https://ares-protocol.xyz/api/v1/health');
  const disputeCounts = await getLiveDisputeCounts();

  for (const line of readme.split('\n')) {
    const trimmed = line.trim();

    if (/mainnet-ready/i.test(trimmed)) {
      rows.push({
        file: 'README.md',
        claim: trimmed.replace(/\|/g, '\\|'),
        status: statusForMainnetClaim(trimmed),
        evidence: 'Mainnet blockers remain open in blocker board'
      });
    }

    if (/all audits closed|all audit findings closed/i.test(trimmed)) {
      rows.push({
        file: 'README.md',
        claim: trimmed.replace(/\|/g, '\\|'),
        status: 'STALE',
        evidence: 'B-07 attestation is OPEN'
      });
    }

    const routeMatches = [...trimmed.matchAll(/`(\/api\/v1\/[a-zA-Z0-9_\-/:?=&.]+)`/g)];
    for (const match of routeMatches) {
      const route = match[1].split('?')[0].replace('/api', '');
      const status = apiRoutes.has(route) ? 'OK' : 'STALE';
      rows.push({
        file: 'README.md',
        claim: match[1],
        status,
        evidence: status === 'OK' ? `Route exists in ${path.relative(ROOT, API_SRC_PATH)}` : `Route missing in ${path.relative(ROOT, API_SRC_PATH)}`
      });
    }

    const wsTests = trimmed.match(/workspace tests\s+(\d+)\/(\d+)\s+passed/i);
    if (wsTests) {
      rows.push({
        file: 'README.md',
        claim: trimmed.replace(/\|/g, '\\|'),
        status: 'STALE',
        evidence: 'Hard-coded aggregate test count is not authoritative over time'
      });
    }

    const finalizedMatch = trimmed.match(/Finalized disputes:\s*(\d+)/i);
    if (finalizedMatch) {
      const claimed = Number(finalizedMatch[1]);
      const status = claimed === disputeCounts.finalized ? 'OK' : 'STALE';
      rows.push({
        file: 'README.md',
        claim: trimmed.replace(/\|/g, '\\|'),
        status,
        evidence: `Live finalized disputes=${disputeCounts.finalized}`
      });
    }

    const pendingMatch = trimmed.match(/Pending disputes:\s*(\d+)/i);
    if (pendingMatch) {
      const claimed = Number(pendingMatch[1]);
      const status = claimed === disputeCounts.pending ? 'OK' : 'STALE';
      rows.push({
        file: 'README.md',
        claim: trimmed.replace(/\|/g, '\\|'),
        status,
        evidence: `Live pending disputes=${disputeCounts.pending}`
      });
    }
  }

  if (readme.includes('query-gateway')) {
    const status = health.statusCode === 200 && health.body?.service === 'query-gateway' ? 'OK' : 'STALE';
    rows.push({
      file: 'README.md',
      claim: 'API health service identity matches query-gateway',
      status,
      evidence: `GET /api/v1/health => status=${health.statusCode}, service=${String(health.body?.service || 'UNKNOWN')}`
    });
  } else {
    rows.push({
      file: 'README.md',
      claim: 'No explicit service-name claim to compare against /api/v1/health',
      status: 'UNKNOWN',
      evidence: 'README does not declare service name string'
    });
  }

  for (const line of mainnetDoc.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- [x]')) continue;

    let blocker = null;
    if (/conservative governance profile deployed/i.test(trimmed)) blocker = 'B-01/B-02';
    if (/dispute v2 cutover/i.test(trimmed)) blocker = 'B-03';
    if (/token\/?tge/i.test(trimmed)) blocker = 'B-06';
    if (/audit|closure/i.test(trimmed)) blocker = 'B-07';

    if (!blocker) {
      rows.push({
        file: 'docs/mainnet-go-no-go.md',
        claim: trimmed.replace(/\|/g, '\\|'),
        status: 'UNKNOWN',
        evidence: 'No blocker mapping rule for this checked item'
      });
      continue;
    }

    const liveStatus = blockerStatus.get(blocker) || 'UNKNOWN';
    const stale = /OPEN|IN PROGRESS|NO-GO/i.test(liveStatus);
    rows.push({
      file: 'docs/mainnet-go-no-go.md',
      claim: trimmed.replace(/\|/g, '\\|'),
      status: stale ? 'STALE' : 'OK',
      evidence: `Blocker board ${blocker} status=${liveStatus}`
    });
  }

  printReport(rows);

  const staleCount = rows.filter((row) => row.status === 'STALE').length;
  if (staleCount > 0) {
    console.error(`\nSTALE items found: ${staleCount}`);
    process.exit(2);
  }

  console.log('\nNo stale items found.');
}

main().catch((error) => {
  console.error(`check-live-claims-consistency failed: ${error?.message || String(error)}`);
  process.exit(1);
});
