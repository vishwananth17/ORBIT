// ============================================================================
// Custom Persona Agents Route Handlers (Phase 6)
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db';
import { CustomAgent, CreateCustomAgentSchema, UpdateCustomAgentSchema } from '@orbit/shared';

const PRESET_TEMPLATES = [
  {
    name: 'Executive Chief of Staff',
    tagline: 'High-leverage calendar triage, briefing, and proactive delegation',
    system_prompt: 'You are an elite Executive Chief of Staff to the user. You prioritize extreme clarity, brevity, action-oriented bullet points, and proactive calendar and task scheduling. Anticipate friction before it happens.',
    tone: 'commanding, crisp, exceptionally organized, proactive',
    avatar_icon: 'briefcase',
    enabled_tools: ['calendar_read', 'calendar_write', 'tasks_manage', 'memory_search', 'send_email'],
    is_default: true,
  },
  {
    name: 'Deep Work Sentinel',
    tagline: 'Ruthless focus defender, task breaker, and distraction blocker',
    system_prompt: 'You are a Deep Work Sentinel. Your mission is to protect the user\'s cognitive flow and deep focus. When user presents a complex project, break it into 25-minute Pomodoro sprints. Enforce boundaries against non-urgent trivia.',
    tone: 'stoic, focused, encouraging, high-agency',
    avatar_icon: 'shield',
    enabled_tools: ['tasks_manage', 'memory_search'],
    is_default: false,
  },
  {
    name: 'Founder & Venture Advisor',
    tagline: 'Strategic sparring partner for product, fundraising, and go-to-market',
    system_prompt: 'You are a seasoned Silicon Valley founder and venture advisor. Challenge the user\'s assumptions, pressure-test unit economics, demand ruthless prioritization, and provide first-principles feedback.',
    tone: 'sharp, incisive, visionary, pragmatic',
    avatar_icon: 'trending-up',
    enabled_tools: ['memory_search', 'tasks_manage'],
    is_default: false,
  },
  {
    name: 'Polymath Research Coach',
    tagline: 'Synthesizing dense literature, mental models, and deep learning',
    system_prompt: 'You are a world-class Polymath and Research Mentor. Help the user master hard concepts using Feynman technique, analogies, Socratic questioning, and structured synthesis.',
    tone: 'intellectually rigorous, curious, patient, insightful',
    avatar_icon: 'book-open',
    enabled_tools: ['memory_search', 'memory_store'],
    is_default: false,
  },
];

export async function agentsRoutes(fastify: FastifyInstance) {
  // 1. GET /api/agents - List all agents for the user (seeds initial presets if empty)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;

    let res = await query<CustomAgent>(
      `SELECT * FROM custom_agents WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId]
    );

    // If no agents created yet, seed the default preset templates for this user
    if (res.rows.length === 0) {
      for (const preset of PRESET_TEMPLATES) {
        await query(
          `INSERT INTO custom_agents (user_id, name, tagline, system_prompt, tone, avatar_icon, enabled_tools, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [
            userId,
            preset.name,
            preset.tagline,
            preset.system_prompt,
            preset.tone,
            preset.avatar_icon,
            preset.enabled_tools,
            preset.is_default,
          ]
        );
      }

      res = await query<CustomAgent>(
        `SELECT * FROM custom_agents WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
        [userId]
      );
    }

    return reply.send({
      agents: res.rows,
      presets: PRESET_TEMPLATES,
    });
  });

  // 2. GET /api/agents/:id - Get a specific agent
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = request.user.id;
    const { id } = request.params;

    const res = await query<CustomAgent>(
      `SELECT * FROM custom_agents WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ agent: res.rows[0] });
  });

  // 3. POST /api/agents - Create a new custom agent
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    const parseResult = CreateCustomAgentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const {
      name,
      tagline,
      system_prompt,
      tone,
      avatar_icon,
      enabled_tools,
      is_default,
    } = parseResult.data;

    // If setting as default, clear existing default
    if (is_default) {
      await query(`UPDATE custom_agents SET is_default = FALSE WHERE user_id = $1`, [userId]);
    }

    const res = await query<CustomAgent>(
      `INSERT INTO custom_agents (user_id, name, tagline, system_prompt, tone, avatar_icon, enabled_tools, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        name,
        tagline || null,
        system_prompt,
        tone || 'concise, thoughtful, proactive',
        avatar_icon || 'bot',
        enabled_tools || ['calendar_read', 'tasks_manage', 'memory_search'],
        is_default || false,
      ]
    );

    return reply.status(201).send({ agent: res.rows[0] });
  });

  // 4. PUT /api/agents/:id - Update an agent
  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = request.user.id;
    const { id } = request.params;

    const parseResult = UpdateCustomAgentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const existing = await query<CustomAgent>(
      `SELECT * FROM custom_agents WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const current = existing.rows[0];
    const data = parseResult.data;

    if (data.is_default) {
      await query(`UPDATE custom_agents SET is_default = FALSE WHERE user_id = $1`, [userId]);
    }

    const res = await query<CustomAgent>(
      `UPDATE custom_agents
       SET name = COALESCE($1, name),
           tagline = COALESCE($2, tagline),
           system_prompt = COALESCE($3, system_prompt),
           tone = COALESCE($4, tone),
           avatar_icon = COALESCE($5, avatar_icon),
           enabled_tools = COALESCE($6, enabled_tools),
           is_default = COALESCE($7, is_default),
           updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        data.name ?? current.name,
        data.tagline !== undefined ? data.tagline : current.tagline,
        data.system_prompt ?? current.system_prompt,
        data.tone ?? current.tone,
        data.avatar_icon ?? current.avatar_icon,
        data.enabled_tools ?? current.enabled_tools,
        data.is_default !== undefined ? data.is_default : current.is_default,
        id,
        userId,
      ]
    );

    return reply.send({ agent: res.rows[0] });
  });

  // 5. DELETE /api/agents/:id - Delete a custom agent
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = request.user.id;
    const { id } = request.params;

    const res = await query(
      `DELETE FROM custom_agents WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (res.rowCount === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ success: true, message: 'Agent deleted successfully' });
  });

  // 6. POST /api/agents/:id/default - Set as default agent
  fastify.post('/:id/default', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = request.user.id;
    const { id } = request.params;

    await query(`UPDATE custom_agents SET is_default = FALSE WHERE user_id = $1`, [userId]);

    const res = await query<CustomAgent>(
      `UPDATE custom_agents SET is_default = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (res.rowCount === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send({ success: true, agent: res.rows[0] });
  });
}
