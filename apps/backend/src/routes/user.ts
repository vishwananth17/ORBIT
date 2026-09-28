import { FastifyInstance } from 'fastify';
import { query, getUserSettings } from '../db';
import { User, NotificationSettings, UpdateSettingsSchema } from '@kairo/shared';

export async function userRoutes(fastify: FastifyInstance) {
  // Get current user profile and settings
  fastify.get('/me', async (request, reply) => {
    const userId = request.user.id;

    const userRes = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
    const settings = await getUserSettings(userId);

    if (userRes.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      user: userRes.rows[0],
      settings: settings || null,
    });
  });

  // Update notification & agent settings
  fastify.patch('/settings', async (request, reply) => {
    const userId = request.user.id;
    const parse = UpdateSettingsSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;

    const result = await query<NotificationSettings>(
      `UPDATE notification_settings
       SET quiet_hours_start = COALESCE($1, quiet_hours_start),
           quiet_hours_end = COALESCE($2, quiet_hours_end),
           morning_brief_time = COALESCE($3, morning_brief_time),
           evening_review_time = COALESCE($4, evening_review_time),
           proactive_nudges_enabled = COALESCE($5, proactive_nudges_enabled),
           smart_reminders_enabled = COALESCE($6, smart_reminders_enabled),
           push_token = COALESCE($7, push_token),
           updated_at = NOW()
       WHERE user_id = $8
       RETURNING *`,
      [
        data.quiet_hours_start ?? null,
        data.quiet_hours_end ?? null,
        data.morning_brief_time ?? null,
        data.evening_review_time ?? null,
        data.proactive_nudges_enabled ?? null,
        data.smart_reminders_enabled ?? null,
        data.push_token ?? null,
        userId,
      ]
    );

    return reply.send({ settings: result.rows[0] });
  });

  // GDPR: Complete Data Export
  fastify.post('/export', async (request, reply) => {
    const userId = request.user.id;

    const [userRes, settingsRes, convsRes, messagesRes, memoriesRes, tasksRes] = await Promise.all([
      query('SELECT * FROM users WHERE id = $1', [userId]),
      query('SELECT * FROM notification_settings WHERE user_id = $1', [userId]),
      query('SELECT * FROM conversations WHERE user_id = $1', [userId]),
      query('SELECT * FROM messages WHERE user_id = $1', [userId]),
      query('SELECT id, category, content, importance_score, source_type, created_at FROM memories WHERE user_id = $1', [userId]),
      query('SELECT * FROM tasks WHERE user_id = $1', [userId]),
    ]);

    const exportData = {
      export_timestamp: new Date().toISOString(),
      user: userRes.rows[0] || null,
      settings: settingsRes.rows[0] || null,
      conversations: convsRes.rows,
      messages: messagesRes.rows,
      memories: memoriesRes.rows,
      tasks: tasksRes.rows,
    };

    return reply.send({ export: exportData });
  });

  // GDPR: Right to be Forgotten (Account Deletion)
  fastify.delete('/account', async (request, reply) => {
    const userId = request.user.id;

    // Cascade delete user data
    await query('DELETE FROM users WHERE id = $1', [userId]);

    return reply.send({
      success: true,
      message: 'User account and all associated data have been permanently deleted.',
    });
  });
}
