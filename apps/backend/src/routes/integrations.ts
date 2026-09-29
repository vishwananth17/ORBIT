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
        is_connected: res.rows.some((r) => r.provider === 'google_calendar' && r.is_active),
      },
      {
        provider: 'gmail',
        name: 'Gmail',
        description: 'Search messages, draft updates, and prepare outgoing emails.',
        is_connected: res.rows.some((r) => r.provider === 'gmail' && r.is_active),
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

    const mockAccessToken = `mock-access-token-${provider}-${Date.now()}`;
    const encryptedAccess = encryptToken(mockAccessToken);

    await query(
      `INSERT INTO integrations (user_id, provider, encrypted_access_token, is_active, last_synced_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_access_token = EXCLUDED.encrypted_access_token,
                     is_active = TRUE,
                     last_synced_at = NOW(),
                     updated_at = NOW()`,
      [userId, provider, encryptedAccess]
    );

    return reply.send({
      success: true,
      provider,
      message: `Successfully connected ${provider}.`,
    });
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
