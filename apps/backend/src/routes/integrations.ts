import { beginGoogleConnect, finishGoogleConnect, GOOGLE_SCOPES } from '../integrations/google';
import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { encryptToken } from '../tools/crypto';

export async function integrationRoutes(fastify: FastifyInstance) {
  // List user connected integrations
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const res = await query(
      `SELECT id, provider, scopes, is_active, last_synced_at, created_at
       FROM integrations
       WHERE user_id = $1`,
      [userId]
    );

    const defaultIntegrations = [
      {
        provider: 'google_calendar',
        name: 'Google Calendar',
        description: 'Read upcoming events, schedule meetings, and protect focus time.',
        is_connected: res.rows.some((r) => r.provider === 'google_calendar' && r.is_active && r.scopes?.includes(GOOGLE_SCOPES.google_calendar)),
      },
      {
        provider: 'gmail',
        name: 'Gmail',
        description: 'Search messages, draft updates, and prepare outgoing emails.',
        is_connected: res.rows.some((r) => r.provider === 'gmail' && r.is_active && r.scopes?.includes(GOOGLE_SCOPES.gmail)),
      },
      {
        provider: 'google_drive',
        name: 'Google Drive',
        description: 'Search documents, project briefs, and notes.',
        is_connected: res.rows.some((r) => r.provider === 'google_drive' && r.is_active),
      },
    ];

    return reply.send({ integrations: defaultIntegrations, records: res.rows });
  });

  // Connect or simulate OAuth connect for dev
  fastify.post('/:provider/connect', async (request, reply) => {
    const userId = request.user.id;
    const { provider } = request.params as { provider: string };

    try {
      return reply.send({ authorization_url: await beginGoogleConnect(userId, provider) });
    } catch (error: any) {
      return reply.status(503).send({ error: error.message });
    }
  });

  // Disconnect integration
  fastify.delete('/:provider', async (request, reply) => {
    const userId = request.user.id;
    const { provider } = request.params as { provider: string };

    await query(
      `DELETE FROM integrations WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    return reply.send({
      success: true,
      provider,
      message: `Successfully disconnected ${provider}.`,
    });
  });
}

// Public callback: signed-in ownership is bound by a single-use server-side state.
export async function googleCallbackRoutes(fastify: FastifyInstance) {
  fastify.get('/google/callback', async (request, reply) => {
    const { state, code, error } = request.query as Record<string, string>;
    reply.header('Cache-Control', 'no-store');
    if (error || !state || !code) return reply.status(400).send('Google access was not granted. Return to Orbit and try again.');
    try {
      await finishGoogleConnect(state, code);
      return reply.type('text/plain').send('Google read access connected. Return to Orbit and refresh Connected Tools. Sending and calendar changes are not enabled yet.');
    } catch {
      return reply.status(400).send('Connection failed or expired. Return to Orbit and reconnect.');
    }
  });
}
