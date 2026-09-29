import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { Task } from '@orbit/shared';
import { z } from 'zod';

const TaskInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  due_date: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).optional().default('todo'),
});

export async function taskRoutes(fastify: FastifyInstance) {
  // List user tasks
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const { status } = request.query as { status?: string };

    let sql = 'SELECT * FROM tasks WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ' ORDER BY CASE priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, created_at DESC';

    const result = await query<Task>(sql, params);
    return reply.send({ tasks: result.rows, total: result.rows.length });
  });

  // Create a task
  fastify.post('/', async (request, reply) => {
    const userId = request.user.id;
    const parse = TaskInputSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { title, description, priority, due_date, status } = parse.data;

    const result = await query<Task>(
      `INSERT INTO tasks (user_id, title, description, priority, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, description || null, priority, due_date || null, status]
    );

    return reply.status(201).send({ task: result.rows[0] });
  });

  // Update a task
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const parse = TaskInputSchema.partial().safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;

    const result = await query<Task>(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           priority = COALESCE($3, priority),
           due_date = COALESCE($4, due_date),
           status = COALESCE($5, status),
           completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [data.title, data.description, data.priority, data.due_date, data.status, id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task: result.rows[0] });
  });

  // Delete a task
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ success: true, deleted_id: id });
  });
}
