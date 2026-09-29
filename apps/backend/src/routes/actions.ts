import { FastifyInstance } from 'fastify';
import { ConfirmActionSchema } from '@orbit/shared';
import { confirmAction } from '../tools/executor';

export async function actionRoutes(fastify: FastifyInstance) {
  // Confirm or reject a pending consequential write action
  fastify.post('/confirm', async (request, reply) => {
    const userId = request.user.id;
    const parse = ConfirmActionSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { action_id, approved, modified_payload } = parse.data;

    try {
      const outcome = await confirmAction(userId, action_id, approved, modified_payload);
      return reply.send(outcome);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
