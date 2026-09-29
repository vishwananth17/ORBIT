// ============================================================================
// Daily Journal & Insights Analytics Route Handlers (Phase 7)
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db';
import {
  JournalEntry,
  CreateJournalEntrySchema,
  JournalAnalytics,
} from '@orbit/shared';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic | null {
  if (!anthropicClient && config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Generates an empathetic, insightful reflection on daily entry
async function generateAiReflection(params: {
  summary: string;
  moodScore: number;
  energyLevel: number;
  productivityScore: number;
  tags: string[];
}): Promise<string> {
  const { summary, moodScore, energyLevel, productivityScore, tags } = params;
  const client = getAnthropicClient();

  if (client) {
    try {
      const response = await client.messages.create({
        model: config.ANTHROPIC_DEFAULT_MODEL,
        max_tokens: 400,
        system: `You are Orbit's Mindful Reflection Partner.
Provide an authentic, deeply perceptive, concise 2-3 paragraph reflection on the user's daily journal.
Acknowledge emotional realities without false toxic positivity.
Identify cognitive patterns, celebrate wins, and offer one quiet, high-leverage suggestion for tomorrow.`,
        messages: [
          {
            role: 'user',
            content: `Journal Summary: "${summary}"
Mood: ${moodScore}/5
Energy: ${energyLevel}/5
Productivity: ${productivityScore}/5
Tags: ${tags.join(', ') || 'None'}`,
          },
        ],
      });

      const firstBlock = response.content[0];
      if (firstBlock && firstBlock.type === 'text') {
        return firstBlock.text.trim();
      }
    } catch (err) {
      console.warn('[Journal AI Reflection Error]:', err);
    }
  }

  // Intelligent fallback simulation
  const moodDesc =
    moodScore >= 4 ? 'high spirits and clarity' : moodScore === 3 ? 'balanced neutrality' : 'subtle tension or fatigue';
  return `Reflecting on your day: You navigated today with ${moodDesc} (Mood: ${moodScore}/5, Energy: ${energyLevel}/5, Productivity: ${productivityScore}/5).

Your reflections emphasize: "${summary.slice(0, 140)}...". Taking time to log this conscious pause preserves mental bandwidth. Tomorrow, safeguard your peak morning window for what matters most before urgent demands take over.`;
}

export async function journalRoutes(fastify: FastifyInstance) {
  // 1. GET /api/journal/today - Get today's entry
  fastify.get('/today', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    const today = new Date().toISOString().split('T')[0];

    const res = await query<JournalEntry>(
      `SELECT * FROM journal_entries WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    );

    return reply.send({
      entry: res.rows[0] || null,
      date: today,
    });
  });

  // 2. POST /api/journal - Save or update journal entry
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    const parseResult = CreateJournalEntrySchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const {
      entry_date,
      summary,
      key_takeaways,
      mood_score,
      mood_tags,
      energy_level,
      productivity_score,
      request_ai_reflection,
    } = parseResult.data;

    const date = entry_date || new Date().toISOString().split('T')[0];

    let aiReflection: string | null = null;
    if (request_ai_reflection) {
      aiReflection = await generateAiReflection({
        summary,
        moodScore: mood_score ?? 3,
        energyLevel: energy_level ?? 3,
        productivityScore: productivity_score ?? 3,
        tags: mood_tags || [],
      });
    }

    const res = await query<JournalEntry>(
      `INSERT INTO journal_entries (
         user_id, entry_date, summary, key_takeaways, mood_score, mood_tags,
         energy_level, productivity_score, ai_reflection
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, entry_date)
       DO UPDATE SET
         summary = EXCLUDED.summary,
         key_takeaways = EXCLUDED.key_takeaways,
         mood_score = EXCLUDED.mood_score,
         mood_tags = EXCLUDED.mood_tags,
         energy_level = EXCLUDED.energy_level,
         productivity_score = EXCLUDED.productivity_score,
         ai_reflection = COALESCE(EXCLUDED.ai_reflection, journal_entries.ai_reflection),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        date,
        summary,
        key_takeaways || [],
        mood_score ?? 3,
        mood_tags || [],
        energy_level ?? 3,
        productivity_score ?? 3,
        aiReflection,
      ]
    );

    return reply.status(200).send({
      entry: res.rows[0],
    });
  });

  // 3. GET /api/journal/history - Get past journal entries
  fastify.get(
    '/history',
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const limit = Math.min(parseInt(request.query.limit || '14', 10), 60);

      const res = await query<JournalEntry>(
        `SELECT * FROM journal_entries
         WHERE user_id = $1
         ORDER BY entry_date DESC
         LIMIT $2`,
        [userId, limit]
      );

      return reply.send({
        entries: res.rows,
      });
    }
  );

  // 4. GET /api/journal/analytics - Multi-day mood & productivity metrics
  fastify.get(
    '/analytics',
    async (request: FastifyRequest<{ Querystring: { days?: string } }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const days = Math.min(parseInt(request.query.days || '7', 10), 90);

      const res = await query<JournalEntry>(
        `SELECT * FROM journal_entries
         WHERE user_id = $1
           AND entry_date >= (CURRENT_DATE - INTERVAL '1 day' * $2)
         ORDER BY entry_date ASC`,
        [userId, days]
      );

      const entries = res.rows;

      if (entries.length === 0) {
        const emptyAnalytics: JournalAnalytics = {
          period_days: days,
          average_mood: 0,
          average_energy: 0,
          average_productivity: 0,
          mood_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          top_tags: [],
          entries_count: 0,
          ai_synthesis: 'No journal entries logged yet. Record your first evening reflection to see trends.',
          daily_scores: [],
        };
        return reply.send({ analytics: emptyAnalytics });
      }

      const totalMood = entries.reduce((acc, e) => acc + (e.mood_score || 3), 0);
      const totalEnergy = entries.reduce((acc, e) => acc + (e.energy_level || 3), 0);
      const totalProd = entries.reduce((acc, e) => acc + (e.productivity_score || 3), 0);

      const moodDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const tagCount: Record<string, number> = {};

      for (const entry of entries) {
        if (entry.mood_score) {
          moodDist[entry.mood_score] = (moodDist[entry.mood_score] || 0) + 1;
        }
        for (const tag of entry.mood_tags || []) {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      }

      const topTags = Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const avgMood = Number((totalMood / entries.length).toFixed(1));
      const avgEnergy = Number((totalEnergy / entries.length).toFixed(1));
      const avgProd = Number((totalProd / entries.length).toFixed(1));

      const dailyScores = entries.map((e) => ({
        date: String(e.entry_date).slice(0, 10),
        mood: e.mood_score,
        energy: e.energy_level,
        productivity: e.productivity_score,
      }));

      const synthesis = `Across the last ${entries.length} recorded days, your average mood tracked at ${avgMood}/5 with an energy level of ${avgEnergy}/5 and productivity at ${avgProd}/5. ${
        avgMood >= 3.8
          ? 'You demonstrated sustained high momentum and resilience.'
          : 'Emotional equilibrium remained steady with room for recovery blocks.'
      }`;

      const analytics: JournalAnalytics = {
        period_days: days,
        average_mood: avgMood,
        average_energy: avgEnergy,
        average_productivity: avgProd,
        mood_distribution: moodDist,
        top_tags: topTags,
        entries_count: entries.length,
        ai_synthesis: synthesis,
        daily_scores: dailyScores,
      };

      return reply.send({ analytics });
    }
  );
}
