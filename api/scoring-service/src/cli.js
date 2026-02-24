import crypto from 'node:crypto';

const QUERY_GATEWAY_URL = process.env.QUERY_GATEWAY_URL || 'http://localhost:3001';
const ALLOW_UNAUTH_SEED = process.env.ALLOW_UNAUTH_SEED || 'true';

function randomAddress(seed) {
  const h = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 40);
  return `0x${h}`;
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

  const res = await fetch(`${QUERY_GATEWAY_URL}/internal/demo/seed`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(ALLOW_UNAUTH_SEED === 'true' ? {} : { authorization: 'Bearer seed-token' })
    },
    body: JSON.stringify({ agents, actions: [] })
  });

  if (!res.ok) {
    throw new Error(`seed failed: ${res.status}`);
  }

  console.log('Seeded demo agents:', agents.map((a) => a.address));
}

async function generateFakeActions(count = 20) {
  const addresses = [0, 1, 2].map((i) => randomAddress(`agent-${i}`));

  for (let i = 0; i < count; i++) {
    const address = addresses[i % addresses.length];
    const actionId = `demo-action-${i + 1}`;

    const res = await fetch(`${QUERY_GATEWAY_URL}/internal/demo/action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address,
        actionId,
        scores: [100 + (i % 40), 95 + (i % 40), 90 + (i % 40), 85 + (i % 40), 80 + (i % 40)],
        timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString()
      })
    });

    if (!res.ok) {
      throw new Error(`failed at action ${i + 1}`);
    }
  }

  console.log(`Generated ${count} fake actions.`);
}

const cmd = process.argv[2];
const countArg = process.argv.find((arg) => arg.startsWith('--count='));
const count = countArg ? Number(countArg.split('=')[1]) : 20;

if (cmd === 'seed-demo') {
  seedDemo().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else if (cmd === 'generate-fake-actions') {
  generateFakeActions(count).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  console.log('Usage: node src/cli.js <seed-demo|generate-fake-actions> [--count=20]');
}
