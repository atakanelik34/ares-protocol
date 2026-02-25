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

function renderApiLanding(request) {
  const forwardedHost = String(request.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = escapeHtml(forwardedHost || String(request.headers.host || 'api.ares-protocol.xyz'));
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'https';
  const forwardedPrefix = String(request.headers['x-forwarded-prefix'] || '').split(',')[0].trim();
  const prefix = forwardedPrefix
    ? `/${forwardedPrefix.replace(/^\/+|\/+$/g, '')}`
    : '';
  const base = `${proto}://${host}${prefix}`;
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

app.get('/v1/health', async () => ({ ok: true, service: 'query-gateway', ts: new Date().toISOString() }));

app.get('/v1/score/:agentAddress', async (request, reply) => {
  const agentAddress = String(request.params.agentAddress || '').toLowerCase();

  const fromSubgraph = await getScoreFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, agentAddress);
  if (fromSubgraph) return fromSubgraph;

  const agent = getAgent(agentAddress);
  if (!agent) {
    return {
      agentId: '0',
      agentIdHex: '0x0',
      ari: 0,
      tier: 'UNVERIFIED',
      actions: 0,
      since: null
    };
  }

  const score = computeAri(agent.actions);
  return {
    agentId: String(agent.agentId),
    agentIdHex: `0x${BigInt(agent.agentId).toString(16)}`,
    ari: score.ari,
    tier: score.tier,
    actions: score.actions,
    since: score.since
  };
});

app.get('/v1/agent/:agentAddress', async (request) => {
  const agentAddress = String(request.params.agentAddress || '').toLowerCase();

  const fromSubgraph = await getAgentFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, agentAddress);
  if (fromSubgraph) return fromSubgraph;

  const agent = getAgent(agentAddress);
  if (!agent) {
    return { found: false };
  }

  const score = computeAri(agent.actions || []);
  return {
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
});

app.get('/v1/leaderboard', async (request) => {
  const limit = Math.max(1, Math.min(100, Number(request.query.limit || 20)));
  const tierFilter = request.query.tier ? String(request.query.tier).toUpperCase() : null;

  const fromSubgraph = await getLeaderboardFromSubgraph(SUBGRAPH_QUERY_URL, SUBGRAPH_API_KEY, {
    limit,
    tier: tierFilter
  });
  if (fromSubgraph && fromSubgraph.length > 0) {
    return { items: fromSubgraph };
  }

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

  return { items: filtered.slice(0, limit) };
});

app.get('/v1/access/:account', async (request) => {
  const account = String(request.params.account || '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(account)) {
    return { account, hasAccess: false, expiresAt: null, sessionActive: false, onChain: { enabled: false, error: true } };
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
    return { account, hasAccess: false, expiresAt: null, sessionActive: hasSession, onChain: { enabled: true, error: true } };
  }

  const hasAccess = hasSession && (!onChain.enabled || onChain.hasAccess);
  return {
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
});

app.get('/v1/auth/challenge', async (request, reply) => {
  const account = String(request.query.account || '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(account)) {
    return reply.code(400).send({ error: 'invalid account' });
  }

  if (!rateLimit(request.ip, 'auth', 30, 60_000)) {
    return reply.code(429).send({ error: 'rate limited' });
  }

  const nonce = randomNonce();
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const message = buildChallenge(account, nonce, expiresAt);

  challengeStmt.run(account, nonce, expiresAt, new Date().toISOString());

  return { account, nonce, expiresAt, message, ttlMs: NONCE_TTL_MS };
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
