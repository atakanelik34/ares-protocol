import crypto from 'node:crypto';

const QUERY_GATEWAY_URL = process.env.QUERY_GATEWAY_URL || 'http://localhost:3001';
const ALLOW_UNAUTH_SEED = process.env.ALLOW_UNAUTH_SEED || 'true';

function authHeaders() {
  return ALLOW_UNAUTH_SEED === 'true' ? {} : { authorization: 'Token seed-token' };
}

function randomAddress(seed) {
  const h = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 40);
  return `0x${h}`;
}

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const item = process.argv.find((a) => a.startsWith(prefix));
  if (!item) return fallback;
  const raw = item.slice(prefix.length);
  if (typeof fallback === 'number') return Number(raw);
  if (typeof fallback === 'boolean') return ['1', 'true', 'yes', 'y'].includes(raw.toLowerCase());
  return raw;
}

async function request(path, body = null) {
  const res = await fetch(`${QUERY_GATEWAY_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      ...authHeaders()
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed (${res.status}): ${text}`);
  }
  return await res.json();
}

async function seedLiveDemo({ agents = 25, actions = 250, disputes = 12, reset = true } = {}) {
  const payload = { agents, actions, disputes, reset };
  const out = await request('/internal/demo/generate', payload);
  console.log('Live demo dataset ready:', out.generated);
  console.log('Meta:', out.meta);
}

async function seedDemo() {
  const agents = [0, 1, 2].map((i) => {
    const address = randomAddress(`agent-${i}`);
    return {
      address,
      operator: address,
      agentId: i + 1,
      registeredAt: new Date().toISOString(),
      actions: []
    };
  });

  const out = await request('/internal/demo/seed', { agents, actions: [], disputes: [] });
  console.log('Seeded demo agents:', agents.map((a) => a.address));
  console.log('Meta:', out.meta);
}

async function generateFakeActions(count = 20) {
  const addresses = [0, 1, 2].map((i) => randomAddress(`agent-${i}`));
  for (let i = 0; i < count; i++) {
    const address = addresses[i % addresses.length];
    const actionId = `demo-action-${i + 1}`;

    await request('/internal/demo/action', {
      address,
      actionId,
      scores: [100 + (i % 40), 95 + (i % 40), 90 + (i % 40), 85 + (i % 40), 80 + (i % 40)],
      timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      source: 'scoring-service-cli'
    });
  }

  console.log(`Generated ${count} fake actions.`);
}

async function streamActions({ intervalMs = 4000, count = 0 } = {}) {
  const lb = await request('/v1/leaderboard?limit=100');
  const addresses = (lb.items || []).map((row) => row.address).filter(Boolean);
  if (!addresses.length) throw new Error('No agents found. Seed demo first.');

  let i = 0;
  console.log(`Streaming actions every ${intervalMs}ms for ${count > 0 ? count : 'unbounded'} events...`);
  while (count <= 0 || i < count) {
    const address = addresses[i % addresses.length];
    const base = 110 + (i % 70);
    await request('/internal/demo/action', {
      address,
      actionId: `live-action-${Date.now()}-${i}`,
      scores: [base, base - 3, base - 7, base - 11, base - 15],
      timestamp: new Date().toISOString(),
      source: 'live-stream'
    });
    i += 1;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function run() {
  const cmd = process.argv[2];
  if (cmd === 'seed-demo') {
    await seedDemo();
    return;
  }
  if (cmd === 'generate-fake-actions') {
    await generateFakeActions(readArg('count', 20));
    return;
  }
  if (cmd === 'seed-live-demo') {
    await seedLiveDemo({
      agents: readArg('agents', 25),
      actions: readArg('actions', 250),
      disputes: readArg('disputes', 12),
      reset: readArg('reset', true)
    });
    return;
  }
  if (cmd === 'stream-actions') {
    await streamActions({
      intervalMs: readArg('intervalMs', 4000),
      count: readArg('count', 0)
    });
    return;
  }

  console.log(
    [
      'Usage:',
      '  node src/cli.js seed-live-demo --agents=25 --actions=250 --disputes=12 --reset=true',
      '  node src/cli.js stream-actions --intervalMs=4000 --count=0',
      '  node src/cli.js seed-demo',
      '  node src/cli.js generate-fake-actions --count=20'
    ].join('\n')
  );
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
