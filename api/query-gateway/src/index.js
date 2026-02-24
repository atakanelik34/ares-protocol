import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { buildChallenge, randomNonce, verifySignature } from './auth.js';
import { getScoreFromSubgraph } from './subgraph.js';
import { addAction, getAgent, listAgents, seedDemo, upsertAgent } from './store.js';
import { computeAri } from './scoring.js';

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 3001);
const SUBGRAPH_QUERY_URL = process.env.SUBGRAPH_QUERY_URL || '';
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY || '';
const NONCE_TTL_MS = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000);
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
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : '';
  const record = token ? authTokens.get(token) : null;
  const hasAccess = Boolean(record && record.account === account && record.expiresAt > Date.now());
  return { account, hasAccess, expiresAt: hasAccess ? record.expiresAt : null };
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

  // TODO(mainnet): verify on-chain expiry from AresApiAccess before minting API session token.
  consumeNonceStmt.run(account, row.nonce);

  const token = randomNonce() + randomNonce();
  const expiry = Date.now() + NONCE_TTL_MS;
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
