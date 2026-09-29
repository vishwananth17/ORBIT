// ============================================================================
// Orbit Demo Data Seeder
// Seeds a complete, production-grade test user with rich memories,
// conversations, tasks, custom personas, and daily reflection journals.
// ============================================================================

import { pool } from './client';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// Generates a mock 1536-dimensional normalized vector for pgvector
function generateMockEmbedding(seed: number): string {
  const values: number[] = [];
  let norm = 0;
  for (let i = 0; i < 1536; i++) {
    const val = Math.sin(seed * (i + 1));
    values.push(val);
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  const normalized = values.map((v) => (v / norm).toFixed(6));
  return `[${normalized.join(',')}]`;
}

export async function seedDemoData() {
  console.log('🌱 [Orbit Seeder] Starting demo data seeding...');

  let client;
  try {
    client = await pool.connect();
  } catch (err: any) {
    console.error('\n⚠️  [Orbit Seeder] Could not connect to PostgreSQL database.');
    console.error('   Please ensure Docker PostgreSQL is running: npm run docker:up');
    console.error(`   Connection error: ${err.message}\n`);
    return false;
  }

  try {
    await client.query('BEGIN');

    // 1. Seed Demo User
    console.log('1. Seeding demo user...');
    await client.query(
      `INSERT INTO users (id, email, full_name, timezone, locale)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         timezone = EXCLUDED.timezone,
         updated_at = NOW()`,
      [DEMO_USER_ID, 'vishw@orbit.ai', 'Vishw', 'Asia/Kolkata', 'en-US']
    );

    // 2. Seed Notification Settings
    console.log('2. Seeding notification settings...');
    await client.query(
      `INSERT INTO notification_settings (
         user_id, quiet_hours_start, quiet_hours_end, morning_brief_time,
         evening_review_time, proactive_nudges_enabled, smart_reminders_enabled
       )
       VALUES ($1, '22:00', '07:30', '08:00', '20:30', true, true)
       ON CONFLICT (user_id) DO UPDATE SET
         morning_brief_time = EXCLUDED.morning_brief_time,
         evening_review_time = EXCLUDED.evening_review_time,
         updated_at = NOW()`,
      [DEMO_USER_ID]
    );

    // 3. Seed Custom Personas & Agents (Phase 6)
    console.log('3. Seeding custom personas & agents...');
    const agents = [
      {
        name: 'Executive Chief of Staff',
        tagline: 'High-leverage calendar triage, briefing, and proactive delegation',
        prompt: 'You are an elite Executive Chief of Staff to the user. Prioritize extreme density, brevity, action-oriented bullet points, and proactive calendar scheduling.',
        tone: 'commanding, crisp, exceptionally organized, proactive',
        icon: 'briefcase',
        tools: ['calendar_read', 'calendar_write', 'tasks_manage', 'memory_search', 'send_email'],
        is_default: true,
      },
      {
        name: 'Deep Work Sentinel',
        tagline: 'Ruthless focus defender, task breaker, and distraction blocker',
        prompt: 'You are a Deep Work Sentinel. Protect cognitive flow, break projects into 25-minute Pomodoro sprints, and eliminate trivia.',
        tone: 'stoic, focused, encouraging, high-agency',
        icon: 'shield',
        tools: ['tasks_manage', 'memory_search'],
        is_default: false,
      },
      {
        name: 'Founder & Venture Advisor',
        tagline: 'Strategic sparring partner for product, fundraising, and go-to-market',
        prompt: 'You are a seasoned Silicon Valley founder and venture advisor. Challenge assumptions, demand ruthless prioritization, and give first-principles feedback.',
        tone: 'sharp, incisive, visionary, pragmatic',
        icon: 'trending-up',
        tools: ['memory_search', 'tasks_manage'],
        is_default: false,
      },
    ];

    for (const a of agents) {
      await client.query(
        `INSERT INTO custom_agents (user_id, name, tagline, system_prompt, tone, avatar_icon, enabled_tools, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [DEMO_USER_ID, a.name, a.tagline, a.prompt, a.tone, a.icon, a.tools, a.is_default]
      );
    }

    // 4. Seed Semantic Memories with pgvector Embeddings (Phase 2)
    console.log('4. Seeding semantic memories with vector embeddings...');
    const memories = [
      {
        category: 'preference',
        content: 'Prefers morning deep work blocks before 11 AM with zero interruptions.',
        importance: 9,
        seed: 1,
      },
      {
        category: 'preference',
        content: 'Prefers dense bullet-point executive summaries over conversational fluff.',
        importance: 8,
        seed: 2,
      },
      {
        category: 'fact',
        content: 'Based in Bangalore, India (UTC+5:30).',
        importance: 7,
        seed: 3,
      },
      {
        category: 'project',
        content: 'Building Orbit, a proactive personal AI agent monorepo with Fastify and React Native.',
        importance: 9,
        seed: 4,
      },
      {
        category: 'goal',
        content: 'Ship Orbit beta to 100 power users this quarter.',
        importance: 10,
        seed: 5,
      },
    ];

    for (const m of memories) {
      const embedding = generateMockEmbedding(m.seed);
      await client.query(
        `INSERT INTO memories (user_id, category, content, importance_score, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         ON CONFLICT DO NOTHING`,
        [DEMO_USER_ID, m.category, m.content, m.importance, embedding]
      );
    }

    // 5. Seed Tasks & Reminders (Phase 3)
    console.log('5. Seeding tasks and smart reminders...');
    const tasks = [
      { title: 'Finalize Orbit End-to-End Demo Video', priority: 'high', status: 'in_progress', due: '2026-09-30' },
      { title: 'Review Google Calendar OAuth Scopes', priority: 'medium', status: 'completed', due: '2026-09-28' },
      { title: 'Test Morning Brief push notification delivery', priority: 'high', status: 'todo', due: '2026-10-01' },
      { title: 'Configure biometric faceID on mobile build', priority: 'low', status: 'completed', due: '2026-09-27' },
    ];

    for (const t of tasks) {
      await client.query(
        `INSERT INTO tasks (user_id, title, priority, status, due_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [DEMO_USER_ID, t.title, t.priority, t.status, t.due]
      );
    }

    // 6. Seed Today's Morning Brief (Phase 4)
    console.log('6. Seeding proactive daily brief...');
    const today = new Date().toISOString().split('T')[0];
    await client.query(
      `INSERT INTO daily_briefs (user_id, brief_type, brief_date, audio_script, agenda_items, key_priorities, weather_summary, suggested_actions)
       VALUES ($1, 'morning_brief', $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, brief_type, brief_date) DO NOTHING`,
      [
        DEMO_USER_ID,
        today,
        'Good morning Vishw. Today is Tuesday, September 29th. You have 3 key priorities today: finalizing the Orbit demo walkthrough, reviewing calendar OAuth tokens, and safeguarding your morning deep work block.',
        JSON.stringify([
          { time: '09:00 AM', title: 'Deep Work Block: Demo Video & Polish', type: 'focus' },
          { time: '02:00 PM', title: 'Team Sync & Product Review', type: 'meeting' },
          { time: '05:00 PM', title: 'Architecture Review & GitHub Push', type: 'task' },
        ]),
        JSON.stringify([
          'Finalize Orbit End-to-End Demo Video',
          'Review Google Calendar & Drive OAuth Scopes',
          'Test Morning Brief push notification delivery',
        ]),
        JSON.stringify({ condition: 'Clear Skies', temp_f: 74, summary: '74°F and clear in Bangalore. Perfect conditions for focus.' }),
        JSON.stringify([
          { id: 'nudge-1', title: 'Schedule Standup Reminder', action_type: 'reminder', description: 'Meeting in 45m: Team Sync' },
          { id: 'nudge-2', title: 'Review Unfinished Tasks', action_type: 'task_review', description: '1 high-priority task due tomorrow' },
        ]),
      ]
    );

    // 7. Seed Past 7 Days Daily Journal & Mood Reflections (Phase 7)
    console.log('7. Seeding daily journal entries and mood reflections...');
    const journalEntries = [
      {
        date: '2026-09-23',
        mood: 4,
        energy: 4,
        prod: 4,
        tags: ['Deep Work', 'Coding'],
        summary: 'Kicked off the Orbit personal agent monorepo. Architecture feels very solid and clean.',
        reflection: 'Strong architectural beginnings set a high ceiling for leverage. Notice how rapid momentum creates self-reinforcing flow.',
      },
      {
        date: '2026-09-24',
        mood: 4,
        energy: 4,
        prod: 5,
        tags: ['Deep Work', 'Breakthrough'],
        summary: 'Built semantic memory vector vault with pgvector cosine distance and recency decay ranking.',
        reflection: 'Grounding memory in mathematical cosine similarity allows authentic long-term continuity without prompt bloat.',
      },
      {
        date: '2026-09-25',
        mood: 5,
        energy: 5,
        prod: 5,
        tags: ['Coding', 'Breakthrough'],
        summary: 'Completed two-phase tool confirmation card protocol and external OAuth connectors.',
        reflection: 'Security guardrails that demand explicit sign-off on destructive actions give users the confidence to delegate high-stakes workflows.',
      },
      {
        date: '2026-09-26',
        mood: 4,
        energy: 3,
        prod: 4,
        tags: ['Rest & Recovery', 'Family'],
        summary: 'Balanced weekend reset with light reading on cognitive assistants.',
        reflection: 'Rest is not the absence of productivity; it is the cognitive substrate upon which clarity and creative insight thrive.',
      },
      {
        date: '2026-09-27',
        mood: 5,
        energy: 5,
        prod: 5,
        tags: ['Deep Work', 'Coding'],
        summary: 'Proactive intelligence scheduler implemented with BullMQ and timezone-aware quiet hours.',
        reflection: 'True agency is proactive anticipation rather than passive response. The morning briefing is a daily strategic rudder.',
      },
      {
        date: '2026-09-28',
        mood: 5,
        energy: 4,
        prod: 5,
        tags: ['Deep Work', 'Breakthrough'],
        summary: 'Speech STT, TTS voice synthesis, and quick-capture intent router finalized.',
        reflection: 'Voice interaction closes the friction gap between thought and digital capture. Ideas recorded within seconds never disappear.',
      },
      {
        date: today,
        mood: 5,
        energy: 5,
        prod: 5,
        tags: ['Deep Work', 'Coding', 'Breakthrough'],
        summary: 'Completed custom agent personas, daily reflection insights analytics, and offline-first sync engine.',
        reflection: 'You have brought the entire 8-phase Orbit vision into cohesive reality. Tomorrow, run the live demonstration with confidence.',
      },
    ];

    for (const entry of journalEntries) {
      await client.query(
        `INSERT INTO journal_entries (user_id, entry_date, summary, key_takeaways, mood_score, mood_tags, energy_level, productivity_score, ai_reflection)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id, entry_date) DO UPDATE SET
           summary = EXCLUDED.summary,
           mood_score = EXCLUDED.mood_score,
           energy_level = EXCLUDED.energy_level,
           productivity_score = EXCLUDED.productivity_score,
           ai_reflection = EXCLUDED.ai_reflection,
           updated_at = NOW()`,
        [
          DEMO_USER_ID,
          entry.date,
          entry.summary,
          ['Stay focused on high-leverage outcomes', 'Protect flow states'],
          entry.mood,
          entry.tags,
          entry.energy,
          entry.prod,
          entry.reflection,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('\n🎉 [Orbit Seeder] Demo data successfully seeded for Vishw (vishw@orbit.ai)!');
    console.log('   - 1 Demo User & Notification Settings');
    console.log('   - 3 Custom Personas (Chief of Staff, Sentinel, Founder)');
    console.log('   - 5 Semantic Vector Memories (with pgvector embeddings)');
    console.log('   - 4 Active Tasks & Deadlines');
    console.log('   - 1 Morning Brief for Today (Agenda, Weather, Suggestions)');
    console.log('   - 7 Days of Reflection & Mood Analytics\n');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ [Orbit Seeder] Seeding error:', err);
    return false;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
