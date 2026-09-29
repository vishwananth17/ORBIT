// ============================================================================
// Daily Briefs Route Handlers
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '@kairo/database';
import { generateDailyBrief } from '../proactivity/briefGenerator';
import { BriefType } from '@kairo/shared';

export async function briefsRoutes(fastify: FastifyInstance) {
  // 1. GET /api/briefs/today - Fetch or auto-generate today's brief
  fastify.get('/today', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      // Fetch user's timezone to get local date
      const userRes = await pool.query(
        `SELECT timezone FROM users WHERE id = $1`,
        [userId]
      );
      const tz = userRes.rows[0]?.timezone || 'UTC';
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

      // Check if morning brief already exists
      const existingRes = await pool.query(
        `SELECT * FROM daily_briefs
         WHERE user_id = $1 AND date = $2
         ORDER BY created_at DESC`,
        [userId, todayStr]
      );

      let morningBrief = existingRes.rows.find(b => b.type === 'morning_brief');
      let eveningReview = existingRes.rows.find(b => b.type === 'evening_review');

      // Auto-generate morning brief if missing
      if (!morningBrief) {
        morningBrief = await generateDailyBrief({
          userId,
          type: 'morning_brief',
          dateStr: todayStr,
        });
      }

      return reply.send({
        date: todayStr,
        morning_brief: morningBrief,
        evening_review: eveningReview || null,
      });
    } catch (err: any) {
      request.log.error(err, 'Failed to fetch today brief');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. POST /api/briefs/generate - Force generate brief on demand
  fastify.post('/generate', async (request: FastifyRequest<{
    Body: { type?: BriefType; dateStr?: string; sendPush?: boolean };
  }>, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { type = 'morning_brief', dateStr, sendPush = false } = request.body || {};

    try {
      const brief = await generateDailyBrief({
        userId,
        type,
        dateStr,
        sendPush,
      });
      return reply.status(201).send(brief);
    } catch (err: any) {
      request.log.error(err, 'Failed to generate brief');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. PATCH /api/briefs/:id/read - Mark brief as read
  fastify.patch('/:id/read', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const userId = request.user.id;
    const { id } = request.params;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const res = await pool.query(
        `UPDATE daily_briefs
         SET read_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Brief not found' });
      }

      return reply.send(res.rows[0]);
    } catch (err: any) {
      request.log.error(err, 'Failed to mark brief as read');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 4. GET /api/briefs/history - Fetch past daily briefs
  fastify.get('/history', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const limit = parseInt(request.query.limit || '14', 10);

    try {
      const res = await pool.query(
        `SELECT * FROM daily_briefs
         WHERE user_id = $1
         ORDER BY date DESC, created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return reply.send({ briefs: res.rows });
    } catch (err: any) {
      request.log.error(err, 'Failed to fetch brief history');
      return reply.status(500).send({ error: err.message });
    }
  });
}
