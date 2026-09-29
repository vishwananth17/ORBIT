// ============================================================================
// Proactive Scheduler & BullMQ Worker
// Dispatches Morning Briefs, Evening Reviews, and Smart Reminders
// ============================================================================

import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { pool } from '@orbit/database';
import { generateDailyBrief } from './briefGenerator';
import { sendPushNotification } from './pushNotifier';
import { timeStringToMinutes } from './quietHours';

const QUEUE_NAME = 'orbit-proactive-queue';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient: Redis | null = null;
let proactiveQueue: Queue | null = null;
let proactiveWorker: Worker | null = null;
let intervalTimer: NodeJS.Timeout | null = null;

/**
 * Checks and delivers all due reminders in the database.
 */
export async function checkDueReminders(): Promise<number> {
  try {
    const res = await pool.query(
      `SELECT r.id, r.user_id, r.title, r.remind_at, t.title AS task_title
       FROM reminders r
       LEFT JOIN tasks t ON t.id = r.task_id
       WHERE r.is_sent = FALSE
         AND r.remind_at <= NOW()
       ORDER BY r.remind_at ASC
       LIMIT 50`
    );

    let sentCount = 0;
    for (const reminder of res.rows) {
      const displayTitle = reminder.task_title ? `Reminder: ${reminder.task_title}` : `Reminder: ${reminder.title}`;
      
      const pushRes = await sendPushNotification({
        userId: reminder.user_id,
        title: '⏰ Orbit Reminder',
        body: displayTitle,
        data: { reminderId: reminder.id },
        isUrgent: true, // Reminders are requested by the user, bypass quiet hours if user set it explicitly
      });

      if (pushRes.sent) {
        sentCount++;
      }

      await pool.query(
        `UPDATE reminders SET is_sent = TRUE, sent_at = NOW() WHERE id = $1`,
        [reminder.id]
      );
    }

    if (sentCount > 0) {
      console.log(`[ProactiveScheduler] Delivered ${sentCount} due reminders.`);
    }

    return sentCount;
  } catch (err: any) {
    console.error(`[ProactiveScheduler] Error checking due reminders:`, err.message);
    return 0;
  }
}

/**
 * Checks users who are due for their Morning Brief or Evening Review.
 */
export async function checkDueBriefs(): Promise<number> {
  try {
    const res = await pool.query(
      `SELECT ns.user_id, ns.morning_brief_time, ns.evening_review_time,
              ns.proactive_nudges_enabled, u.timezone
       FROM notification_settings ns
       JOIN users u ON u.id = ns.user_id
       WHERE ns.proactive_nudges_enabled = TRUE`
    );

    let generatedCount = 0;
    const now = new Date();

    for (const row of res.rows) {
      const tz = row.timezone || 'UTC';

      // Get user local hours and minutes
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const currentMinutes = hour * 60 + minute;

      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);

      // 1. Check Morning Brief
      const morningMinutes = timeStringToMinutes(row.morning_brief_time || '08:00:00');
      // If within 15-minute delivery window
      if (Math.abs(currentMinutes - morningMinutes) <= 15) {
        const existingRes = await pool.query(
          `SELECT id FROM daily_briefs WHERE user_id = $1 AND date = $2 AND type = 'morning_brief'`,
          [row.user_id, dateStr]
        );

        if (existingRes.rows.length === 0) {
          console.log(`[ProactiveScheduler] Generating scheduled morning brief for user ${row.user_id}`);
          await generateDailyBrief({
            userId: row.user_id,
            type: 'morning_brief',
            dateStr,
            sendPush: true,
          });
          generatedCount++;
        }
      }

      // 2. Check Evening Review
      const eveningMinutes = timeStringToMinutes(row.evening_review_time || '20:30:00');
      if (Math.abs(currentMinutes - eveningMinutes) <= 15) {
        const existingRes = await pool.query(
          `SELECT id FROM daily_briefs WHERE user_id = $1 AND date = $2 AND type = 'evening_review'`,
          [row.user_id, dateStr]
        );

        if (existingRes.rows.length === 0) {
          console.log(`[ProactiveScheduler] Generating scheduled evening review for user ${row.user_id}`);
          await generateDailyBrief({
            userId: row.user_id,
            type: 'evening_review',
            dateStr,
            sendPush: true,
          });
          generatedCount++;
        }
      }
    }

    return generatedCount;
  } catch (err: any) {
    console.error(`[ProactiveScheduler] Error checking due briefs:`, err.message);
    return 0;
  }
}

/**
 * Main cycle executed periodically by BullMQ or interval fallback.
 */
export async function runProactiveCycle(): Promise<void> {
  await checkDueReminders();
  await checkDueBriefs();
}

/**
 * Initializes BullMQ queue & worker, with fallback to in-process timer if Redis is unavailable.
 */
export function startProactiveScheduler(): void {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          // Fall back gracefully after 3 attempts
          return null;
        }
        return Math.min(times * 1000, 3000);
      },
    });

    redisClient.on('error', (err) => {
      // Quiet redis error logging in local environment without redis
      if (!intervalTimer) {
        console.warn(`[ProactiveScheduler] Redis not reachable (${err.message}). Starting in-process interval scheduler.`);
        startIntervalScheduler();
      }
    });

    redisClient.connect().then(() => {
      console.log(`[ProactiveScheduler] Connected to Redis. Initializing BullMQ...`);

      proactiveQueue = new Queue(QUEUE_NAME, {
        connection: redisClient as any,
      });

      // Repeatable job every 60 seconds
      proactiveQueue.add(
        'proactive-cycle',
        {},
        {
          repeat: {
            every: 60 * 1000, // Every 1 minute
          },
          removeOnComplete: true,
        }
      );

      proactiveWorker = new Worker(
        QUEUE_NAME,
        async (job) => {
          if (job.name === 'proactive-cycle') {
            await runProactiveCycle();
          }
        },
        { connection: redisClient as any }
      );

      console.log(`[ProactiveScheduler] BullMQ worker running.`);
    }).catch((err) => {
      console.warn(`[ProactiveScheduler] Redis connection failed (${err.message}). Using fallback timer.`);
      startIntervalScheduler();
    });
  } catch (e: any) {
    console.warn(`[ProactiveScheduler] BullMQ initialization skipped (${e.message}). Using fallback timer.`);
    startIntervalScheduler();
  }
}

function startIntervalScheduler(): void {
  if (intervalTimer) return;
  console.log(`[ProactiveScheduler] In-process interval scheduler running (60s cycle).`);
  intervalTimer = setInterval(() => {
    runProactiveCycle().catch(err => {
      console.error(`[ProactiveScheduler] Cycle error:`, err);
    });
  }, 60 * 1000);
}

export async function stopProactiveScheduler(): Promise<void> {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  if (proactiveWorker) {
    await proactiveWorker.close();
    proactiveWorker = null;
  }
  if (proactiveQueue) {
    await proactiveQueue.close();
    proactiveQueue = null;
  }
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
  }
  console.log(`[ProactiveScheduler] Stopped.`);
}
