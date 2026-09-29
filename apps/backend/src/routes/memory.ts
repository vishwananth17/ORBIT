import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { Memory, CreateMemorySchema, UpdateMemorySchema } from '@kairo/shared';
import { storeMemoryWithConflictResolution } from '../memory/extractor';
import { retrieveRelevantMemories } from '../memory/retriever';
import { generateEmbedding, formatVectorForPg } from '../memory/embeddings';

export async function memoryRoutes(fastify: FastifyInstance) {
  // 1. List user memories with search and category filtering
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const { category, search, pinned } = request.query as {
      category?: string;
      search?: string;
      pinned?: string;
    };

    let sql = `
      SELECT id, user_id, category, content, importance_score, confidence_score,
             source_type, source_id, access_count, last_accessed_at, is_pinned,
             is_archived, created_at, updated_at
      FROM memories
      WHERE user_id = $1 AND is_archived = FALSE
    `;
    const params: any[] = [userId];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (pinned === 'true') {
      sql += ` AND is_pinned = TRUE`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND LOWER(content) LIKE $${params.length}`;
    }

    sql += ` ORDER BY is_pinned DESC, importance_score DESC, updated_at DESC`;

    const result = await query<Memory>(sql, params);
    return reply.send({ memories: result.rows, total: result.rows.length });
  });

  // 2. Semantic vector search test endpoint
  fastify.post('/search', async (request, reply) => {
    const userId = request.user.id;
    const { q, limit, threshold } = (request.body as { q?: string; limit?: number; threshold?: number }) || {};

    if (!q || !q.trim()) {
      return reply.status(400).send({ error: 'Search query "q" is required' });
    }

    const matches = await retrieveRelevantMemories(userId, q.trim(), {
      limit: limit || 8,
      threshold: threshold || 0.4,
    });

    return reply.send({ matches });
  });

  // 3. Create memory manually from UI
  fastify.post('/', async (request, reply) => {
    const userId = request.user.id;
    const parse = CreateMemorySchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { content, category, importance_score, is_pinned } = parse.data;

    const memoryId = await storeMemoryWithConflictResolution(
      userId,
      {
        content,
        category,
        importance_score,
        confidence_score: 1.0,
      },
      'manual'
    );

    if (is_pinned) {
      await query('UPDATE memories SET is_pinned = TRUE WHERE id = $1', [memoryId]);
    }

    const result = await query<Memory>('SELECT * FROM memories WHERE id = $1', [memoryId]);
    return reply.status(201).send({ memory: result.rows[0] });
  });

  // 4. Update memory (content, importance, pin, archive)
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const parse = UpdateMemorySchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { content, importance_score, is_pinned, is_archived } = parse.data;

    // Check ownership
    const check = await query('SELECT id, content FROM memories WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) {
      return reply.status(404).send({ error: 'Memory not found' });
    }

    let vectorLiteral: string | null = null;
    if (content && content !== check.rows[0].content) {
      const newEmbedding = await generateEmbedding(content);
      vectorLiteral = formatVectorForPg(newEmbedding);
    }

    const result = await query<Memory>(
      `UPDATE memories
       SET content = COALESCE($1, content),
           importance_score = COALESCE($2, importance_score),
           is_pinned = COALESCE($3, is_pinned),
           is_archived = COALESCE($4, is_archived),
           embedding = CASE WHEN $5::vector IS NOT NULL THEN $5::vector ELSE embedding END,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        content ?? null,
        importance_score ?? null,
        is_pinned ?? null,
        is_archived ?? null,
        vectorLiteral,
        id,
        userId,
      ]
    );

    return reply.send({ memory: result.rows[0] });
  });

  // 5. Delete memory permanently
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const result = await query(
      'DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Memory not found' });
    }

    return reply.send({ success: true, deleted_id: id });
  });
}
