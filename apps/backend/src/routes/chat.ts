import { FastifyInstance } from 'fastify';
import { SendMessageSchema } from '@orbit/shared';
import { executeChatStream } from '../agent/loop';

export async function chatRoutes(fastify: FastifyInstance) {
  // SSE Streaming Chat Endpoint
  fastify.post('/stream', async (request, reply) => {
    const parseResult = SendMessageSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { content, conversation_id, custom_agent_id } = parseResult.data;
    const userId = request.user.id;

    await executeChatStream({
      userId,
      content,
      conversationId: conversation_id,
      customAgentId: custom_agent_id,
      reply,
    });
  });
}
