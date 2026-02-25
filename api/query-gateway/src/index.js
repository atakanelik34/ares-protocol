import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { buildChallenge, randomNonce, verifySignature } from './auth.js';
import { createAccessChecker } from './access.js';
import { getAgentFromSubgraph, getLeaderboardFromSubgraph, getScoreFromSubgraph } from './subgraph.js';
import { addAction, getAgent, listAgents, seedDemo, upsertAgent } from './store.js';
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

function endpointKind(endpointPath) {
  if (endpointPath.startsWith('/v1/health')) return 'health';
  if (endpointPath.startsWith('/v1/score/')) return 'score';
  if (endpointPath.startsWith('/v1/agent/')) return 'agent';
  if (endpointPath.startsWith('/v1/leaderboard')) return 'leaderboard';
  if (endpointPath.startsWith('/v1/access/')) return 'access';
  if (endpointPath.startsWith('/v1/auth/challenge')) return 'challenge';
  return 'generic';
}

function text(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  return escapeHtml(String(value));
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
        <div class="kv"><span>Agent ID (hex)</span><strong>${text(payload.agentIdHex)}</strong></div>
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
              <td>${text(a.actionId)}</td>
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
              <td>${text(d.actionId)}</td>
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
        <div class="kv"><span>Address</span><strong>${text(payload.address)}</strong></div>
        <div class="kv"><span>Operator</span><strong>${text(payload.operator)}</strong></div>
        <div class="kv"><span>Agent ID</span><strong>${text(payload.agentId)} (${text(payload.agentIdHex)})</strong></div>
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
              <td>${text(item.address)}</td>
              <td>${text(item.agentId)} (${text(item.agentIdHex)})</td>
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

  if (kind === 'access') {
    return `<section class="panel">
      <div class="metrics">
        ${card('Has Access', boolBadge(Boolean(payload.hasAccess)), 'Session + on-chain')}
        ${card('Session Active', boolBadge(Boolean(payload.sessionActive)), 'Current bearer token')}
        ${card('On-chain Enabled', boolBadge(Boolean(payload.onChain?.enabled)), 'Access contract mode')}
        ${card('On-chain Access', boolBadge(Boolean(payload.onChain?.hasAccess)), 'AresApiAccess state')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>Account</span><strong>${text(payload.account)}</strong></div>
        <div class="kv"><span>Session Expires At</span><strong>${iso(payload.expiresAt)}</strong></div>
        <div class="kv"><span>On-chain Expiry</span><strong>${text(payload.onChain?.expiry)}</strong></div>
      </div>
    </section>`;
  }

  if (kind === 'challenge') {
    return `<section class="panel">
      <div class="metrics">
        ${card('Account', text(payload.account), 'Requested account')}
        ${card('TTL (ms)', text(payload.ttlMs), 'Challenge validity')}
        ${card('Expires At', iso(payload.expiresAt), 'UTC ISO')}
      </div>
      <div class="kv-grid">
        <div class="kv"><span>Nonce</span><strong>${text(payload.nonce)}</strong></div>
        <div class="kv"><span>Message</span><strong class="mono-wrap">${text(payload.message)}</strong></div>
      </div>
    </section>`;
  }

  return `<section class="panel"><div class="kv-grid"><div class="kv"><span>Response</span><strong>${text(JSON.stringify(payload))}</strong></div></div></section>`;
}

