// ============================================================================
// Push Notification Dispatcher (Expo Push API)
// Respects user quiet hours and delivery preferences
// ============================================================================

import { pool } from '@orbit/database';
import { isCurrentlyInQuietHours } from './quietHours';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isUrgent?: boolean;
}

export interface PushResult {
  sent: boolean;
  reason?: 'no_token' | 'quiet_hours_active' | 'disabled_by_user' | 'api_error' | 'success';
  details?: unknown;
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<PushResult> {
  const { userId, title, body, data = {}, isUrgent = false } = payload;

  try {
    // 1. Fetch user notification preferences & timezone
    const res = await pool.query(
      `SELECT ns.push_token, ns.quiet_hours_start, ns.quiet_hours_end,
              ns.proactive_nudges_enabled, ns.smart_reminders_enabled,
              u.timezone
       FROM notification_settings ns
       JOIN users u ON u.id = ns.user_id
       WHERE ns.user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return { sent: false, reason: 'no_token' };
    }

    const settings = res.rows[0];
    const pushToken = settings.push_token;

    if (!pushToken) {
      console.log(`[PushNotifier] No push token registered for user ${userId}. Skipping.`);
      return { sent: false, reason: 'no_token' };
    }

    if (!settings.proactive_nudges_enabled && !isUrgent) {
      console.log(`[PushNotifier] Proactive nudges disabled for user ${userId}. Skipping.`);
      return { sent: false, reason: 'disabled_by_user' };
    }

    // 2. Check quiet hours
    const inQuietHours = isCurrentlyInQuietHours({
      quiet_hours_start: settings.quiet_hours_start,
      quiet_hours_end: settings.quiet_hours_end,
      timezone: settings.timezone,
    });

    if (inQuietHours && !isUrgent) {
      console.log(`[PushNotifier] User ${userId} is currently in quiet hours. Suppressing notification: "${title}"`);
      return { sent: false, reason: 'quiet_hours_active' };
    }

    // 3. Dispatch to Expo Push Notifications API
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        receivedAt: new Date().toISOString(),
      },
      priority: isUrgent ? 'high' : 'normal',
    };

    console.log(`[PushNotifier] Sending push to ${pushToken} (${title})`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return {
      sent: true,
      reason: 'success',
      details: result,
    };
  } catch (error: any) {
    console.error(`[PushNotifier] Failed to send push notification:`, error.message);
    return {
      sent: false,
      reason: 'api_error',
      details: error.message,
    };
  }
}
