import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import rawBody from 'fastify-raw-body';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createGoldskyProjectionLoader, resolveGoldskyAgentRef } from './goldsky.js';
import { buildChallenge, randomNonce, verifySignature } from './auth.js';
import { createAccessChecker } from './access.js';
import { getActionsFromSubgraph, getAgentFromSubgraph, getLeaderboardFromSubgraph, getScoreFromSubgraph } from './subgraph.js';
import { addAction, addDispute, getAgent, getMeta, listActions, listActionsRows, listAgents, resetState, seedDemo, upsertAgent } from './store.js';
import { computeAri } from './scoring.js';

const app = Fastify({ logger: true });
const moduleDir = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const SUBGRAPH_QUERY_URL = process.env.SUBGRAPH_QUERY_URL || '';
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY || '';
const GOLDSKY_WEBHOOK_TOKEN = process.env.GOLDSKY_WEBHOOK_TOKEN || '';
const GOLDSKY_WEBHOOK_HMAC_SECRET = process.env.GOLDSKY_WEBHOOK_HMAC_SECRET || '';
const configuredGoldskyAuthMode = normalizeWebhookAuthMode(process.env.GOLDSKY_WEBHOOK_AUTH_MODE || 'dual');
const GOLDSKY_WEBHOOK_AUTH_MODE = process.env.NODE_ENV === 'production'
  ? 'hmac'
  : configuredGoldskyAuthMode;
const GOLDSKY_WEBHOOK_MAX_SKEW_MS = Number(process.env.GOLDSKY_WEBHOOK_MAX_SKEW_MS || 300_000);
const GOLDSKY_WEBHOOK_REPLAY_TTL_MS = Number(process.env.GOLDSKY_WEBHOOK_REPLAY_TTL_MS || 86_400_000);
const NONCE_TTL_MS = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000);
const SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_MS || 60 * 60 * 1000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3003,http://localhost:3004';
const EXPOSE_API_HUB_ROOT = ['1', 'true', 'yes'].includes(String(process.env.EXPOSE_API_HUB_ROOT || '').toLowerCase())
  || process.env.NODE_ENV !== 'production';
const ENABLE_INTERNAL_DEMO = ['1', 'true', 'yes'].includes(String(process.env.ENABLE_INTERNAL_DEMO || '').toLowerCase());
const corsOrigins = CORS_ORIGIN === '*'
  ? true
  : CORS_ORIGIN.split(',').map((v) => v.trim()).filter(Boolean);

const dbPath = process.env.DATABASE_URL?.startsWith('sqlite:')
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : './ares.db';

const db = new DatabaseSync(dbPath);

app.register(cors, {
  origin: corsOrigins
});
app.register(rawBody, {
  field: 'rawBody',
  global: false,
  encoding: 'utf8',
  runFirst: true
});

db.exec(`
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  lang TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_nonce (
  account TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goldsky_ingest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  topic0 TEXT,
  address TEXT,
  block_number INTEGER,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goldsky_ingest_address_id ON goldsky_ingest(address, id);
CREATE TABLE IF NOT EXISTS webhook_replay (
  source TEXT NOT NULL,
  digest TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  PRIMARY KEY (source, digest)
);
CREATE INDEX IF NOT EXISTS idx_webhook_replay_received_at ON webhook_replay(received_at);
`);

function ensureWaitlistSchema() {
  const cols = db.prepare('PRAGMA table_info(waitlist)').all().map((row) => String(row.name));
  const colSet = new Set(cols);
  if (!colSet.has('tier_intent')) db.exec('ALTER TABLE waitlist ADD COLUMN tier_intent TEXT');
  if (!colSet.has('has_testnet_agent')) db.exec('ALTER TABLE waitlist ADD COLUMN has_testnet_agent INTEGER');
  if (!colSet.has('partner_ref')) db.exec('ALTER TABLE waitlist ADD COLUMN partner_ref TEXT');
}

ensureWaitlistSchema();

const challengeStmt = db.prepare(
  'INSERT INTO auth_nonce (account, nonce, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)'
);
const findNonceStmt = db.prepare(
  'SELECT account, nonce, expires_at, used FROM auth_nonce WHERE account = ? ORDER BY rowid DESC LIMIT 1'
);
const consumeNonceStmt = db.prepare('UPDATE auth_nonce SET used = 1 WHERE account = ? AND nonce = ?');
const insertWaitlistStmt = db.prepare(
  'INSERT OR IGNORE INTO waitlist (email, lang, source, tier_intent, has_testnet_agent, partner_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const insertGoldskyIngestStmt = db.prepare(
  'INSERT INTO goldsky_ingest (source, topic0, address, block_number, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertWebhookReplayStmt = db.prepare(
  'INSERT INTO webhook_replay (source, digest, received_at) VALUES (?, ?, ?)'
);
const deleteExpiredWebhookReplayStmt = db.prepare(
  'DELETE FROM webhook_replay WHERE source = ? AND received_at < ?'
);

const waitlistRate = new Map();
const authTokens = new Map();
const accessChecker = createAccessChecker({ env: process.env, logger: app.log });
const loadGoldskyProjection = createGoldskyProjectionLoader({
  db,
  repoRoot: resolve(moduleDir, '../../..'),
  logger: app.log
});

function loadTokenomicsConstants() {
  const configuredPath = process.env.TOKENOMICS_CONSTANTS_PATH;
  const candidates = [
    configuredPath,
    resolve(moduleDir, '../../../docs/tokenomics.constants.json'),
    resolve(process.cwd(), '../../docs/tokenomics.constants.json'),
    resolve(process.cwd(), 'docs/tokenomics.constants.json')
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (!existsSync(candidate)) continue;
      const parsed = JSON.parse(readFileSync(candidate, 'utf8'));
      return parsed;
    } catch (error) {
      app.log.warn({ err: error, candidate }, 'failed to load tokenomics constants');
    }
  }

  return null;
}

function buildTokenomicsSummary(constants) {
  if (!constants) {
    return {
      version: '2.1',
      source: 'fallback',
      seed: { raiseCapUsd: '400000', tokenPriceUsd: '0.005', maxTokens: '80000000' },
      supply: { totalSupplyTokens: '1000000000' },
      note: 'tokenomics.constants.json not found at runtime'
    };
  }

  return {
    version: constants.meta?.version || '2.1',
    asOf: constants.meta?.asOf || null,
    seed: {
      raiseCapUsd: constants.seed?.raiseCapUsd || null,
      tokenPriceUsd: constants.seed?.tokenPriceUsd || null,
      maxTokens: constants.seed?.maxTokens || null,
      tgeUnlockTokens: constants.seed?.tgeUnlockTokens || null
    },
    supply: {
      totalSupplyTokens: constants.supply?.totalSupplyTokens || null,
      oneTimeMintArchitecture: Boolean(constants.supply?.oneTimeMintArchitecture)
    },
    allocation: Array.isArray(constants.allocation)
      ? constants.allocation.map((row) => ({
          key: row.key,
          label: row.label,
          percent: row.percent,
          tokens: row.tokens
        }))
      : [],
    tge: {
      targetCirculatingTokens: constants.tge?.targetCirculatingTokens || null,
      components: Array.isArray(constants.tge?.components)
        ? constants.tge.components.map((row) => ({
            source: row.source,
            label: row.label,
            tokens: row.tokens
          }))
        : []
    },
    revenue: {
      buybackBurnBps: constants.revenue?.buybackBurnBps || null,
      treasuryBps: constants.revenue?.treasuryBps || null,
      stakingPoolBps: constants.revenue?.stakingPoolBps || null
    },
    apy: constants.apy || null,
    waitlistTiers: constants.waitlistTiers || []
  };
}

const TOKENOMICS_CONSTANTS = loadTokenomicsConstants();
const TOKENOMICS_SUMMARY = buildTokenomicsSummary(TOKENOMICS_CONSTANTS);

const DEMO_ACCOUNTS = Object.freeze({
  'demo-1': '0x0000000000000000000000000000000000000001',
  'demo-2': '0x0000000000000000000000000000000000000002',
  'demo-3': '0x0000000000000000000000000000000000000003',
  'demo-4': '0x0000000000000000000000000000000000000004',
  'demo-5': '0x0000000000000000000000000000000000000005',
  star: '0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5',
  fallen: '0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8',
  grower: '0xf9a6c2029fcdf0371b243d19621da51f9335366d'
});

const LEGACY_DEMO_TO_CURRENT = Object.freeze({
  '0x1000000000000000000000000000000000000001': DEMO_ACCOUNTS['demo-1'],
  '0x2000000000000000000000000000000000000002': DEMO_ACCOUNTS['demo-2'],
  '0x3000000000000000000000000000000000000003': DEMO_ACCOUNTS['demo-3'],
  '0x4000000000000000000000000000000000000004': DEMO_ACCOUNTS['demo-4'],
  '0x5000000000000000000000000000000000000005': DEMO_ACCOUNTS['demo-5']
});

const DEMO_ALIAS_BY_ACCOUNT = Object.freeze(
  Object.fromEntries([
    ...Object.entries(DEMO_ACCOUNTS).map(([alias, account]) => [account, alias]),
    ...Object.entries(LEGACY_DEMO_TO_CURRENT).map(([legacy, current]) => [legacy, demoAliasOfAddress(current)])
  ])
);
const streamClients = new Set();
const MAX_STREAM_CLIENTS = Number(process.env.SSE_MAX_CLIENTS || 100);
const STREAM_MAX_MS = Number(process.env.SSE_MAX_MS || 10 * 60 * 1000);

function normalizeWebhookAuthMode(value) {
  const mode = String(value || '').toLowerCase().trim();
  if (mode === 'token' || mode === 'hmac' || mode === 'dual') return mode;
  return 'dual';
}

function resolveSseCorsOrigin(value) {
  const requestOrigin = String(value || '').trim();
  if (!requestOrigin) return null;
  if (corsOrigins === true) return '*';
  if (Array.isArray(corsOrigins) && corsOrigins.includes(requestOrigin)) return requestOrigin;
  return false;
}

function parseWebhookTimestamp(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (raw > 1_000_000_000_000) return raw;
  return raw * 1000;
}

