import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { buildChallenge, randomNonce, verifySignature } from './auth.js';
import { createAccessChecker } from './access.js';
import { getAgentFromSubgraph, getLeaderboardFromSubgraph, getScoreFromSubgraph } from './subgraph.js';
import { addAction, addDispute, getAgent, getMeta, listActions, listActionsRows, listAgents, resetState, seedDemo, upsertAgent } from './store.js';
import { computeAri } from './scoring.js';

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 3001);
const SUBGRAPH_QUERY_URL = process.env.SUBGRAPH_QUERY_URL || '';
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY || '';
const NONCE_TTL_MS = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000);
const SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_MS || 60 * 60 * 1000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3003,http://localhost:3004';
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
`);

const challengeStmt = db.prepare(
  'INSERT INTO auth_nonce (account, nonce, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)'
);
const findNonceStmt = db.prepare(
  'SELECT account, nonce, expires_at, used FROM auth_nonce WHERE account = ? ORDER BY rowid DESC LIMIT 1'
);
const consumeNonceStmt = db.prepare('UPDATE auth_nonce SET used = 1 WHERE account = ? AND nonce = ?');
const insertWaitlistStmt = db.prepare(
  'INSERT OR IGNORE INTO waitlist (email, lang, source, created_at) VALUES (?, ?, ?, ?)'
);

const waitlistRate = new Map();
const authTokens = new Map();
const accessChecker = createAccessChecker({ env: process.env, logger: app.log });

const DEMO_ACCOUNTS = Object.freeze({
  'demo-1': '0x0000000000000000000000000000000000000001',
  'demo-2': '0x0000000000000000000000000000000000000002',
  'demo-3': '0x0000000000000000000000000000000000000003',
  'demo-4': '0x0000000000000000000000000000000000000004',
  'demo-5': '0x0000000000000000000000000000000000000005'
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
  const host = escapeHtml(forwardedHost || String(request.headers.host || 'api.ares-protocol.xyz'));
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

function endpointKind(endpointPath) {
  if (endpointPath.startsWith('/v1/health')) return 'health';
  if (endpointPath.startsWith('/v1/score/')) return 'score';
  if (endpointPath.startsWith('/v1/agent/')) return 'agent';
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
  if (path.startsWith('/v1/score/')) return '/v1/score/:agentAddress (or /v1/score/demo-1)';
  if (path.startsWith('/v1/agent/')) return '/v1/agent/:agentAddress (or /v1/agent/demo-1)';
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

function renderPayloadPage(request, { title, description, endpointPath, payload }) {
  const base = getBaseUrlFromRequest(request);
  const endpointUrl = `${base}${endpointTemplate(endpointPath)}`;
  const endpointUrlEscaped = escapeHtml(endpointUrl);
  const json = escapeHtml(JSON.stringify(payload, null, 2));
  const kind = endpointKind(endpointPath);
  const details = renderDetails(kind, payload);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ARES API - ${escapeHtml(title)}</title>
  <meta name="description" content="ARES API endpoint response view for ${escapeHtml(title)}.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --red: #c0392b;
      --red-bright: #e74c3c;
      --dark: #080b0f;
      --dark3: #141b22;
      --text: #e8edf2;
      --text-dim: #7a8a99;
      --border: rgba(255,255,255,0.08);
      --border-red: rgba(192,57,43,0.35);
      --mono: "Space Mono", monospace;
      --display: "Bebas Neue", sans-serif;
      --body: "DM Sans", sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--body); color: var(--text); background: var(--dark); min-height: 100vh; }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(192,57,43,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(192,57,43,0.05) 1px, transparent 1px);
      background-size: 64px 64px;
      pointer-events: none;
      z-index: -2;
    }
    .wrap { width: min(1140px, 94vw); margin: 42px auto 72px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 18px; }
    .brand {
      text-decoration: none;
      color: var(--red-bright);
      font-family: var(--display);
      font-size: 42px;
      letter-spacing: 1.4px;
      line-height: 0.9;
    }
    .brand small {
      display: block;
      color: var(--text-dim);
      font-family: var(--mono);
      font-size: 11px;
      margin-top: 8px;
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .btn {
      text-decoration: none;
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 1.1px;
      text-transform: uppercase;
      color: var(--text);
      border: 1px solid var(--border-red);
      background: rgba(192,57,43,0.2);
      padding: 10px 12px;
      transition: 0.2s ease;
    }
    .btn:hover { transform: translateY(-1px); }
    h1 {
      font-family: var(--display);
      font-size: clamp(46px, 7.5vw, 92px);
      line-height: 0.9;
      margin-bottom: 8px;
    }
    h1 span { color: var(--red-bright); }
    .subtitle {
      color: var(--text-dim);
      font-family: var(--mono);
      font-size: 13px;
      line-height: 1.65;
      margin-bottom: 18px;
      max-width: 900px;
    }
    .endpoint-box {
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
      padding: 12px;
      margin-bottom: 12px;
    }
    .endpoint-box strong {
      display: block;
      font-family: var(--mono);
      text-transform: uppercase;
      letter-spacing: 1.1px;
      font-size: 11px;
      margin-bottom: 8px;
      color: #fff;
    }
    .endpoint-box code {
      font-family: var(--mono);
      font-size: 12px;
      color: #d6e6f5;
      word-break: break-word;
    }
    .panel {
      background: linear-gradient(180deg, rgba(20,27,34,0.95), rgba(12,17,23,0.95));
      border: 1px solid var(--border);
      padding: 14px;
      margin-bottom: 12px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .metric-card {
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
      padding: 10px;
    }
    .metric-title {
      font-family: var(--mono);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 10px;
      color: var(--text-dim);
      margin-bottom: 6px;
    }
    .metric-value {
      font-family: var(--mono);
      color: #f0f6ff;
      font-size: 15px;
      line-height: 1.35;
      word-break: break-word;
    }
    .metric-value.ari {
      font-size: 24px;
      color: var(--red-bright);
      font-weight: 700;
    }
    .metric-sub {
      margin-top: 6px;
      color: var(--text-dim);
      font-size: 11px;
      line-height: 1.4;
    }
    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      font-family: var(--mono);
      letter-spacing: 0.5px;
      border: 1px solid var(--border);
    }
    .badge-good { color: #63d297; border-color: rgba(99,210,151,0.35); background: rgba(99,210,151,0.12); }
    .badge-warn { color: #f2b35d; border-color: rgba(242,179,93,0.35); background: rgba(242,179,93,0.12); }
    .badge-info { color: #7ab8ff; border-color: rgba(122,184,255,0.35); background: rgba(122,184,255,0.12); }
    .badge-neutral { color: #c7d5e3; border-color: rgba(199,213,227,0.28); background: rgba(199,213,227,0.1); }
    .kv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
    }
    .kv {
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
      padding: 10px;
    }
    .kv span {
      display: block;
      color: var(--text-dim);
      font-size: 11px;
      font-family: var(--mono);
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.9px;
    }
    .kv strong {
      display: block;
      color: #eaf3ff;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 500;
      word-break: break-word;
    }
    .mono-wrap {
      font-family: var(--mono);
      font-size: 12px;
      color: #cfe0f0;
      display: inline-block;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: bottom;
    }
    .subhead {
      margin: 12px 0 8px;
      font-family: var(--mono);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 11px;
      color: #fff;
    }
    .table-wrap {
      border: 1px solid var(--border);
      overflow-x: auto;
      background: rgba(255,255,255,0.01);
    }
    table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
      font-size: 12px;
      font-family: var(--mono);
    }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
      color: #d7e3ee;
      word-break: break-word;
    }
    th {
      color: #fff;
      font-size: 11px;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      background: rgba(255,255,255,0.02);
    }
    .empty {
      color: var(--text-dim);
      text-align: center;
      font-style: italic;
    }
    .raw {
      margin-top: 12px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }
    .raw summary {
      cursor: pointer;
      list-style: none;
      padding: 10px 12px;
      font-family: var(--mono);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 11px;
      color: #fff;
      user-select: none;
    }
    .raw summary::-webkit-details-marker { display: none; }
    .raw pre {
      margin: 0;
      padding: 12px;
      border-top: 1px solid var(--border);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.6;
      color: #cfe0f0;
    }
    @media (max-width: 900px) {
      .top { flex-direction: column; align-items: flex-start; gap: 10px; }
      .actions { justify-content: flex-start; }
      h1 { font-size: clamp(42px, 13vw, 68px); }
      .wrap { width: min(1100px, 95vw); margin-top: 28px; }
      table { min-width: 680px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <a class="brand" href="https://ares-protocol.xyz">
        ARES
        <small>Protocol API Gateway</small>
      </a>
      <div class="actions">
        <a class="btn" href="${base}/">API Home</a>
        <a class="btn" href="https://ares-protocol.xyz/docs/">Docs</a>
        <a class="btn" href="https://app.ares-protocol.xyz/">Explorer</a>
      </div>
    </div>

    <h1>${escapeHtml(title)} <span>RESPONSE</span></h1>
    <p class="subtitle">${escapeHtml(description)}</p>

    <div class="endpoint-box">
      <strong>Endpoint</strong>
      <code>${endpointUrlEscaped}</code>
    </div>

    ${details}

    <details class="raw">
      <summary>Raw JSON</summary>
      <pre>${json}</pre>
    </details>
  </main>
</body>
</html>`;
}

