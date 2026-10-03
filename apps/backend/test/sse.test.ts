import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { startEventStream } from '../src/agent/sse';
(async () => {
  const app = Fastify();
  const origin = 'https://orbit-preview.example';
  await app.register(cors, { origin, credentials: true });
  app.post('/stream', async (_req, reply) => {
    reply.header('X-Test-Security', 'preserved');
    startEventStream(reply);
    reply.raw.end('data: {"type":"done"}\n\n');
  });
  const preflight = await app.inject({ method: 'OPTIONS', url: '/stream', headers: { origin,
    'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } });
  assert.equal(preflight.statusCode, 204);
  const response = await app.inject({ method: 'POST', url: '/stream', headers: { origin }, payload: {} });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], origin);
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
  assert.equal(response.headers['x-test-security'], 'preserved');
  assert.match(response.headers['content-type'] as string, /text\/event-stream/);
  assert.match(response.body, /"type":"done"/);
  assert.notEqual(response.headers['access-control-allow-origin'], '*');
  await app.close();
  console.log('Raw SSE preserves configured CORS and staged headers.');
})().catch(err => { console.error(err); process.exit(1); });