function normalizeWebhookSignature(value) {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = raw.startsWith('sha256=') ? raw.slice('sha256='.length) : raw;
  if (!/^[0-9a-f]{64}$/.test(normalized)) return null;
  return normalized;
}

function verifyGoldskyHmac({ timestampHeader, signatureHeader, rawPayload }) {
  if (!GOLDSKY_WEBHOOK_HMAC_SECRET) {
    return { ok: false, reason: 'hmac secret missing' };
  }

  const tsMs = parseWebhookTimestamp(timestampHeader);
  if (!tsMs) return { ok: false, reason: 'invalid timestamp' };
  if (Math.abs(Date.now() - tsMs) > GOLDSKY_WEBHOOK_MAX_SKEW_MS) {
    return { ok: false, reason: 'timestamp outside skew window' };
  }

  const signature = normalizeWebhookSignature(signatureHeader);
  if (!signature) return { ok: false, reason: 'invalid signature format' };

  const canonical = `${timestampHeader}.${rawPayload}`;
  const expected = crypto
    .createHmac('sha256', GOLDSKY_WEBHOOK_HMAC_SECRET)
    .update(canonical)
    .digest('hex');

  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actualBuffer.length !== expectedBuffer.length) {
    return { ok: false, reason: 'signature mismatch' };
  }
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { ok: false, reason: 'signature mismatch' };
  }

  const digest = crypto.createHash('sha256').update(canonical).digest('hex');
  return { ok: true, digest };
}

