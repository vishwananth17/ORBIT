import { FastifyInstance } from 'fastify';
import { query } from '../db';
import {
  Conversation,
  Message,
  CreateConversationSchema,
  UpdateConversationSchema,
} from '@kairo/shared';

export async function conversationRoutes(fastify: FastifyInstance) {
  // List user conversations (ordered by updated_at descending)
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const result = await query<Conversation>(
      `SELECT c.*,
              (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*)::INT FROM messages m WHERE m.conversation_id = c.id) AS message_count
       FROM conversations c
       WHERE c.user_id = $1 AND c.is_archived = FALSE
       ORDER BY c.pinned DESC, c.updated_at DESC`,
      [userId]
    );

    return reply.send({ conversations: result.rows });
  });

  // Create a new conversation
  fastify.post('/', async (request, reply) => {
    const userId = request.user.id;
    const parse = CreateConversationSchema.safeParse(request.body || {});
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { title, custom_agent_id } = parse.data;
    const result = await query<Conversation>(
      `INSERT INTO conversations (user_id, custom_agent_id, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, custom_agent_id || null, title || 'New Conversation']
    );

    return reply.status(201).send({ conversation: result.rows[0] });
  });

  // Get conversation details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const result = await query<Conversation>(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    return reply.send({ conversation: result.rows[0] });
  });

  // Update conversation (title, pin, archive)
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const parse = UpdateConversationSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { title, is_archived, pinned } = parse.data;
    const result = await query<Conversation>(
      `UPDATE conversations
       SET title = COALESCE($1, title),
           is_archived = COALESCE($2, is_archived),
           pinned = COALESCE($3, pinned),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title ?? null, is_archived ?? null, pinned ?? null, id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    return reply.send({ conversation: result.rows[0] });
  });

  // Delete conversation
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const result = await query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    return reply.send({ success: true, deleted_id: id });
  });

  // Get messages for conversation
  fastify.get('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    // Verify conversation ownership
    const convCheck = await query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (convCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    const messages = await query<Message>(
      `SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return reply.send({ messages: messages.rows });
  });
}
