import { FastifyReply } from 'fastify';

export function startEventStream(reply: FastifyReply) {
  // Raw SSE bypasses reply.send(), so copy plugin headers before flushing.
  // In particular, preserve the configured CORS origin and security headers.
  for (const [name, value] of Object.entries(reply.getHeaders())) {
    if (value !== undefined) reply.raw.setHeader(name, value);
  }
  reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  reply.hijack();
  reply.raw.flushHeaders();
}