function renderApiLanding(request) {
  const base = getBaseUrlFromRequest(request);
  const demoRef = 'demo-1';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ARES API Gateway</title>
  <meta name="description" content="ARES Protocol API gateway on Base with reputation query endpoints.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --red: #c0392b;
      --red-bright: #e74c3c;
      --dark: #080b0f;
      --dark3: #141b22;
      --text: #e8edf2;
      --text-dim: #7a8a99;
      --border: rgba(255,255,255,0.08);
      --border-red: rgba(192,57,43,0.35);
      --mono: "Space Mono", monospace;
      --display: "Bebas Neue", sans-serif;
      --body: "DM Sans", sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--body);
      color: var(--text);
      background: var(--dark);
      min-height: 100vh;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(192,57,43,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(192,57,43,0.05) 1px, transparent 1px);
      background-size: 64px 64px;
      pointer-events: none;
      z-index: -2;
    }
    .wrap { width: min(1080px, 92vw); margin: 42px auto 72px; }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 22px;
    }
    .brand {
      text-decoration: none;
      color: var(--red-bright);
      font-family: var(--display);
      font-size: 42px;
      letter-spacing: 1.4px;
      line-height: 0.9;
    }
    .brand small {
      display: block;
      color: var(--text-dim);
      font-family: var(--mono);
      font-size: 11px;
      margin-top: 8px;
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .btn {
      text-decoration: none;
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 1.1px;
      text-transform: uppercase;
      color: var(--text);
      border: 1px solid var(--border-red);
      background: rgba(192,57,43,0.2);
      padding: 10px 12px;
      transition: 0.2s ease;
    }
    .btn:hover { transform: translateY(-1px); }
    h1 {
      font-family: var(--display);
      font-size: clamp(58px, 8.5vw, 96px);
      line-height: 0.9;
      margin-bottom: 8px;
    }
    h1 span { color: var(--red-bright); }
    .subtitle {
      color: var(--text-dim);
      font-family: var(--mono);
      font-size: 13px;
      line-height: 1.65;
      margin-bottom: 24px;
      max-width: 860px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      background: linear-gradient(180deg, rgba(20,27,34,0.95), rgba(12,17,23,0.95));
      border: 1px solid var(--border);
      padding: 14px;
      text-decoration: none;
      color: inherit;
      transition: 0.2s ease;
    }
    .card:hover { border-color: var(--border-red); transform: translateY(-1px); }
    .card h3 {
      font-family: var(--mono);
      font-size: 12px;
      margin-bottom: 7px;
      color: #fff;
    }
    .card p {
      color: var(--text-dim);
      font-size: 13px;
      line-height: 1.55;
      margin-bottom: 9px;
    }
    .card code {
      display: block;
      font-family: var(--mono);
      font-size: 11px;
      color: #d6e6f5;
      word-break: break-all;
    }
    .card-note {
      margin-top: 8px;
      color: var(--text-dim);
      font-size: 11px;
      line-height: 1.5;
      font-family: var(--mono);
    }
    .meta {
      margin-top: 18px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
      padding: 12px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-dim);
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <a class="brand" href="https://ares-protocol.xyz">
        ARES
        <small>Protocol API Gateway</small>
      </a>
      <div class="actions">
        <a class="btn" href="https://ares-protocol.xyz">Landing</a>
        <a class="btn" href="https://app.ares-protocol.xyz">Explorer</a>
        <a class="btn" href="https://ares-protocol.xyz/docs/">Docs</a>
      </div>
    </div>

    <h1>API <span>ENDPOINTS</span></h1>
    <p class="subtitle">
      Production gateway for ARES reputation queries on Base. This page mirrors landing visual language and provides direct links to live endpoints.
    </p>

    <div class="grid">
      <a class="card" href="${base}/v1/health">
        <h3>Health</h3>
        <p>Service status and timestamp.</p>
        <code>${base}/v1/health</code>
      </a>
      <a class="card" href="${base}/v1/agent/${demoRef}">
        <h3>Agent Query</h3>
        <p>Single agent profile (registry + ARI + actions + disputes).</p>
        <code>${base}/v1/agent/${demoRef}</code>
        <div class="card-note">Also supports: /v1/score/:agentAddress</div>
      </a>
      <a class="card" href="${base}/v1/leaderboard?limit=25">
        <h3>Leaderboard</h3>
        <p>Top agents sorted by ARI.</p>
        <code>${base}/v1/leaderboard?limit=25</code>
      </a>
      <a class="card" href="${base}/v1/actions?limit=20">
        <h3>Actions</h3>
        <p>History + realtime stream for live UIs.</p>
        <code>${base}/v1/actions?limit=20</code>
        <div class="card-note">Realtime stream: /v1/stream/actions</div>
      </a>
      <a class="card" href="${base}/v1/access/${demoRef}">
        <h3>Access</h3>
        <p>Paid access status for account.</p>
        <code>${base}/v1/access/${demoRef}</code>
        <div class="card-note">Auth challenge: /v1/auth/challenge?account=:account</div>
      </a>
    </div>

    <div class="meta">
      Base URL: ${base}<br>
      Network target: Base Sepolia (for demo environment)<br>
      Canonical docs: https://ares-protocol.xyz/docs/
    </div>
  </main>
</body>
</html>`;
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

app.get('/v1/score/:agentAddress', async (request, reply) => {
  const agentRef = String(request.params.agentAddress || '').toLowerCase();
  const aliasFromAddress = demoAliasOf(agentRef);
  if (aliasFromAddress && wantsHtml(request)) {
    return reply.redirect(`/v1/score/${aliasFromAddress}`);
  }
  const agentAddress = resolveDemoAccount(agentRef);
  const localAgent = getAgent(agentAddress);
  let payload = null;
  if (localAgent) {
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
  const agentRef = String(request.params.agentAddress || '').toLowerCase();
  const aliasFromAddress = demoAliasOf(agentRef);
  if (aliasFromAddress && wantsHtml(request)) {
    return reply.redirect(`/v1/agent/${aliasFromAddress}`);
  }
  const agentAddress = resolveDemoAccount(agentRef);
  const localAgent = getAgent(agentAddress);
  let payload = null;
  if (localAgent) {
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

app.get('/v1/leaderboard', async (request, reply) => {
  const limit = Math.max(1, Math.min(100, Number(request.query.limit || 20)));
  const cursor = Math.max(0, Number(request.query.cursor || 0));
  const tierFilter = request.query.tier ? String(request.query.tier).toUpperCase() : null;
  const hasDisputeFilter = parseBoolFlag(request.query.hasDispute);
  const actionBucket = normalizeActionBucket(request.query.actionBucket);

  let items = [];
  const localAgents = listAgents();
  const shouldUseLocal = localAgents.length > 0;

  if (shouldUseLocal) {
    const rows = localAgents.map((agent) => {
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

    let filtered = tierFilter ? rows.filter((r) => r.tier === tierFilter) : rows;
    if (hasDisputeFilter !== null) filtered = filtered.filter((r) => Boolean(r.hasDispute) === hasDisputeFilter);
    if (actionBucket) filtered = filtered.filter((r) => actionMatchesBucket(r.actions, actionBucket));
    filtered.sort((a, b) => b.ari - a.ari);
    items = filtered.slice(cursor, cursor + limit);
    const nextCursor = filtered.length > cursor + limit ? cursor + limit : null;
    const payload = { items, nextCursor };
    if (wantsHtml(request)) {
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
            endpointPath: `/v1/leaderboard?${qp.toString()}`,
            payload
          })
        );
    }
    return payload;
  }

  const fromSubgraph = await getLeaderboardFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, {
    limit,
    tier: tierFilter
  });
  if (fromSubgraph && fromSubgraph.length > 0) {
    items = fromSubgraph;
  }

  let filteredItems = items;
  if (tierFilter) filteredItems = filteredItems.filter((r) => String(r.tier || '').toUpperCase() === tierFilter);
  if (hasDisputeFilter !== null) filteredItems = filteredItems.filter((r) => Boolean(r.hasDispute) === hasDisputeFilter);
  if (actionBucket) filteredItems = filteredItems.filter((r) => actionMatchesBucket(r.actions, actionBucket));
  const pagedItems = filteredItems.slice(cursor, cursor + limit);
  const payload = {
    items: pagedItems,
    nextCursor: filteredItems.length > cursor + limit ? cursor + limit : null
  };
  if (wantsHtml(request)) {
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
          endpointPath: `/v1/leaderboard?${qp.toString()}`,
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/actions', async (request, reply) => {
  const agentRef = request.query.agent ? String(request.query.agent).toLowerCase() : '';
  const agent = agentRef ? resolveDemoAccount(agentRef) : '';
  const limit = Math.max(1, Math.min(100, Number(request.query.limit || 20)));
  const page = Math.max(0, Number(request.query.page || 0));
  const hasPageMode = page > 0;
  const cursor = request.query.cursor ? String(request.query.cursor) : null;
  const bucket = normalizeActionBucket(request.query.actionBucket);
  const onlyDisputed = parseBoolFlag(request.query.onlyDisputed);

  const allRows = hasPageMode ? listActionsRows({ agentAddress: agent }) : null;
  const cursorRows = hasPageMode
    ? null
    : listActions({ agentAddress: agent, limit: Math.min(limit * 3, 100), cursor });
  const items = hasPageMode ? allRows : cursorRows.items;
  const nextCursor = hasPageMode ? null : cursorRows.nextCursor;
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
      hasDispute: disputes.length > 0,
      disputedActionIds: new Set(disputes.map((d) => String(d.actionId)))
    });
  }

  let enriched = items.map((row) => {
    const summary = agentMap.get(row.address) || {
      agentId: row.agentId,
      agentIdHex: asAgentHex(row.agentId),
      ari: 0,
      tier: 'UNVERIFIED',
      actions: 0,
      hasDispute: false,
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

  if (bucket) enriched = enriched.filter((row) => actionMatchesBucket(row.actionsCount, bucket));
  if (onlyDisputed !== null) enriched = enriched.filter((row) => Boolean(row.isDisputed) === onlyDisputed);

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
    payload = { items: pageItems, nextCursor: computedNextCursor || nextCursor };
  }

  if (wantsHtml(request)) {
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
          endpointPath: `/v1/actions?${qp.toString()}`,
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/stream/actions', async (request, reply) => {
  const agentRef = request.query.agent ? String(request.query.agent).toLowerCase() : '';
  const filterAddress = agentRef ? resolveDemoAccount(agentRef) : '';
  if (streamClients.size >= MAX_STREAM_CLIENTS) {
    return reply.code(503).send({ error: 'stream capacity reached' });
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  reply.raw.write('\n');

  const client = { raw: reply.raw, filterAddress };
  streamClients.add(client);
  writeSseEvent(client, 'ready', { ok: true, ts: new Date().toISOString(), filterAddress: filterAddress || null });

  const keepAlive = setInterval(() => {
    if (reply.raw.destroyed || reply.raw.writableEnded) return;
    reply.raw.write(': keep-alive\n\n');
  }, 20000);
  const timeout = setTimeout(() => {
    if (!reply.raw.destroyed && !reply.raw.writableEnded) {
      reply.raw.end();
    }
  }, STREAM_MAX_MS);

  request.raw.on('close', () => {
    clearInterval(keepAlive);
    clearTimeout(timeout);
    streamClients.delete(client);
  });
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

  insertWaitlistStmt.run(parsed.data.email.toLowerCase(), parsed.data.lang, parsed.data.source, new Date().toISOString());
  return { ok: true };
});

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

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`query-gateway started on :${PORT}`);
});
