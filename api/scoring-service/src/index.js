import Fastify from 'fastify';
import { z } from 'zod';
import { deterministicScores } from './scorer.js';

const app = Fastify({ logger: true });
const PORT = Number(process.env.SCORING_PORT || 3002);
const QUERY_GATEWAY_URL = process.env.QUERY_GATEWAY_URL || 'http://localhost:3001';

app.get('/v1/health', async () => ({ ok: true, service: 'scoring-service', ts: new Date().toISOString() }));

app.post('/v1/score-action', async (request, reply) => {
  const schema = z.object({
    address: z.string(),
    actionId: z.string(),
    timestamp: z.string().optional()
  });

  const parsed = schema.safeParse(request.body || {});
  if (!parsed.success) {
    return reply.code(400).send({ error: 'invalid payload' });
  }

  const timestamp = parsed.data.timestamp || new Date().toISOString();
  const scores = deterministicScores({ actionId: parsed.data.actionId });

  const payload = {
    address: parsed.data.address,
    actionId: parsed.data.actionId,
    scores,
    timestamp
  };

  const response = await fetch(`${QUERY_GATEWAY_URL}/internal/demo/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return reply.code(502).send({ error: 'failed to forward action to query-gateway' });
  }

  return { ok: true, payload };
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`scoring-service started on :${PORT}`);
});