function registerWebhookReplay(source, digest) {
  const now = Date.now();
  try {
    deleteExpiredWebhookReplayStmt.run(source, now - GOLDSKY_WEBHOOK_REPLAY_TTL_MS);
    insertWebhookReplayStmt.run(source, digest, now);
    return true;
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (
      code.includes('SQLITE_CONSTRAINT') ||
      Number(error?.errno || 0) === 19 ||
      message.includes('SQLITE_CONSTRAINT') ||
      message.includes('UNIQUE constraint failed')
    ) {
      return false;
    }
    throw error;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getBaseUrlFromRequest(request) {
  const forwardedHost = String(request.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = escapeHtml(forwardedHost || String(request.headers.host || 'ares-protocol.xyz'));
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'https';
  const forwardedPrefix = String(request.headers['x-forwarded-prefix'] || '').split(',')[0].trim();
  const prefix = forwardedPrefix
    ? `/${forwardedPrefix.replace(/^\/+|\/+$/g, '')}`
    : '';
  return `${proto}://${host}${prefix}`;
}

function wantsHtml(request) {
  const format = String(request.query?.format || '').toLowerCase();
  if (format === 'json') return false;
  if (format === 'html') return true;
  const accept = String(request.headers.accept || '').toLowerCase();
  return accept.includes('text/html');
}

function resolveDemoAccount(value) {
  const v = String(value || '').toLowerCase();
  if (DEMO_ACCOUNTS[v]) return DEMO_ACCOUNTS[v];
  return LEGACY_DEMO_TO_CURRENT[v] || v;
}

function demoAliasOf(value) {
  return DEMO_ALIAS_BY_ACCOUNT[String(value || '').toLowerCase()] || '';
}

function demoAliasOfAddress(address) {
  const target = String(address || '').toLowerCase();
  for (const [alias, account] of Object.entries(DEMO_ACCOUNTS)) {
    if (account === target) return alias;
  }
  return '';
}

function resolveAgentRequest(agentRef) {
  const rawRef = String(agentRef || '').toLowerCase();
  const goldsky = loadGoldskyProjection();
  const goldskyAgent = resolveGoldskyAgentRef(goldsky, rawRef);
  const aliasFromAddress = goldskyAgent ? '' : demoAliasOf(rawRef);
  return {
    rawRef,
    aliasFromAddress,
    agentAddress: goldskyAgent?.address || resolveDemoAccount(rawRef),
    goldskyAgent
  };
}

function endpointKind(endpointPath) {
  if (endpointPath.startsWith('/v1/health')) return 'health';
  if (endpointPath.startsWith('/v1/tokenomics/summary')) return 'tokenomics';
  if (endpointPath.startsWith('/v1/score/')) return 'score';
  if (endpointPath.startsWith('/v1/agent/')) return 'agent';
  if (endpointPath.startsWith('/v1/agents')) return 'leaderboard';
  if (endpointPath.startsWith('/v1/history')) return 'actions';
  if (endpointPath.startsWith('/v1/actions')) return 'actions';
  if (endpointPath.startsWith('/v1/leaderboard')) return 'leaderboard';
  if (endpointPath.startsWith('/v1/access/')) return 'access';
  if (endpointPath.startsWith('/v1/auth/challenge')) return 'challenge';
  return 'generic';
}

function text(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  return escapeHtml(String(value));
}

function compactValue(value, max = 34) {
  const raw = String(value || '');
  if (!raw) return '-';
  if (raw.length <= max) return raw;
  const left = Math.ceil((max - 3) / 2);
  const right = Math.floor((max - 3) / 2);
  return `${raw.slice(0, left)}...${raw.slice(-right)}`;
}

function compactHex(value, left = 10, right = 8) {
  const raw = String(value || '');
  if (!raw) return '-';
  if (!raw.startsWith('0x')) return compactValue(raw);
  if (raw.length <= left + right + 3) return raw;
  return `${raw.slice(0, left)}...${raw.slice(-right)}`;
}

function mono(value, opts = {}) {
  if (value === undefined || value === null || value === '') return '-';
  const raw = String(value);
  const shortened = opts.hex ? compactHex(raw, opts.left, opts.right) : compactValue(raw, opts.max);
  return `<span class="mono-wrap" title="${escapeHtml(raw)}">${escapeHtml(shortened)}</span>`;
}

function endpointTemplate(path) {
  if (path.startsWith('/v1/tokenomics/summary')) return '/v1/tokenomics/summary';
  if (path.startsWith('/v1/score/')) return '/v1/score/:agentAddress (or /v1/score/demo-1)';
  if (path.startsWith('/v1/agent/')) return '/v1/agent/:agentAddress (or /v1/agent/demo-1)';
  if (path.startsWith('/v1/agents')) return '/v1/agents?limit=:limit&tier=:tier';
  if (path.startsWith('/v1/history')) return '/v1/history?agent=:address&limit=:n&page=:p (or cursor=:seq)';
  if (path.startsWith('/v1/access/')) return '/v1/access/:account (or /v1/access/demo-1)';
  if (path.startsWith('/v1/auth/challenge')) return '/v1/auth/challenge?account=:account (or account=demo-1)';
  if (path.startsWith('/v1/actions')) return '/v1/actions?agent=:address&limit=:n&page=:p (or cursor=:seq)';
  if (path.startsWith('/v1/stream/actions')) return '/v1/stream/actions?agent=:address';
  if (path.startsWith('/v1/leaderboard')) return '/v1/leaderboard?limit=:limit&tier=:tier';
  return path;
}

function parseBoolFlag(value) {
  const v = String(value || '').toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(v)) return true;
  if (['0', 'false', 'no', 'n'].includes(v)) return false;
  return null;
}

function normalizeActionBucket(value) {
  const v = String(value || '').toLowerCase().trim();
  if (!v) return '';
  if (v === '0-20' || v === '0_20' || v === 'low') return '0-20';
  if (v === '20-50' || v === '20_50' || v === 'mid') return '20-50';
  if (v === '50+' || v === '50_plus' || v === 'high') return '50+';
  return '';
}

function asAgentHex(agentId) {
  return `0x${BigInt(agentId || 0).toString(16)}`;
}

function actionMatchesBucket(actionsCount, bucket) {
  if (!bucket) return true;
  const n = Number(actionsCount || 0);
  if (bucket === '0-20') return n >= 0 && n <= 20;
  if (bucket === '20-50') return n > 20 && n <= 50;
  if (bucket === '50+') return n > 50;
  return true;
}

function writeSseEvent(client, event, data) {
  client.raw.write(`event: ${event}\n`);
  client.raw.write(`data: ${JSON.stringify(data)}\n\n`);
}

function publishActionEvent(payload) {
  for (const client of streamClients) {
    if (client.raw.destroyed || client.raw.writableEnded) continue;
    if (client.filterAddress && client.filterAddress !== payload.address) continue;
    writeSseEvent(client, 'action', payload);
  }
}

function iso(value) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? text(value) : d.toISOString();
  }
  const asNum = Number(value);
  if (Number.isFinite(asNum) && String(value).trim() !== '' && String(value).match(/^\d+$/)) {
    const ms = asNum > 1e12 ? asNum : asNum * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? text(value) : d.toISOString();
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return text(value);
}

function badge(value, variant = 'neutral') {
  return `<span class="badge badge-${variant}">${text(value)}</span>`;
}

function tierVariant(tier) {
  const t = String(tier || '').toUpperCase();
  if (t === 'ELITE') return 'good';
  if (t === 'TRUSTED' || t === 'ESTABLISHED') return 'info';
  if (t === 'PROVISIONAL') return 'warn';
  return 'neutral';
}

function boolBadge(value) {
  return value ? badge('YES', 'good') : badge('NO', 'warn');
}

function card(title, value, subtitle = '', valueClass = '') {
  return `<div class="metric-card">
    <div class="metric-title">${text(title)}</div>
    <div class="metric-value ${valueClass}">${value}</div>
    <div class="metric-sub">${text(subtitle, '')}</div>
  </div>`;
}

function renderDetails(kind, payload) {
  if (kind === 'health') {
    return `<section class="panel">
      <div class="metrics">
        ${card('Status', payload.ok ? badge('ONLINE', 'good') : badge('OFFLINE', 'warn'), 'Gateway health')}
        ${card('Service', text(payload.service), 'Service name')}
        ${card('Timestamp', text(payload.ts), 'UTC ISO')}
      </div>
    </section>`;
  }

  if (kind === 'tokenomics') {
    const allocation = Array.isArray(payload.allocation) ? payload.allocation : [];
    const rows = allocation.length
      ? allocation
          .map((row, i) => `<tr>
              <td>${i + 1}</td>
              <td>${text(row.label)}</td>
              <td>${text(row.percent)}%</td>
              <td>${text(row.tokens)}</td>
            </tr>`)
          .join('')
      : '<tr><td colspan="4" class="empty">No allocation rows</td></tr>';

    return `<section class="panel">
      <div class="metrics">
        ${card('Version', text(payload.version), 'Tokenomics constants')}
        ${card('Total Supply', text(payload.supply?.totalSupplyTokens), 'ARES')}
        ${card('Seed Cap', `$${text(payload.seed?.raiseCapUsd)}`, 'USD')}
        ${card('Seed Max', text(payload.seed?.maxTokens), 'ARES')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>APY Formula</span><strong>${text(payload.apy?.formula)}</strong></div>
        <div class="kv"><span>APY Disclaimer</span><strong>${text(payload.apy?.disclaimer)}</strong></div>
        <div class="kv"><span>TGE Target</span><strong>${text(payload.tge?.targetCirculatingTokens)}</strong></div>
      </div>
      <h3 class="subhead">Allocation</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Category</th><th>%</th><th>Tokens</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }

  if (kind === 'score') {
    return `<section class="panel">
      <div class="metrics">
        ${card('ARI', text(payload.ari), '0-1000', 'ari')}
        ${card('Tier', badge(payload.tier || 'UNVERIFIED', tierVariant(payload.tier)), 'Trust level')}
        ${card('Actions', text(payload.actions), 'Valid actions')}
        ${card('Since', text(payload.since), 'First seen')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>Agent ID (decimal)</span><strong>${text(payload.agentId)}</strong></div>
        <div class="kv"><span>Agent ID (hex)</span><strong>${mono(payload.agentIdHex, { hex: true })}</strong></div>
      </div>
    </section>`;
  }

  if (kind === 'agent') {
    const actions = Array.isArray(payload.actions) ? payload.actions : [];
    const disputes = Array.isArray(payload.disputes) ? payload.disputes : [];
    const actionRows = actions.length
      ? actions
          .map((a, i) => `<tr>
              <td>${i + 1}</td>
              <td>${mono(a.actionId, { hex: true, left: 12, right: 10 })}</td>
              <td>${Array.isArray(a.scores) ? text(a.scores.join(' / ')) : '-'}</td>
              <td>${a.status === 'INVALID' ? badge('INVALID', 'warn') : badge('VALID', 'good')}</td>
              <td>${text(a.timestamp)}</td>
            </tr>`)
          .join('')
      : '<tr><td colspan="5" class="empty">No actions</td></tr>';
    const disputeRows = disputes.length
      ? disputes
          .map((d) => `<tr>
              <td>${text(d.id)}</td>
              <td>${mono(d.actionId, { hex: true, left: 12, right: 10 })}</td>
              <td>${d.accepted ? badge('ACCEPTED', 'good') : badge('REJECTED', 'warn')}</td>
              <td>${text(d.finalizedAt)}</td>
            </tr>`)
          .join('')
      : '<tr><td colspan="4" class="empty">No disputes</td></tr>';

    return `<section class="panel">
      <div class="metrics">
        ${card('Found', boolBadge(Boolean(payload.found)), 'Registry lookup')}
        ${card('ARI', text(payload.ari), '0-1000', 'ari')}
        ${card('Tier', badge(payload.tier || 'UNVERIFIED', tierVariant(payload.tier)), 'Trust level')}
        ${card('Actions', text(payload.actionsCount ?? payload.actions?.length ?? 0), 'Shown below')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>Address</span><strong>${mono(payload.address, { hex: true })}</strong></div>
        <div class="kv"><span>Operator</span><strong>${mono(payload.operator, { hex: true })}</strong></div>
        <div class="kv"><span>Agent ID</span><strong>${text(payload.agentId)} (${mono(payload.agentIdHex, { hex: true })})</strong></div>
        <div class="kv"><span>Registered At</span><strong>${text(payload.registeredAt)}</strong></div>
      </div>
      <h3 class="subhead">Recent Actions</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Action ID</th><th>Scores</th><th>Status</th><th>Timestamp</th></tr></thead>
          <tbody>${actionRows}</tbody>
        </table>
      </div>
      <h3 class="subhead">Disputes</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Action ID</th><th>Result</th><th>Finalized At</th></tr></thead>
          <tbody>${disputeRows}</tbody>
        </table>
      </div>
    </section>`;
  }

  if (kind === 'leaderboard') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const rows = items.length
      ? items
          .map((item, i) => `<tr>
              <td>${i + 1}</td>
              <td>${mono(item.address, { hex: true })}</td>
              <td>${text(item.agentId)} (${mono(item.agentIdHex, { hex: true })})</td>
              <td>${text(item.ari)}</td>
              <td>${badge(item.tier || 'UNVERIFIED', tierVariant(item.tier))}</td>
              <td>${text(item.actions)}</td>
              <td>${text(item.since)}</td>
            </tr>`)
          .join('')
      : '<tr><td colspan="7" class="empty">No leaderboard items</td></tr>';

    return `<section class="panel">
      <div class="metrics">
        ${card('Items', text(items.length), 'Returned rows')}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Address</th><th>Agent ID</th><th>ARI</th><th>Tier</th><th>Actions</th><th>Since</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }

  if (kind === 'actions') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const page = payload.pagination?.page || null;
    const totalPages = payload.pagination?.totalPages || null;
    const totalItems = payload.pagination?.totalItems || null;
    const rows = items.length
      ? items
          .map((item, i) => `<tr>
              <td>${i + 1}</td>
              <td>${mono(item.address, { hex: true })}</td>
              <td>${text(item.agentId)} (${mono(item.agentIdHex, { hex: true })})</td>
              <td>${mono(item.actionId, { hex: true, left: 12, right: 10 })}</td>
              <td>${Array.isArray(item.scores) ? text(item.scores.join(' / ')) : '-'}</td>
              <td>${item.status === 'INVALID' ? badge('INVALID', 'warn') : badge('VALID', 'good')}</td>
              <td>${item.isDisputed ? badge('YES', 'warn') : badge('NO', 'neutral')}</td>
              <td>${text(item.timestamp)}</td>
            </tr>`)
          .join('')
      : '<tr><td colspan="8" class="empty">No action rows</td></tr>';
    return `<section class="panel">
      <div class="metrics">
        ${card('Rows', text(items.length), 'Current page size')}
        ${card('Page', page ? text(`${page} / ${totalPages || 1}`) : '-', 'Page mode')}
        ${card('Total Items', totalItems !== null ? text(totalItems) : '-', 'Filtered rows')}
        ${card('Next Cursor', text(payload.nextCursor ?? '-'), 'Pagination cursor')}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Address</th><th>Agent</th><th>Action ID</th><th>Scores</th><th>Status</th><th>Disputed</th><th>Timestamp</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }

  if (kind === 'access') {
    return `<section class="panel">
      <div class="metrics">
        ${card('Has Access', boolBadge(Boolean(payload.hasAccess)), 'Session + on-chain')}
        ${card('Session Active', boolBadge(Boolean(payload.sessionActive)), 'Current bearer token')}
        ${card('On-chain Enabled', boolBadge(Boolean(payload.onChain?.enabled)), 'Access contract mode')}
        ${card('On-chain Access', boolBadge(Boolean(payload.onChain?.hasAccess)), 'AresApiAccess state')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>Account</span><strong>${mono(payload.account, { hex: true })}</strong></div>
        <div class="kv"><span>Session Expires At</span><strong>${iso(payload.expiresAt)}</strong></div>
        <div class="kv"><span>On-chain Expiry</span><strong>${text(payload.onChain?.expiry)}</strong></div>
      </div>
    </section>`;
  }

  if (kind === 'challenge') {
    return `<section class="panel">
      <div class="metrics">
        ${card('Account', mono(payload.account, { hex: true }), 'Requested account')}
        ${card('TTL (ms)', text(payload.ttlMs), 'Challenge validity')}
        ${card('Expires At', iso(payload.expiresAt), 'UTC ISO')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>Nonce</span><strong>${mono(payload.nonce, { max: 24 })}</strong></div>
        <div class="kv"><span>Message</span><strong>${mono(payload.message, { max: 64 })}</strong></div>
      </div>
    </section>`;
  }

  return `<section class="panel"><div class="kv-grid"><div class="kv"><span>Response</span><strong>${text(JSON.stringify(payload))}</strong></div></div></section>`;
}

const API_SHELL_STYLES = `
  :root {
    --red: #c0392b;
    --red-bright: #ff5c4c;
    --dark: #080b0f;
    --dark2: #0e1318;
    --surface: rgba(18, 24, 30, 0.9);
    --surface-strong: rgba(11, 15, 20, 0.94);
    --border: rgba(255, 92, 76, 0.22);
    --border-dim: rgba(255, 255, 255, 0.08);
    --text: #e8edf2;
    --text-dim: #7a8a99;
    --text-bright: #ffffff;
    --mono: "Space Mono", monospace;
    --display: "Bebas Neue", sans-serif;
    --body: "DM Sans", sans-serif;
    --ease: cubic-bezier(.22, 1, .36, 1);
    --shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    min-height: 100vh;
    overflow-x: hidden;
    color: var(--text);
    font-family: var(--body);
    background:
      radial-gradient(1100px 620px at 14% 4%, rgba(231, 76, 60, 0.12), transparent 62%),
      radial-gradient(900px 520px at 86% 10%, rgba(73, 118, 165, 0.1), transparent 58%),
      linear-gradient(180deg, #090c11 0%, #070a0e 42%, #090c11 100%);
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.024;
    pointer-events: none;
    z-index: 0;
  }
  .page-loop,
  .page-grid-loop,
  .page-scanline {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
  .page-loop {
    inset: -14%;
    opacity: 0.52;
    filter: blur(2px);
    background:
      radial-gradient(34% 28% at 18% 22%, rgba(255, 92, 76, 0.14), transparent 70%),
      radial-gradient(28% 22% at 78% 18%, rgba(84, 128, 180, 0.1), transparent 74%),
      radial-gradient(22% 18% at 62% 74%, rgba(255, 92, 76, 0.08), transparent 72%);
    animation: pageLoopOrbit 28s linear infinite;
  }
  .page-loop::before,
  .page-loop::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }
  .page-loop::before {
    background:
      radial-gradient(24% 20% at 30% 34%, rgba(255, 92, 76, 0.1), transparent 74%),
      radial-gradient(20% 18% at 74% 62%, rgba(255, 255, 255, 0.045), transparent 72%);
    animation: pageLoopPulse 18s var(--ease) infinite;
  }
  .page-loop::after {
    inset: 10% 12%;
    border: 1px solid rgba(255, 255, 255, 0.025);
    box-shadow:
      0 0 0 120px rgba(255, 255, 255, 0.008),
      0 0 0 240px rgba(255, 92, 76, 0.012);
    opacity: 0.24;
    animation: pageRingShift 22s ease-in-out infinite;
  }
  .page-grid-loop {
    opacity: 0.24;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, transparent 0%, rgba(255, 92, 76, 0.045) 48%, transparent 100%);
    background-size: 72px 72px, 72px 72px, 200% 100%;
    background-position: 0 0, 0 0, 0% 0%;
    mask-image: radial-gradient(circle at 50% 34%, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.85) 36%, rgba(0, 0, 0, 0.22) 78%, transparent 100%);
    animation: pageGridDrift 38s linear infinite;
  }
  .page-scanline {
    opacity: 0.32;
    mix-blend-mode: screen;
  }
  .page-scanline::before,
  .page-scanline::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
  }
  .page-scanline::before {
    top: -18%;
    height: 24%;
    background: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.045) 48%, rgba(255, 92, 76, 0.03) 56%, transparent 100%);
    animation: pageScanSweep 20s linear infinite;
  }
  .page-scanline::after {
    inset: 0;
    background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 5px);
    opacity: 0.12;
  }
  .api-shell {
    position: relative;
    z-index: 2;
    max-width: 1380px;
    margin: 0 auto;
    padding: 24px 28px 84px;
  }
  .top-nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 16px 0 18px;
    margin-bottom: 24px;
    backdrop-filter: blur(12px);
  }
  .brand {
    text-decoration: none;
    color: var(--red-bright);
    font-family: var(--display);
    font-size: 34px;
    letter-spacing: 3px;
    text-shadow: 0 0 22px rgba(231, 76, 60, 0.16);
  }
  .brand span {
    display: block;
    color: var(--text-dim);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 1.8px;
    margin-top: -3px;
  }
  .top-links,
  .hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .top-links a,
  .hero-link,
  .pager-btn {
    appearance: none;
    text-decoration: none;
    color: var(--text-bright);
    border: 1px solid var(--border);
    background: linear-gradient(135deg, #d94938 0%, #c0392b 44%, #e55947 100%);
    padding: 11px 15px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    transition:
      transform 180ms var(--ease),
      box-shadow 180ms var(--ease),
      border-color 180ms var(--ease),
      background 180ms var(--ease),
      color 180ms var(--ease);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  }
  .top-links a:hover,
  .hero-link:hover,
  .pager-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 22px 48px rgba(0, 0, 0, 0.26);
  }
  .top-links a:not(.primary),
  .hero-link:not(.primary),
  .pager-btn:not(.primary) {
    background: linear-gradient(180deg, rgba(18, 24, 30, 0.92) 0%, rgba(10, 14, 19, 0.88) 100%);
    border-color: var(--border-dim);
    color: var(--text-dim);
  }
  .top-links a:not(.primary):hover,
  .hero-link:not(.primary):hover,
  .pager-btn:not(.primary):hover {
    color: var(--text-bright);
    border-color: rgba(255, 92, 76, 0.26);
  }
  .hero {
    margin-bottom: 28px;
  }
  .hero-tag,
  .panel-kicker,
  .card-meta,
  .endpoint-label,
  .subhead {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--red-bright);
  }
  .hero-tag {
    border: 1px solid var(--border);
    padding: 7px 14px;
    margin-bottom: 18px;
    background: rgba(12, 16, 21, 0.55);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }
  .hero h1 {
    margin: 0;
    font-family: var(--display);
    font-size: clamp(62px, 8vw, 132px);
    line-height: 0.9;
    letter-spacing: 1.8px;
    color: var(--text-bright);
  }
  .hero h1 span { color: var(--red-bright); }
  .hero-subtitle {
    margin: 16px 0 0;
    max-width: 920px;
    font-family: var(--mono);
    font-size: 14px;
    line-height: 1.8;
    color: var(--text-dim);
  }
  .hero-actions {
    margin-top: 24px;
  }
  .hero-chips,
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-top: 28px;
  }
  .chip,
  .metric-card,
  .kv,
  .meta-card {
    border: 1px solid var(--border-dim);
    background: linear-gradient(180deg, rgba(19, 25, 31, 0.94) 0%, rgba(10, 14, 19, 0.88) 100%);
    padding: 14px 16px;
    box-shadow: var(--shadow);
  }
  .chip strong,
  .metric-value {
    display: block;
    font-family: var(--display);
    font-size: 28px;
    letter-spacing: 1px;
    color: var(--text-bright);
    line-height: 0.95;
  }
  .chip span,
  .metric-title,
  .metric-sub,
  .panel-subtitle,
  .card p,
  .adv-item span,
  .meta-card p,
  .raw pre,
  .endpoint-code,
  .pager-label,
  .kv span,
  .kv strong,
  th,
  td,
  .empty {
    font-family: var(--mono);
  }
  .chip span,
  .metric-title,
  .metric-sub,
  .panel-subtitle,
  .meta-card p,
  .pager-label,
  .kv span,
  .empty {
    color: var(--text-dim);
    font-size: 11px;
    line-height: 1.6;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .surface,
  .panel,
  .raw-shell {
    position: relative;
    margin-top: 22px;
    border: 1px solid var(--border-dim);
    background: linear-gradient(180deg, rgba(19, 25, 31, 0.94) 0%, rgba(10, 14, 19, 0.88) 100%);
    padding: 22px;
    box-shadow: var(--shadow);
    backdrop-filter: blur(12px);
  }
  .surface-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .panel-title {
    margin: 10px 0 0;
    font-family: var(--display);
    font-size: 38px;
    letter-spacing: 1px;
    color: var(--text-bright);
  }
  .grid,
  .advanced-grid,
  .kv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }
  .card,
  .adv-item {
    display: block;
    min-height: 166px;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--border-dim);
    background: linear-gradient(180deg, rgba(20, 27, 34, 0.96), rgba(12, 17, 23, 0.94));
    padding: 18px 18px 16px;
    box-shadow: var(--shadow);
    transition:
      transform 180ms var(--ease),
      border-color 180ms var(--ease),
      box-shadow 180ms var(--ease);
  }
  .card:hover,
  .adv-item:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 92, 76, 0.3);
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.34);
  }
  .card h3,
  .adv-item strong {
    color: var(--text-bright);
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.4px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  .card p,
  .adv-item span,
  .kv strong {
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.6;
    letter-spacing: 0.2px;
    text-transform: none;
  }
  .card code,
  .endpoint-code,
  .mono-wrap {
    display: block;
    color: #d6e6f5;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    word-break: break-word;
  }
  .card-meta {
    margin-top: 18px;
  }
  .endpoint-ribbon {
    border: 1px solid var(--border-dim);
    background: linear-gradient(180deg, rgba(19, 25, 31, 0.94) 0%, rgba(10, 14, 19, 0.88) 100%);
    padding: 18px 20px;
    box-shadow: var(--shadow);
  }
  .endpoint-label {
    margin-bottom: 10px;
  }
  .meta-row,
  .pager {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .meta-pill,
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--border-dim);
    padding: 7px 10px;
    background: rgba(8, 11, 15, 0.68);
    color: var(--text-bright);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .metric-value.ari { color: var(--red-bright); }
  .metric-sub { margin-top: 8px; }
  .badge-good { color: #63d297; border-color: rgba(99, 210, 151, 0.35); background: rgba(99, 210, 151, 0.12); }
  .badge-warn { color: #f2b35d; border-color: rgba(242, 179, 93, 0.35); background: rgba(242, 179, 93, 0.12); }
  .badge-info { color: #7ab8ff; border-color: rgba(122, 184, 255, 0.35); background: rgba(122, 184, 255, 0.12); }
  .badge-neutral { color: #c7d5e3; border-color: rgba(199, 213, 227, 0.28); background: rgba(199, 213, 227, 0.1); }
  .kv strong {
    display: block;
    margin-top: 6px;
    color: var(--text-bright);
    word-break: break-word;
  }
  .subhead {
    margin-bottom: 12px;
  }
  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-dim);
    background: rgba(10, 14, 19, 0.52);
  }
  table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
  }
  th,
  td {
    border-bottom: 1px solid var(--border-dim);
    text-align: left;
    padding: 11px 12px;
    font-size: 12px;
  }
  th {
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-dim);
    background: rgba(14, 19, 24, 0.9);
  }
  td { color: var(--text); }
  .raw {
    border: 1px solid var(--border-dim);
    background: rgba(255, 255, 255, 0.02);
  }
  .raw summary {
    cursor: pointer;
    list-style: none;
    padding: 12px 14px;
    color: var(--text-bright);
    user-select: none;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .raw summary::-webkit-details-marker { display: none; }
  .raw pre {
    margin: 0;
    padding: 14px;
    border-top: 1px solid var(--border-dim);
    white-space: pre-wrap;
    word-break: break-word;
    color: #d6e6f5;
    font-size: 12px;
    line-height: 1.7;
    text-transform: none;
    letter-spacing: 0;
  }
  .pager-btn.disabled {
    opacity: 0.38;
    pointer-events: none;
  }
  .pager-label {
    color: var(--text-dim);
  }
  @keyframes pageLoopOrbit {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.03); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes pageLoopPulse {
    0%, 100% { opacity: 0.42; transform: scale(1); }
    50% { opacity: 0.72; transform: scale(1.04); }
  }
  @keyframes pageRingShift {
    0%, 100% { opacity: 0.18; transform: rotate(0deg) scale(0.98); }
    50% { opacity: 0.34; transform: rotate(8deg) scale(1.02); }
  }
  @keyframes pageGridDrift {
    0% { background-position: 0 0, 0 0, 0% 0%; }
    50% { background-position: 18px 26px, -18px -26px, 100% 0%; }
    100% { background-position: 36px 52px, -36px -52px, 200% 0%; }
  }
  @keyframes pageScanSweep {
    0% { transform: translateY(-120%); opacity: 0; }
    12% { opacity: 0.34; }
    45% { transform: translateY(130%); opacity: 0.12; }
    100% { transform: translateY(130%); opacity: 0; }
  }
  @media (max-width: 860px) {
    .api-shell {
      padding: 18px 14px 52px;
    }
    .top-nav {
      position: static;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .hero h1 {
      font-size: clamp(54px, 18vw, 92px);
    }
    .surface-head {
      flex-direction: column;
    }
  }
`;

function renderApiShell({ pageTitle, metaDescription, eyebrow, title, accent, subtitle, chips = [], bodyHtml, base }) {
  const chipHtml = chips.length
    ? `<div class="hero-chips">${chips
        .map(
          (chip) => `<div class="chip">
            <strong>${escapeHtml(chip.title)}</strong>
            <span>${escapeHtml(chip.copy)}</span>
          </div>`
        )
        .join('')}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>${API_SHELL_STYLES}</style>
</head>
<body>
  <div class="page-loop" aria-hidden="true"></div>
  <div class="page-grid-loop" aria-hidden="true"></div>
  <div class="page-scanline" aria-hidden="true"></div>

  <main class="api-shell">
    <nav class="top-nav">
      <a class="brand" href="https://ares-protocol.xyz/">ARES<span>Protocol API Hub</span></a>
      <div class="top-links">
        <a href="https://ares-protocol.xyz/">Landing</a>
        <a href="https://ares-protocol.xyz/docs/">Docs</a>
        <a class="primary" href="https://app.ares-protocol.xyz/">Explorer</a>
      </div>
    </nav>

    <section class="hero">
      <div class="hero-tag">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}${accent ? ` <span>${escapeHtml(accent)}</span>` : ''}</h1>
      <p class="hero-subtitle">${escapeHtml(subtitle)}</p>
      <div class="hero-actions">
        <a class="hero-link primary" href="${escapeHtml(base)}/">API Home</a>
        <a class="hero-link" href="https://ares-protocol.xyz/docs/">Read Docs</a>
        <a class="hero-link" href="https://app.ares-protocol.xyz/">Open Explorer</a>
      </div>
      ${chipHtml}
    </section>

    ${bodyHtml}
  </main>
</body>
</html>`;
}

function renderPayloadPage(request, { title, description, endpointPath, payload }) {
  const base = getBaseUrlFromRequest(request);
  const endpointUrl = `${base}${endpointTemplate(endpointPath)}`;
  const endpointUrlEscaped = escapeHtml(endpointUrl);
  const json = escapeHtml(JSON.stringify(payload, null, 2));
  const kind = endpointKind(endpointPath);
  const details = renderDetails(kind, payload);
  let actionsPager = '';
  if (kind === 'actions' && payload?.pagination) {
    const currentUrl = new URL(`${base}${endpointPath}`);
    const page = Number(payload.pagination.page || 1);
    const hasPrev = Boolean(payload.pagination.hasPrev);
    const hasNext = Boolean(payload.pagination.hasNext);
    const prevUrl = hasPrev
      ? (() => {
          const u = new URL(currentUrl.toString());
          u.searchParams.set('page', String(payload.pagination.prevPage || (page - 1)));
          return u.toString();
        })()
      : '';
    const nextUrl = hasNext
      ? (() => {
          const u = new URL(currentUrl.toString());
          u.searchParams.set('page', String(payload.pagination.nextPage || (page + 1)));
          return u.toString();
        })()
      : '';
    actionsPager = `<div class="surface"><div class="pager">
      ${hasPrev ? `<a class="pager-btn primary" href="${escapeHtml(prevUrl)}">Prev</a>` : '<span class="pager-btn disabled">Prev</span>'}
      <span class="pager-label">Page ${text(payload.pagination.page)} / ${text(payload.pagination.totalPages)}</span>
      ${hasNext ? `<a class="pager-btn primary" href="${escapeHtml(nextUrl)}">Next</a>` : '<span class="pager-btn disabled">Next</span>'}
    </div></div>`;
  }

  return renderApiShell({
    pageTitle: `ARES API - ${title}`,
    metaDescription: `ARES API endpoint response view for ${title}.`,
    eyebrow: 'ARES API Response',
    title,
    accent: 'RESPONSE',
    subtitle: description,
    chips: [
      { title: 'Endpoint', copy: endpointPath },
      { title: 'Format', copy: 'HTML shell over canonical JSON payload' },
      { title: 'Runtime', copy: `Kind: ${kind || 'generic'} · Base route: ${base}` }
    ],
    base,
    bodyHtml: `
      <section class="endpoint-ribbon">
        <div class="endpoint-label">Endpoint</div>
        <code class="endpoint-code">${endpointUrlEscaped}</code>
        <div class="meta-row" style="margin-top:14px">
          <span class="meta-pill">HTML inspector</span>
          <span class="meta-pill">Canonical JSON below</span>
          <span class="meta-pill">No hero asset</span>
        </div>
      </section>

      ${actionsPager}
      ${details}

      <section class="raw-shell">
        <details class="raw">
          <summary>Raw JSON</summary>
          <pre>${json}</pre>
        </details>
      </section>
    `
  });
}

function renderApiLanding(request) {
  const base = getBaseUrlFromRequest(request);
  const demoRef = 'demo-1';

  return renderApiShell({
    pageTitle: 'ARES API Gateway',
    metaDescription: 'ARES Protocol API gateway on Base with reputation query endpoints.',
    eyebrow: 'ARES API Gateway',
    title: 'API',
    accent: 'HUB',
    subtitle: 'Production gateway for ARES reputation queries on Base. Same premium shell as the landing and docs surfaces, but without any hero media asset.',
    chips: [
      { title: 'REST', copy: 'Direct JSON endpoints with HTML inspector views' },
      { title: 'Realtime', copy: 'Live SSE action stream for explorer surfaces' },
      { title: 'Docs', copy: 'Canonical integration and governance references' }
    ],
    base,
    bodyHtml: `
      <section class="surface">
        <div class="surface-head">
          <div>
            <div class="panel-kicker">Primary endpoints</div>
            <h2 class="panel-title">Query the trust surface</h2>
          </div>
          <p class="panel-subtitle">
            Use the live endpoints below for health, agent resolution, leaderboard views, and indexed action history.
          </p>
        </div>

        <div class="grid">
          <a class="card" href="${base}/v1/health">
            <h3>Health & Status</h3>
            <p>Gateway health, service timestamp, and uptime confirmation.</p>
            <code>${base}/v1/health</code>
            <div class="card-meta">Status</div>
          </a>
          <a class="card" href="${base}/v1/agent/${demoRef}">
            <h3>Agent Profile</h3>
            <p>Primary endpoint for registry state, ARI, actions, and disputes.</p>
            <code>${base}/v1/agent/${demoRef}</code>
            <div class="card-meta">Agent</div>
          </a>
          <a class="card" href="${base}/v1/agents?limit=100">
            <h3>Leaderboard</h3>
            <p>Ranked agents by ARI with tier and dispute filters.</p>
            <code>${base}/v1/agents?limit=100</code>
            <div class="card-meta">Ranking</div>
          </a>
          <a class="card" href="${base}/v1/history?limit=20&page=1">
            <h3>Actions Feed</h3>
            <p>Paginated indexed action history for explorer and analytics.</p>
            <code>${base}/v1/history?limit=20&page=1</code>
            <div class="card-meta">History</div>
          </a>
        </div>
      </section>

      <section class="surface">
        <div class="surface-head">
          <div>
            <div class="panel-kicker">Advanced routes</div>
            <h2 class="panel-title">Auth, score, and stream controls</h2>
          </div>
          <p class="panel-subtitle">
            Shortcuts for score lookups, auth challenge flow, paid access state, token summary, and realtime subscription.
          </p>
        </div>

        <div class="advanced-grid">
          <a class="adv-item" href="${base}/v1/score/${demoRef}">
            <strong>Score Shortcut</strong>
            <span>Quick ARI response for a single agent.</span>
          </a>
          <a class="adv-item" href="${base}/v1/tokenomics/summary">
            <strong>Tokenomics Summary</strong>
            <span>Seed cap, allocation, and policy snapshot.</span>
          </a>
          <a class="adv-item" href="${base}/v1/stream/actions">
            <strong>Realtime Stream (SSE)</strong>
            <span>Live action stream for dashboards and monitoring.</span>
          </a>
          <a class="adv-item" href="${base}/v1/access/${demoRef}">
            <strong>Access Status</strong>
            <span>Checks paid access state for an account.</span>
          </a>
          <a class="adv-item" href="${base}/v1/auth/challenge?account=${demoRef}">
            <strong>Auth Challenge</strong>
            <span>Generates nonce challenge for API auth flow.</span>
          </a>
          <a class="adv-item" href="https://ares-protocol.xyz/docs/integration-guide.md">
            <strong>Integration Guide</strong>
            <span>Solidity interface, REST recipes, and integration patterns.</span>
          </a>
        </div>
      </section>

      <section class="surface">
        <div class="surface-head">
          <div>
            <div class="panel-kicker">Gateway notes</div>
            <h2 class="panel-title">Runtime and environment</h2>
          </div>
          <p class="panel-subtitle">
            Canonical base URL, current network target, and supporting documentation links.
          </p>
        </div>

        <div class="kv-grid">
          <div class="kv">
            <span>Base URL</span>
            <strong>${base}</strong>
          </div>
          <div class="kv">
            <span>Network target</span>
            <strong>Base Sepolia for the current demo and verification environment</strong>
          </div>
          <div class="kv">
            <span>Canonical docs</span>
            <strong>https://ares-protocol.xyz/docs/</strong>
          </div>
        </div>
      </section>
    `
  });
}

function rateLimit(ip, bucket = 'waitlist', max = 10, windowMs = 60_000) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const data = waitlistRate.get(key) || [];
  const alive = data.filter((ts) => now - ts < windowMs);
  if (alive.length >= max) return false;
  alive.push(now);
  waitlistRate.set(key, alive);
  return true;
}

function ensurePaid(request) {
  const bearer = request.headers.authorization;
  if (!bearer?.startsWith('Bearer ')) return false;
  const token = bearer.slice(7);
  const record = authTokens.get(token);
  if (!record || record.expiresAt < Date.now()) return false;
  return true;
}

app.get('/', async (request, reply) => {
  if (!EXPOSE_API_HUB_ROOT) {
    return reply.redirect('https://app.ares-protocol.xyz/?tab=leaderboard', 302);
  }
  return reply.type('text/html; charset=utf-8').send(renderApiLanding(request));
});

app.get('/v1/health', async (request, reply) => {
  const payload = { ok: true, service: 'query-gateway', ts: new Date().toISOString() };
  if (wantsHtml(request)) {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Health',
          description: 'Service status and server timestamp.',
          endpointPath: '/v1/health',
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/tokenomics/summary', async (request, reply) => {
  const payload = TOKENOMICS_SUMMARY;
  if (wantsHtml(request)) {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Tokenomics Summary',
          description: 'Read-only snapshot for seed cap, allocation, and APY policy messaging.',
          endpointPath: '/v1/tokenomics/summary',
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/score/:agentAddress', async (request, reply) => {
  const { aliasFromAddress, agentAddress, goldskyAgent } = resolveAgentRequest(request.params.agentAddress);
  if (aliasFromAddress && wantsHtml(request)) {
    return reply.redirect(`/v1/score/${aliasFromAddress}`);
  }
  const localAgent = getAgent(agentAddress);
  let payload = null;
  if (goldskyAgent) {
    payload = {
      agentId: goldskyAgent.agentId,
      agentIdHex: goldskyAgent.agentIdHex,
      ari: goldskyAgent.ari,
      tier: goldskyAgent.tier,
      actions: goldskyAgent.actionsCount,
      since: goldskyAgent.since
    };
  } else if (localAgent) {
    const score = computeAri(localAgent.actions || []);
    payload = {
      agentId: String(localAgent.agentId),
      agentIdHex: `0x${BigInt(localAgent.agentId).toString(16)}`,
      ari: score.ari,
      tier: score.tier,
      actions: score.actions,
      since: score.since
    };
  } else {
    payload = await getScoreFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, agentAddress);
  }

  if (!payload) {
    payload = {
      agentId: '0',
      agentIdHex: '0x0',
      ari: 0,
      tier: 'UNVERIFIED',
      actions: 0,
      since: null
    };
  }

  if (wantsHtml(request)) {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Score by Agent Address',
          description: 'Canonical ID and ARI response for a single agent address.',
          endpointPath: `/v1/score/${agentAddress}`,
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/agent/:agentAddress', async (request, reply) => {
  const { aliasFromAddress, agentAddress, goldskyAgent } = resolveAgentRequest(request.params.agentAddress);
  if (aliasFromAddress && wantsHtml(request)) {
    return reply.redirect(`/v1/agent/${aliasFromAddress}`);
  }
  const localAgent = getAgent(agentAddress);
  let payload = null;
  if (goldskyAgent) {
    payload = {
      ...goldskyAgent,
      actions: goldskyAgent.actions.slice(0, 20),
      disputes: goldskyAgent.disputes.slice(0, 20)
    };
  } else if (localAgent) {
    const score = computeAri(localAgent.actions || []);
    payload = {
      found: true,
      address: localAgent.address,
      agentId: String(localAgent.agentId),
      agentIdHex: `0x${BigInt(localAgent.agentId).toString(16)}`,
      operator: localAgent.operator,
      registeredAt: localAgent.registeredAt,
      ari: score.ari,
      tier: score.tier,
      since: score.since,
      actionsCount: score.actions,
      actions: (localAgent.actions || []).slice(-20).reverse(),
      disputes: (localAgent.disputes || []).slice(-20).reverse()
    };
  } else {
    payload = await getAgentFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, agentAddress);
  }

  if (!payload) {
    payload = { found: false };
  }

  if (wantsHtml(request)) {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Agent Details',
          description: 'Registry, score, actions, and dispute-aware details for one agent.',
          endpointPath: `/v1/agent/${agentAddress}`,
          payload
        })
      );
  }
  return payload;
});

async function handleLeaderboard(request, reply) {
  const limit = Math.max(1, Math.min(100, Number(request.query.limit || 20)));
  const cursor = Math.max(0, Number(request.query.cursor || 0));
  const tierFilter = request.query.tier ? String(request.query.tier).toUpperCase() : null;
  const hasDisputeFilter = parseBoolFlag(request.query.hasDispute);
  const actionBucket = normalizeActionBucket(request.query.actionBucket);
  const goldsky = loadGoldskyProjection();
  const fromSubgraph = goldsky.agents.length > 0
    ? null
    : await getLeaderboardFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, {
        limit,
        tier: tierFilter
      });

  // Prefer Goldsky-ingested logs when present to avoid blocking on subgraph
  // timeouts, then fall back to the subgraph, then local demo store.
  let items = [];
  if (goldsky.agents.length > 0) {
    items = goldsky.agents.map((agent) => ({
      address: agent.address,
      agentId: agent.agentId,
      agentIdHex: agent.agentIdHex,
      ari: agent.ari,
      tier: agent.tier,
      actions: agent.actionsCount,
      since: agent.since,
      disputes: agent.disputes.length,
      hasDispute: agent.disputes.length > 0
    }));
  } else if (fromSubgraph && fromSubgraph.length > 0) {
    items = fromSubgraph.map((row) => ({
      ...row,
      disputes: row.disputes || 0,
      hasDispute: Boolean(row.hasDispute)
    }));
  } else {
    const localAgents = listAgents();
    items = localAgents.map((agent) => {
      const score = computeAri(agent.actions || []);
      return {
        address: agent.address,
        agentId: String(agent.agentId),
        agentIdHex: asAgentHex(agent.agentId),
        ari: score.ari,
        tier: score.tier,
        actions: score.actions,
        since: score.since,
        disputes: Array.isArray(agent.disputes) ? agent.disputes.length : 0,
        hasDispute: Array.isArray(agent.disputes) && agent.disputes.length > 0
      };
    });
  }

  let filteredItems = items;
  if (tierFilter) filteredItems = filteredItems.filter((r) => String(r.tier || '').toUpperCase() === tierFilter);
  if (hasDisputeFilter !== null) filteredItems = filteredItems.filter((r) => Boolean(r.hasDispute) === hasDisputeFilter);
  if (actionBucket) filteredItems = filteredItems.filter((r) => actionMatchesBucket(r.actions, actionBucket));
  filteredItems.sort((a, b) => Number(b.ari || 0) - Number(a.ari || 0));
  const pagedItems = filteredItems.slice(cursor, cursor + limit);
  const payload = {
    items: pagedItems,
    nextCursor: filteredItems.length > cursor + limit ? cursor + limit : null
  };
  if (wantsHtml(request)) {
    const routePath = request.routeOptions?.url || '/v1/leaderboard';
    const endpointBase = routePath === '/v1/agents' ? '/v1/agents' : '/v1/leaderboard';
    const qp = new URLSearchParams();
    qp.set('limit', String(limit));
    if (cursor > 0) qp.set('cursor', String(cursor));
    if (tierFilter) qp.set('tier', tierFilter);
    if (hasDisputeFilter !== null) qp.set('hasDispute', String(hasDisputeFilter));
    if (actionBucket) qp.set('actionBucket', actionBucket);
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Leaderboard',
          description: 'Top agents ranked by ARI with tier/dispute/action filters.',
          endpointPath: `${endpointBase}?${qp.toString()}`,
          payload
        })
      );
  }
  return payload;
}

app.get('/v1/leaderboard', handleLeaderboard);
app.get('/v1/agents', handleLeaderboard);

async function handleActions(request, reply) {
  const agentRef = request.query.agent ? String(request.query.agent).toLowerCase() : '';
  const agent = agentRef ? resolveAgentRequest(agentRef).agentAddress : '';
  const limit = Math.max(1, Math.min(100, Number(request.query.limit || 20)));
  const page = Math.max(0, Number(request.query.page || 0));
  const hasPageMode = page > 0;
  const cursor = request.query.cursor ? String(request.query.cursor) : null;
  const bucket = normalizeActionBucket(request.query.actionBucket);
  const onlyDisputed = parseBoolFlag(request.query.onlyDisputed);

  const goldsky = loadGoldskyProjection();
  const goldskyRows = agent
    ? goldsky.actions.filter((row) => row.address === agent)
    : goldsky.actions;
  const subgraphRows = goldskyRows.length > 0
    ? null
    : await getActionsFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, {
        agentAddress: agent
      });

  let enriched = [];
  if (goldskyRows.length > 0) {
    enriched = goldskyRows.map((row) => ({ ...row }));
  } else if (subgraphRows && subgraphRows.length > 0) {
    enriched = subgraphRows.map((row, idx) => ({
      ...row,
      seq: subgraphRows.length - idx
    }));
  } else {
    const allRows = hasPageMode ? listActionsRows({ agentAddress: agent }) : null;
    const cursorRows = hasPageMode
      ? null
      : listActions({ agentAddress: agent, limit: Math.min(limit * 3, 100), cursor });
    const items = hasPageMode ? allRows : cursorRows.items;
    const agents = listAgents();
    const agentMap = new Map();
    for (const entry of agents) {
      const score = computeAri(entry.actions || []);
      const disputes = Array.isArray(entry.disputes) ? entry.disputes : [];
      agentMap.set(entry.address.toLowerCase(), {
        agentId: String(entry.agentId),
        agentIdHex: asAgentHex(entry.agentId),
        ari: score.ari,
        tier: score.tier,
        actions: score.actions,
        disputedActionIds: new Set(disputes.map((d) => String(d.actionId)))
      });
    }

    enriched = items.map((row) => {
      const summary = agentMap.get(row.address) || {
        agentId: row.agentId,
        agentIdHex: asAgentHex(row.agentId),
        ari: 0,
        tier: 'UNVERIFIED',
        actions: 0,
        disputedActionIds: new Set()
      };
      return {
        ...row,
        agentIdHex: summary.agentIdHex,
        ari: summary.ari,
        tier: summary.tier,
        actionsCount: summary.actions,
        isDisputed: summary.disputedActionIds.has(String(row.actionId))
      };
    });
  }

  if (bucket) enriched = enriched.filter((row) => actionMatchesBucket(row.actionsCount, bucket));
  if (onlyDisputed !== null) enriched = enriched.filter((row) => Boolean(row.isDisputed) === onlyDisputed);

  if (!hasPageMode && cursor) {
    const c = Number(cursor);
    if (Number.isFinite(c) && c > 0) {
      enriched = enriched.filter((r) => Number(r.seq || 0) < c);
    }
  }

  let payload = null;
  if (hasPageMode) {
    const totalItems = enriched.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * limit;
    const pageItems = enriched.slice(start, start + limit);
    payload = {
      items: pageItems,
      nextCursor: null,
      pagination: {
        page: safePage,
        pageSize: limit,
        totalItems,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
        prevPage: safePage > 1 ? safePage - 1 : null,
        nextPage: safePage < totalPages ? safePage + 1 : null
      }
    };
  } else {
    const pageItems = enriched.slice(0, limit);
    const computedNextCursor = enriched.length > limit
      ? String(pageItems[pageItems.length - 1].seq)
      : null;
    payload = { items: pageItems, nextCursor: computedNextCursor };
  }

  if (wantsHtml(request)) {
    const routePath = request.routeOptions?.url || '/v1/actions';
    const endpointBase = routePath === '/v1/history' ? '/v1/history' : '/v1/actions';
    const qp = new URLSearchParams();
    if (agent) qp.set('agent', agent);
    qp.set('limit', String(limit));
    if (hasPageMode) qp.set('page', String(page));
    if (cursor) qp.set('cursor', cursor);
    if (bucket) qp.set('actionBucket', bucket);
    if (onlyDisputed !== null) qp.set('onlyDisputed', String(onlyDisputed));
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Actions',
          description: 'Paginated action feed with live-friendly metadata.',
          endpointPath: `${endpointBase}?${qp.toString()}`,
          payload
        })
      );
  }
  return payload;
}

app.get('/v1/actions', handleActions);
app.get('/v1/history', handleActions);

app.get('/v1/stream/actions', async (request, reply) => {
  const agentRef = request.query.agent ? String(request.query.agent).toLowerCase() : '';
  const filterAddress = agentRef ? resolveDemoAccount(agentRef) : '';
  const sseCorsOrigin = resolveSseCorsOrigin(request.headers.origin);
  if (sseCorsOrigin === false) {
    return reply.code(403).send({ error: 'origin not allowed' });
  }
  if (streamClients.size >= MAX_STREAM_CLIENTS) {
    return reply.code(503).send({ error: 'stream capacity reached' });
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  };
  if (sseCorsOrigin) {
    headers['Access-Control-Allow-Origin'] = sseCorsOrigin;
    headers.Vary = 'Origin';
  }

  reply.raw.writeHead(200, headers);
  reply.raw.write('retry: 5000\n\n');

  const client = { raw: reply.raw, filterAddress };
  streamClients.add(client);
  writeSseEvent(client, 'ready', { ok: true, ts: new Date().toISOString(), filterAddress: filterAddress || null });

  const keepAlive = setInterval(() => {
    if (reply.raw.destroyed || reply.raw.writableEnded) return;
    writeSseEvent(client, 'heartbeat', { ok: true, ts: new Date().toISOString() });
  }, 15000);
  const timeout = setTimeout(() => {
    if (!reply.raw.destroyed && !reply.raw.writableEnded) {
      reply.raw.end();
    }
  }, STREAM_MAX_MS);

  const cleanup = () => {
    clearInterval(keepAlive);
    clearTimeout(timeout);
    streamClients.delete(client);
  };

  request.raw.on('close', cleanup);
  reply.raw.on('close', cleanup);
});

app.get('/v1/access/:account', async (request, reply) => {
  const accountRef = String(request.params.account || '').toLowerCase();
  const aliasFromAddress = demoAliasOf(accountRef);
  if (aliasFromAddress && wantsHtml(request)) {
    return reply.redirect(`/v1/access/${aliasFromAddress}`);
  }
  const account = resolveDemoAccount(accountRef);
  if (!/^0x[a-f0-9]{40}$/.test(account)) {
    const payload = { account, hasAccess: false, expiresAt: null, sessionActive: false, onChain: { enabled: false, error: true } };
    if (wantsHtml(request)) {
      return reply
        .type('text/html; charset=utf-8')
        .send(
          renderPayloadPage(request, {
            title: 'Access Status',
            description: 'Paid access eligibility and active auth session status.',
            endpointPath: `/v1/access/${account}`,
            payload
          })
        );
    }
    return payload;
  }

  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : '';
  const record = token ? authTokens.get(token) : null;
  const hasSession = Boolean(record && record.account === account && record.expiresAt > Date.now());

  let onChain = { enabled: false, hasAccess: true, expiryMs: null };
  try {
    onChain = await accessChecker.check(account);
  } catch (error) {
    request.log.error({ err: error }, 'access status check failed');
    const payload = {
      account,
      hasAccess: false,
      expiresAt: null,
      sessionActive: hasSession,
      onChain: { enabled: true, error: true }
    };
    if (wantsHtml(request)) {
      return reply
        .type('text/html; charset=utf-8')
        .send(
          renderPayloadPage(request, {
            title: 'Access Status',
            description: 'Paid access eligibility and active auth session status.',
            endpointPath: `/v1/access/${account}`,
            payload
          })
        );
    }
    return payload;
  }

  const hasAccess = hasSession && (!onChain.enabled || onChain.hasAccess);
  const payload = {
    account,
    hasAccess,
    expiresAt: hasAccess ? record.expiresAt : null,
    sessionActive: hasSession,
    onChain: {
      enabled: onChain.enabled,
      hasAccess: onChain.hasAccess,
      expiry: onChain.expiryMs ? new Date(onChain.expiryMs).toISOString() : null
    }
  };
  if (wantsHtml(request)) {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Access Status',
          description: 'Paid access eligibility and active auth session status.',
          endpointPath: `/v1/access/${account}`,
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/auth/challenge', async (request, reply) => {
  const accountRef = String(request.query.account || '').toLowerCase();
  const aliasFromAddress = demoAliasOf(accountRef);
  if (aliasFromAddress && wantsHtml(request)) {
    return reply.redirect(`/v1/auth/challenge?account=${aliasFromAddress}`);
  }
  const account = resolveDemoAccount(accountRef);
  if (!/^0x[a-f0-9]{40}$/.test(account)) {
    const payload = { error: 'invalid account' };
    if (wantsHtml(request)) {
      return reply
        .code(400)
        .type('text/html; charset=utf-8')
        .send(
          renderPayloadPage(request, {
            title: 'Auth Challenge',
            description: 'Nonce challenge payload for API access authentication.',
            endpointPath: '/v1/auth/challenge',
            payload
          })
        );
    }
    return reply.code(400).send(payload);
  }

  if (!rateLimit(request.ip, 'auth', 30, 60_000)) {
    const payload = { error: 'rate limited' };
    if (wantsHtml(request)) {
      return reply
        .code(429)
        .type('text/html; charset=utf-8')
        .send(
          renderPayloadPage(request, {
            title: 'Auth Challenge',
            description: 'Nonce challenge payload for API access authentication.',
            endpointPath: `/v1/auth/challenge?account=${account}`,
            payload
          })
        );
    }
    return reply.code(429).send(payload);
  }

  const nonce = randomNonce();
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const message = buildChallenge(account, nonce, expiresAt);

  challengeStmt.run(account, nonce, expiresAt, new Date().toISOString());

  const payload = { account, nonce, expiresAt, message, ttlMs: NONCE_TTL_MS };
  if (wantsHtml(request)) {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Auth Challenge',
          description: 'Nonce challenge payload for API access authentication.',
          endpointPath: `/v1/auth/challenge?account=${account}`,
          payload
        })
      );
  }
  return payload;
});

app.post('/v1/auth/verify', async (request, reply) => {
  const schema = z.object({
    account: z.string(),
    signature: z.string(),
    nonce: z.string()
  });
  const parsed = schema.safeParse(request.body || {});
  if (!parsed.success) {
    return reply.code(400).send({ error: 'invalid body' });
  }

  const account = parsed.data.account.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(account)) {
    return reply.code(400).send({ error: 'invalid account' });
  }
  const row = findNonceStmt.get(account);
  if (!row || row.used) {
    return reply.code(400).send({ error: 'nonce missing or used' });
  }
  if (row.nonce !== parsed.data.nonce) {
    return reply.code(400).send({ error: 'nonce mismatch' });
  }
  if (Date.now() > Number(row.expires_at)) {
    return reply.code(400).send({ error: 'nonce expired' });
  }

  const message = buildChallenge(account, row.nonce, Number(row.expires_at));
  const ok = await verifySignature({ account, message, signature: parsed.data.signature });
  if (!ok) {
    return reply.code(401).send({ error: 'invalid signature' });
  }

  let access;
  try {
    access = await accessChecker.check(account);
  } catch (error) {
    request.log.error({ err: error }, 'on-chain access check failed');
    return reply.code(503).send({ error: 'access check unavailable' });
  }

  if (access.enabled && !access.hasAccess) {
    return reply.code(402).send({
      error: 'paid access required',
      accessExpiry: access.expiryMs ? new Date(access.expiryMs).toISOString() : null
    });
  }

  consumeNonceStmt.run(account, row.nonce);

  const token = randomNonce() + randomNonce();
  let expiry = Date.now() + SESSION_TTL_MS;
  if (access?.enabled && access.expiryMs) {
    expiry = Math.min(expiry, access.expiryMs);
  }
  if (expiry <= Date.now()) {
    return reply.code(402).send({ error: 'paid access expired' });
  }
  authTokens.set(token, { account, expiresAt: expiry });

  return { ok: true, token, expiresAt: expiry };
});

app.post('/v1/waitlist', async (request, reply) => {
  const schema = z.object({
    email: z.string().email(),
    lang: z.string().default('en'),
    source: z.string().default('landing'),
    tier_intent: z.enum(['tier1', 'tier2', 'tier3']).optional().default('tier1'),
    has_testnet_agent: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((value) => {
        if (typeof value === 'boolean') return value;
        const normalized = String(value || '').toLowerCase().trim();
        return ['1', 'true', 'yes', 'on'].includes(normalized);
      })
      .default(false),
    partner_ref: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => {
        if (value === undefined) return null;
        return value.length ? value : null;
      }),
    website: z.string().optional().default('')
  });

  const parsed = schema.safeParse(request.body || {});
  if (!parsed.success) {
    return reply.code(400).send({ ok: false, error: 'invalid payload' });
  }

  if (parsed.data.website.trim() !== '') {
    return reply.code(400).send({ ok: false, error: 'spam detected' });
  }

  if (!rateLimit(request.ip, 'waitlist', 5, 60_000)) {
    return reply.code(429).send({ ok: false, error: 'rate limited' });
  }

  insertWaitlistStmt.run(
    parsed.data.email.toLowerCase(),
    parsed.data.lang,
    parsed.data.source,
    parsed.data.tier_intent,
    parsed.data.has_testnet_agent ? 1 : 0,
    parsed.data.partner_ref,
    new Date().toISOString()
  );
  return { ok: true, assignedTierPreview: parsed.data.tier_intent ?? null };
});

app.post('/v1/indexer/goldsky/raw-logs', { config: { rawBody: true } }, async (request, reply) => {
  const token = String(request.query?.token || '');
  const timestampHeader = String(request.headers['x-ares-timestamp'] || '');
  const signatureHeader = String(request.headers['x-ares-signature'] || '');
  const rawPayload = typeof request.rawBody === 'string'
    ? request.rawBody
    : JSON.stringify(request.body || {});

  let authUsed = '';
  if (GOLDSKY_WEBHOOK_AUTH_MODE === 'token') {
    if (!GOLDSKY_WEBHOOK_TOKEN || token !== GOLDSKY_WEBHOOK_TOKEN) {
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    }
    authUsed = 'token';
  } else {
    const hmacCheck = verifyGoldskyHmac({ timestampHeader, signatureHeader, rawPayload });
    if (hmacCheck.ok) {
      const unique = registerWebhookReplay('goldsky-raw-logs', hmacCheck.digest);
      if (!unique) {
        return reply.code(409).send({ ok: false, error: 'replay detected' });
      }
      authUsed = 'hmac';
    } else if (GOLDSKY_WEBHOOK_AUTH_MODE === 'hmac') {
      request.log.warn({ reason: hmacCheck.reason }, 'goldsky webhook rejected (hmac mode)');
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    } else {
      if (!GOLDSKY_WEBHOOK_TOKEN || token !== GOLDSKY_WEBHOOK_TOKEN) {
        request.log.warn({ reason: hmacCheck.reason }, 'goldsky webhook rejected (dual mode)');
        return reply.code(401).send({ ok: false, error: 'unauthorized' });
      }
      authUsed = 'token';
    }
  }
  request.log.info({ authMode: GOLDSKY_WEBHOOK_AUTH_MODE, authUsed }, 'goldsky webhook authorized');

  const body = request.body || {};
  const records = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.records)
      ? body.records
      : Array.isArray(body)
        ? body
        : [body];

  let inserted = 0;
  db.exec('BEGIN');
  try {
    for (const row of records) {
      const topic0 = Array.isArray(row?.topics) ? row.topics[0] || null : row?.topic0 || null;
      const address = row?.address ? String(row.address).toLowerCase() : null;
      const blockNumber = Number(row?.block_number ?? row?.blockNumber ?? row?.block_num ?? 0) || null;
      insertGoldskyIngestStmt.run(
        'goldsky-raw-logs',
        topic0,
        address,
        blockNumber,
        JSON.stringify(row),
        new Date().toISOString()
      );
      inserted += 1;
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { ok: true, inserted };
});

if (ENABLE_INTERNAL_DEMO) {
  app.post('/internal/demo/seed', async (request, reply) => {
    if (!ensurePaid(request) && process.env.ALLOW_UNAUTH_SEED !== 'true') {
      return reply.code(401).send({ error: 'auth required' });
    }

    seedDemo(request.body || {});
    return { ok: true, meta: getMeta() };
  });

  app.post('/internal/demo/reset', async (request, reply) => {
    if (!ensurePaid(request) && process.env.ALLOW_UNAUTH_SEED !== 'true') {
      return reply.code(401).send({ error: 'auth required' });
    }
    resetState();
    return { ok: true, meta: getMeta() };
  });

  app.get('/internal/demo/meta', async () => {
    return { ok: true, meta: getMeta() };
  });

  app.post('/internal/demo/action', async (request, reply) => {
    const schema = z.object({
      address: z.string(),
      actionId: z.string(),
      scores: z.array(z.number()).length(5),
      timestamp: z.string(),
      status: z.enum(['VALID', 'INVALID']).optional(),
      source: z.string().optional()
    });

    const parsed = schema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid payload' });
    }

    const addr = parsed.data.address.toLowerCase();
    if (!getAgent(addr)) {
      upsertAgent({
        address: addr,
        operator: addr,
        agentId: listAgents().length + 1,
        registeredAt: new Date().toISOString()
      });
    }

    const inserted = addAction(addr, {
      actionId: parsed.data.actionId,
      scores: parsed.data.scores,
      timestamp: parsed.data.timestamp,
      status: parsed.data.status || 'VALID',
      source: parsed.data.source || 'scoring-service'
    });

    const score = computeAri(getAgent(addr)?.actions || []);
    publishActionEvent({
      address: addr,
      agentId: inserted.agentId,
      agentIdHex: asAgentHex(inserted.agentId),
      actionId: inserted.action.actionId,
      scores: inserted.action.scores,
      status: inserted.action.status,
      timestamp: inserted.action.timestamp,
      seq: inserted.action.seq,
      ari: score.ari,
      tier: score.tier,
      actionsCount: score.actions,
      source: inserted.action.source
    });

    return { ok: true, action: inserted.action, meta: getMeta() };
  });

  app.post('/internal/demo/dispute', async (request, reply) => {
    if (!ensurePaid(request) && process.env.ALLOW_UNAUTH_SEED !== 'true') {
      return reply.code(401).send({ error: 'auth required' });
    }
    const schema = z.object({
      address: z.string(),
      actionId: z.string(),
      accepted: z.boolean(),
      reason: z.string().optional()
    });
    const parsed = schema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid payload' });
    }
    const address = parsed.data.address.toLowerCase();
    const record = addDispute(address, {
      actionId: parsed.data.actionId,
      accepted: parsed.data.accepted,
      reason: parsed.data.reason || 'demo-dispute'
    });
    return { ok: true, dispute: record, meta: getMeta() };
  });

  app.post('/internal/demo/generate', async (request, reply) => {
    if (!ensurePaid(request) && process.env.ALLOW_UNAUTH_SEED !== 'true') {
      return reply.code(401).send({ error: 'auth required' });
    }
    const schema = z.object({
      agents: z.number().int().min(1).max(100).default(25),
      actions: z.number().int().min(1).max(1000).default(250),
      disputes: z.number().int().min(0).max(100).default(12),
      reset: z.boolean().default(true)
    });
    const parsed = schema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid payload' });
    }
    const { agents: agentCount, actions: actionCount, disputes: disputeCount, reset } = parsed.data;
    if (reset) resetState();

    const startTs = Date.now() - actionCount * 60_000;
    const generatedAgents = [];
    for (let i = 1; i <= agentCount; i++) {
      const addr = `0x${i.toString(16).padStart(40, '0')}`;
      generatedAgents.push({
        address: addr,
        operator: addr,
        agentId: i,
        registeredAt: new Date(startTs - i * 30_000).toISOString(),
        actions: [],
        disputes: []
      });
    }
    seedDemo({ agents: generatedAgents, actions: [], disputes: [] });

    const actionRefs = [];
    for (let i = 0; i < actionCount; i++) {
      const agent = generatedAgents[i % generatedAgents.length];
      const base = 95 + (i % 80);
      const action = addAction(agent.address, {
        actionId: `demo-action-${String(i + 1).padStart(4, '0')}`,
        scores: [base, base - 4, base - 8, base - 12, base - 16],
        timestamp: new Date(startTs + i * 60_000).toISOString(),
        source: 'demo-generator',
        status: 'VALID'
      });
      actionRefs.push({ address: agent.address, actionId: action.action.actionId });
    }

    const disputeTargets = actionRefs.filter((_, idx) => idx % 7 === 0).slice(0, Math.max(disputeCount, 1));
    for (let i = 0; i < Math.min(disputeCount, disputeTargets.length); i++) {
      const target = disputeTargets[i];
      const accepted = i % 2 === 0;
      addDispute(target.address, {
        actionId: target.actionId,
        accepted,
        reason: accepted ? 'quality-check-failed' : 'challenge-rejected'
      });
    }

    return {
      ok: true,
      generated: {
        agents: agentCount,
        actions: actionCount,
        disputes: Math.min(disputeCount, disputeTargets.length)
      },
      meta: getMeta()
    };
  });
}

app.listen({ port: PORT, host: HOST }).then(() => {
  if (process.env.NODE_ENV === 'production' && configuredGoldskyAuthMode !== 'hmac') {
    app.log.warn(
      { configuredMode: configuredGoldskyAuthMode, effectiveMode: GOLDSKY_WEBHOOK_AUTH_MODE },
      'Goldsky webhook auth mode forced to hmac in production'
    );
  }
  app.log.info(`query-gateway started on ${HOST}:${PORT}`);
});
