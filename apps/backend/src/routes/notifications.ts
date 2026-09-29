// ============================================================================
// Notification Settings & Proactive Nudges Routes
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '@orbit/database';
import { NotificationSettingsUpdate } from '@orbit/shared';
import { sendPushNotification } from '../proactivity/pushNotifier';

export async function notificationsRoutes(fastify: FastifyInstance) {
  // 1. GET /api/notifications/settings - Get settings
  fastify.get('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      let res = await pool.query(
        `SELECT * FROM notification_settings WHERE user_id = $1`,
        [userId]
      );

      // Create defaults if not yet present
      if (res.rows.length === 0) {
        res = await pool.query(
          `INSERT INTO notification_settings (user_id)
           VALUES ($1)
           RETURNING *`,
          [userId]
        );
      }

      return reply.send(res.rows[0]);
    } catch (err: any) {
      request.log.error(err, 'Failed to fetch notification settings');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. PUT /api/notifications/settings - Update settings
  fastify.put('/settings', async (request: FastifyRequest<{
    Body: NotificationSettingsUpdate;
  }>, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const {
      push_token,
      quiet_hours_start,
      quiet_hours_end,
      morning_brief_time,
      evening_review_time,
      proactive_nudges_enabled,
      smart_reminders_enabled,
    } = request.body;

    try {
      const res = await pool.query(
        `INSERT INTO notification_settings (
           user_id, push_token, quiet_hours_start, quiet_hours_end,
           morning_brief_time, evening_review_time,
           proactive_nudges_enabled, smart_reminders_enabled, updated_at
         )
         VALUES (
           $1, $2,
           COALESCE($3, '22:00:00'),
           COALESCE($4, '07:30:00'),
           COALESCE($5, '08:00:00'),
           COALESCE($6, '20:30:00'),
           COALESCE($7, TRUE),
           COALESCE($8, TRUE),
           NOW()
         )
         ON CONFLICT (user_id) DO UPDATE SET
           push_token = COALESCE($2, notification_settings.push_token),
           quiet_hours_start = COALESCE($3, notification_settings.quiet_hours_start),
           quiet_hours_end = COALESCE($4, notification_settings.quiet_hours_end),
           morning_brief_time = COALESCE($5, notification_settings.morning_brief_time),
           evening_review_time = COALESCE($6, notification_settings.evening_review_time),
           proactive_nudges_enabled = COALESCE($7, notification_settings.proactive_nudges_enabled),
           smart_reminders_enabled = COALESCE($8, notification_settings.smart_reminders_enabled),
           updated_at = NOW()
         RETURNING *`,
        [
          userId,
          push_token,
          quiet_hours_start,
          quiet_hours_end,
          morning_brief_time,
          evening_review_time,
          proactive_nudges_enabled,
          smart_reminders_enabled,
        ]
      );

      return reply.send(res.rows[0]);
    } catch (err: any) {
      request.log.error(err, 'Failed to update notification settings');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. POST /api/notifications/test - Test push delivery
  fastify.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const result = await sendPushNotification({
        userId,
        title: '🛰️ Orbit Test Signal',
        body: 'Push notifications are correctly configured and operational.',
        data: { test: true },
        isUrgent: true,
      });

      return reply.send({ success: result.sent, result });
    } catch (err: any) {
      request.log.error(err, 'Test notification failed');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 4. GET /api/notifications/nudges - Get active proactive nudges
  fastify.get('/nudges', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const res = await pool.query(
        `SELECT * FROM proactive_nudges
         WHERE user_id = $1 AND is_dismissed = FALSE
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      );

      return reply.send({ nudges: res.rows });
    } catch (err: any) {
      request.log.error(err, 'Failed to fetch nudges');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 5. PATCH /api/notifications/nudges/:id/dismiss - Dismiss nudge
  fastify.patch('/nudges/:id/dismiss', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const userId = request.user.id;
    const { id } = request.params;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const res = await pool.query(
        `UPDATE proactive_nudges
         SET is_dismissed = TRUE
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Nudge not found' });
      }

      return reply.send({ success: true, nudge: res.rows[0] });
    } catch (err: any) {
      request.log.error(err, 'Failed to dismiss nudge');
      return reply.status(500).send({ error: err.message });
    }
  });
}