function renderPayloadPage(request, { title, description, endpointPath, payload }) {
  const base = getBaseUrlFromRequest(request);
  const endpointUrl = `${base}${endpointPath}`;
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
      word-break: break-all;
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
  const demoAccount = '0x1000000000000000000000000000000000000001';

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
      <a class="card" href="${base}/v1/score/${demoAccount}">
        <h3>Score by Agent Address</h3>
        <p>Returns canonical IDs, ARI, tier, actions, and since.</p>
        <code>${base}/v1/score/${demoAccount}</code>
      </a>
      <a class="card" href="${base}/v1/agent/${demoAccount}">
        <h3>Agent Details</h3>
        <p>Registry snapshot, actions, and dispute history.</p>
        <code>${base}/v1/agent/${demoAccount}</code>
      </a>
      <a class="card" href="${base}/v1/leaderboard?limit=3">
        <h3>Leaderboard</h3>
        <p>Top agents sorted by ARI.</p>
        <code>${base}/v1/leaderboard?limit=3</code>
      </a>
      <a class="card" href="${base}/v1/access/${demoAccount}">
        <h3>Access Status</h3>
        <p>Checks paid access state for account.</p>
        <code>${base}/v1/access/${demoAccount}</code>
      </a>
      <a class="card" href="${base}/v1/auth/challenge?account=${demoAccount}">
        <h3>Auth Challenge</h3>
        <p>Starts nonce challenge for API session auth.</p>
        <code>${base}/v1/auth/challenge?account=${demoAccount}</code>
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
  const agentAddress = String(request.params.agentAddress || '').toLowerCase();

  let payload = await getScoreFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, agentAddress);
  if (!payload) {
    const agent = getAgent(agentAddress);
    if (!agent) {
      payload = {
        agentId: '0',
        agentIdHex: '0x0',
        ari: 0,
        tier: 'UNVERIFIED',
        actions: 0,
        since: null
      };
    } else {
      const score = computeAri(agent.actions);
      payload = {
        agentId: String(agent.agentId),
        agentIdHex: `0x${BigInt(agent.agentId).toString(16)}`,
        ari: score.ari,
        tier: score.tier,
        actions: score.actions,
        since: score.since
      };
    }
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
  const agentAddress = String(request.params.agentAddress || '').toLowerCase();

  let payload = await getAgentFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, agentAddress);
  if (!payload) {
    const agent = getAgent(agentAddress);
    if (!agent) {
      payload = { found: false };
    } else {
      const score = computeAri(agent.actions || []);
      payload = {
        found: true,
        address: agent.address,
        agentId: String(agent.agentId),
        agentIdHex: `0x${BigInt(agent.agentId).toString(16)}`,
        operator: agent.operator,
        registeredAt: agent.registeredAt,
        ari: score.ari,
        tier: score.tier,
        since: score.since,
        actionsCount: score.actions,
        actions: (agent.actions || []).slice(-20).reverse()
      };
    }
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
  const tierFilter = request.query.tier ? String(request.query.tier).toUpperCase() : null;

  let items = [];
  const fromSubgraph = await getLeaderboardFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, {
    limit,
    tier: tierFilter
  });
  if (fromSubgraph && fromSubgraph.length > 0) {
    items = fromSubgraph;
  } else {
    const rows = listAgents().map((agent) => {
      const score = computeAri(agent.actions || []);
      return {
        address: agent.address,
        agentId: String(agent.agentId),
        agentIdHex: `0x${BigInt(agent.agentId).toString(16)}`,
        ari: score.ari,
        tier: score.tier,
        actions: score.actions,
        since: score.since
      };
    });

    const filtered = tierFilter ? rows.filter((r) => r.tier === tierFilter) : rows;
    filtered.sort((a, b) => b.ari - a.ari);
    items = filtered.slice(0, limit);
  }

  const payload = { items };
  if (wantsHtml(request)) {
    const qp = new URLSearchParams();
    qp.set('limit', String(limit));
    if (tierFilter) qp.set('tier', tierFilter);
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderPayloadPage(request, {
          title: 'Leaderboard',
          description: 'Top agents ranked by ARI with optional tier filtering.',
          endpointPath: `/v1/leaderboard?${qp.toString()}`,
          payload
        })
      );
  }
  return payload;
});

app.get('/v1/access/:account', async (request, reply) => {
  const account = String(request.params.account || '').toLowerCase();
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
  const account = String(request.query.account || '').toLowerCase();
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
  return { ok: true };
});

app.post('/internal/demo/action', async (request, reply) => {
  const schema = z.object({
    address: z.string(),
    actionId: z.string(),
    scores: z.array(z.number()).length(5),
    timestamp: z.string()
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

  addAction(addr, {
    actionId: parsed.data.actionId,
    scores: parsed.data.scores,
    timestamp: parsed.data.timestamp,
    source: 'scoring-service'
  });

  return { ok: true };
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`query-gateway started on :${PORT}`);
});
