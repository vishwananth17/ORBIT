// ============================================================================
// Daily Brief & Proactive Intelligence Generator
// Generates Morning Briefs & Evening Reviews using Claude 3.5 & Context
// ============================================================================

import { pool } from '@orbit/database';
import Anthropic from '@anthropic-ai/sdk';
import { DailyBrief, BriefType, AgendaItem, SuggestedAction } from '@orbit/shared';
import { sendPushNotification } from './pushNotifier';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'mock-key',
});

interface GenerateBriefOptions {
  userId: string;
  type?: BriefType;
  dateStr?: string;
  sendPush?: boolean;
}

export async function generateDailyBrief(options: GenerateBriefOptions): Promise<DailyBrief> {
  const { userId, type = 'morning_brief', sendPush = false } = options;

  // 1. Fetch user profile & timezone
  const userRes = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.timezone, ns.morning_brief_time, ns.evening_review_time
     FROM users u
     LEFT JOIN notification_settings ns ON ns.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  const user = userRes.rows[0] || {
    id: userId,
    full_name: 'Friend',
    timezone: 'UTC',
  };

  const userName = user.full_name || 'Friend';
  const tz = user.timezone || 'UTC';

  // Calculate local date string YYYY-MM-DD
  const now = new Date();
  const dateStr = options.dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);

  // 2. Collect Context: Active Tasks
  const tasksRes = await pool.query(
    `SELECT id, title, description, status, priority, due_date
     FROM tasks
     WHERE user_id = $1
       AND (status != 'completed' OR completed_at::date = $2::date)
     ORDER BY
       CASE priority
         WHEN 'urgent' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END,
       due_date ASC NULLS LAST
     LIMIT 8`,
    [userId, dateStr]
  );

  const tasks = tasksRes.rows;

  // 3. Collect Context: Long-Term Memories (Goals, Preferences, Routines)
  const memoriesRes = await pool.query(
    `SELECT category, content, importance_score
     FROM memories
     WHERE user_id = $1
       AND is_archived = FALSE
       AND category IN ('goal', 'preference', 'routine', 'project')
     ORDER BY importance_score DESC, last_accessed_at DESC
     LIMIT 6`,
    [userId]
  );

  const memories = memoriesRes.rows;

  // 4. Synthesize with Claude 3.5 or Fallback Generator
  let title = '';
  let summary = '';
  let audioSummary = '';
  let agendaItems: AgendaItem[] = [];
  let suggestedActions: SuggestedAction[] = [];

  const hasApiKey = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('mock');

  if (hasApiKey) {
    try {
      const prompt = `You are Orbit, an elite proactive personal AI agent. Generate a structured ${type.replace('_', ' ')} for ${userName} on ${dateStr}.

Context:
- User Timezone: ${tz}
- Active / Relevant Tasks: ${JSON.stringify(tasks, null, 2)}
- Top Relevant Memories: ${JSON.stringify(memories, null, 2)}

Provide your response strictly as valid JSON matching this schema:
{
  "title": "Short energizing title (e.g. 'Ready for Wednesday', 'Focus & Execution Day')",
  "summary": "2-3 concise, punchy sentences outlining today's mission, priorities, and pacing.",
  "audio_summary": "Conversational audio script (30-45 seconds) starting with 'Good morning/evening, ${userName}. Here is your Orbit brief...'",
  "agenda_items": [
    {
      "id": "string",
      "type": "task" or "calendar_event",
      "title": "string",
      "time": "optional e.g. '09:30 AM'",
      "priority": "low" | "medium" | "high" | "urgent",
      "status": "todo" | "in_progress" | "completed"
    }
  ],
  "suggested_actions": [
    {
      "id": "string",
      "title": "Actionable recommendation",
      "description": "Why this matters today",
      "action_type": "draft_email" | "prepare_meeting" | "reschedule_task" | "log_memory" | "custom"
    }
  ]
}`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          title = parsed.title;
          summary = parsed.summary;
          audioSummary = parsed.audio_summary;
          agendaItems = parsed.agenda_items || [];
          suggestedActions = parsed.suggested_actions || [];
        }
      }
    } catch (llmErr: any) {
      console.warn(`[BriefGenerator] LLM brief generation failed, using intelligent fallback:`, llmErr.message);
    }
  }

  // Fallback intelligent synthesis if LLM was skipped or failed
  if (!title || !summary) {
    if (type === 'morning_brief') {
      const taskCount = tasks.filter(t => t.status !== 'completed').length;
      title = `Plan for Today, ${userName}`;
      summary = taskCount > 0
        ? `You have ${taskCount} open ${taskCount === 1 ? 'priority' : 'priorities'} on your radar today. Momentum starts with your highest leverage item.`
        : `Your day is clear of immediate deadlines. An ideal window for deep creative focus or strategic exploration.`;
      audioSummary = `Good morning, ${userName}. Here is your Orbit brief for today. You have ${taskCount} active priorities lined up. Let's make meaningful progress.`;
    } else {
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      title = `Evening Reflection, ${userName}`;
      summary = `Day wind-down. You completed ${completedCount} item${completedCount === 1 ? '' : 's'} today. Take a moment to rest and capture any loose thoughts.`;
      audioSummary = `Good evening, ${userName}. Wrapping up the day. Great job on your completed work. Rest well for tomorrow.`;
    }

    agendaItems = tasks.map(t => ({
      id: t.id,
      type: 'task',
      title: t.title,
      time: t.due_date ? new Date(t.due_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
      priority: t.priority,
      status: t.status,
      completed: t.status === 'completed',
    }));

    if (tasks.length > 0) {
      suggestedActions.push({
        id: 'action-1',
        title: `Focus on: ${tasks[0].title}`,
        description: 'Tackle this first while cognitive energy is peak.',
        action_type: 'custom',
      });
    }

    suggestedActions.push({
      id: 'action-reflect',
      title: 'Daily Reflection & Brain Dump',
      description: 'Log any new preferences, insights, or thoughts into Orbit memory.',
      action_type: 'log_memory',
    });
  }

  // 5. Store / Upsert in daily_briefs Table
  const upsertRes = await pool.query(
    `INSERT INTO daily_briefs (
       user_id, date, type, title, summary,
       agenda_items, suggested_actions, audio_summary, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id, date, type)
     DO UPDATE SET
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       agenda_items = EXCLUDED.agenda_items,
       suggested_actions = EXCLUDED.suggested_actions,
       audio_summary = EXCLUDED.audio_summary,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      dateStr,
      type,
      title,
      summary,
      JSON.stringify(agendaItems),
      JSON.stringify(suggestedActions),
      audioSummary,
    ]
  );

  const saved = upsertRes.rows[0];

  const brief: DailyBrief = {
    id: saved.id,
    user_id: saved.user_id,
    date: saved.date,
    type: saved.type,
    title: saved.title,
    summary: saved.summary,
    agenda_items: saved.agenda_items,
    suggested_actions: saved.suggested_actions,
    audio_summary: saved.audio_summary,
    read_at: saved.read_at,
    created_at: saved.created_at,
    updated_at: saved.updated_at,
  };

  // 6. Optional Push Notification Dispatch
  if (sendPush) {
    sendPushNotification({
      userId,
      title: type === 'morning_brief' ? `☀️ Morning Brief: ${title}` : `🌙 Evening Review: ${title}`,
      body: summary,
      data: {
        briefId: brief.id,
        type: brief.type,
      },
    }).catch(err => {
      console.warn(`[BriefGenerator] Push dispatch error:`, err);
    });
  }

  return brief;
}
