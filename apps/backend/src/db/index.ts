import { pool, query } from '@orbit/database';
import { User, NotificationSettings } from '@orbit/shared';

export { pool, query };

export async function ensureUserExists(userId: string, email: string = 'user@orbit.ai', fullName: string = 'Orbit User'): Promise<User> {
  // Supabase owns auth.users. Never fabricate an auth identity in application code.
  // Upsert in users table
  const userResult = await query<User>(
    `INSERT INTO users (id, email, full_name, timezone)
     VALUES ($1, $2, $3, 'UTC')
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [userId, email, fullName]
  );

  // Ensure notification settings
  await query(
    `INSERT INTO notification_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  return userResult.rows[0];
}

export async function getUserSettings(userId: string): Promise<NotificationSettings | null> {
  const result = await query<NotificationSettings>(
    'SELECT * FROM notification_settings WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}
