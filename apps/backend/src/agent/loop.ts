import Anthropic from '@anthropic-ai/sdk';
import { FastifyReply } from 'fastify';
import { config } from '../config';
import { query } from '../db';
import { buildSystemPrompt } from './prompt';
import { User, Message, StreamEvent } from '@kairo/shared';
import { v4 as uuidv4 } from 'uuid';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!anthropicClient && config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export interface StreamChatParams {
  userId: string;
  conversationId?: string;
  content: string;
  customAgentId?: string | null;
  reply: FastifyReply;
  abortSignal?: AbortSignal;
}

export async function executeChatStream(params: StreamChatParams) {
  const { userId, content, customAgentId, reply } = params;

  // 1. Setup SSE headers
  reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  reply.raw.flushHeaders();

  const sendEvent = (event: StreamEvent) => {
    if (!reply.raw.writableEnded) {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  try {
    // 2. Fetch or create conversation
    let convId: string = params.conversationId || '';
    let isNewConversation = false;

    if (!convId) {
      const title = content.slice(0, 40).replace(/[\r\n]+/g, ' ').trim() || 'New Conversation';
      const convResult = await query(
        `INSERT INTO conversations (user_id, custom_agent_id, title)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [userId, customAgentId || null, title]
      );
      convId = convResult.rows[0].id;
      isNewConversation = true;
    }

    // 3. Fetch user profile
    const userRes = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0] || {
      id: userId,
      email: 'user@orbit.ai',
      full_name: 'Orbit User',
      timezone: 'UTC',
      locale: 'en-US',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Save User Message
    const userMsgId = uuidv4();
    await query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content, model)
       VALUES ($1, $2, $3, 'user', $4, $5)`,
      [userMsgId, convId, userId, content, config.ANTHROPIC_DEFAULT_MODEL]
    );

    const assistantMsgId = uuidv4();

    // 5. Emit session start
    sendEvent({
      type: 'session_start',
      conversation_id: convId,
      user_message_id: userMsgId,
      assistant_message_id: assistantMsgId,
    });

    // 6. Fetch conversation message history (last 15 messages)
    const historyRes = await query<{ role: string; content: string }>(
      `SELECT role, content
       FROM messages
       WHERE conversation_id = $1 AND id != $2
       ORDER BY created_at ASC
       LIMIT 15`,
      [convId, userMsgId]
    );

    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = historyRes.rows.map((row) => ({
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
    }));
    anthropicMessages.push({ role: 'user', content });

    // 7. Assemble system prompt
    const systemPrompt = buildSystemPrompt({ user });

    // 8. Stream execution (Claude or Fallback Simulation)
    const client = getAnthropicClient();
    let fullResponseText = '';

    if (client) {
      const stream = client.messages.stream({
        model: config.ANTHROPIC_DEFAULT_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      for await (const chunk of stream) {
        if (reply.raw.writableEnded) break;

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const tokenText = chunk.delta.text;
          fullResponseText += tokenText;
          sendEvent({ type: 'token', text: tokenText });
        }
      }
    } else {
      // Intelligent fallback simulator for instant local testing without API key setup
      const simulationChunks = [
        "Hello! I am **Orbit**, your personal AI companion.\n\n",
        `I received your message: _"${content}"_.\n\n`,
        "I am currently operating in high-efficiency local development mode. ",
        "Once you configure your `ANTHROPIC_API_KEY`, I will stream responses directly from **Claude 3.5 Sonnet**.\n\n",
        "- **Privacy First**: Everything we discuss stays securely stored with pgvector encryption.\n",
        "- **Action Guardrails**: I will always request your explicit authorization before modifying external services.\n\n",
        "How can I assist your productivity today?"
      ];

      for (const chunk of simulationChunks) {
        if (reply.raw.writableEnded) break;
        fullResponseText += chunk;
        sendEvent({ type: 'token', text: chunk });
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    // 9. Persist Assistant Message
    await query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content, model)
       VALUES ($1, $2, $3, 'assistant', $4, $5)`,
      [assistantMsgId, convId, userId, fullResponseText, config.ANTHROPIC_DEFAULT_MODEL]
    );

    // Update conversation timestamp and title if new
    await query(
      `UPDATE conversations
       SET updated_at = NOW()
       WHERE id = $1`,
      [convId]
    );

    const savedAssistantMsg: Message = {
      id: assistantMsgId,
      conversation_id: convId,
      user_id: userId,
      role: 'assistant',
      content: fullResponseText,
      model: config.ANTHROPIC_DEFAULT_MODEL,
      created_at: new Date().toISOString(),
    };

    sendEvent({
      type: 'message_saved',
      message: savedAssistantMsg,
    });

    sendEvent({
      type: 'done',
      conversation_id: convId,
      assistant_message_id: assistantMsgId,
    });

    reply.raw.end();
  } catch (err: any) {
    console.error('[Agent Stream Error]:', err);
    sendEvent({
      type: 'error',
      message: err.message || 'An error occurred while streaming response.',
      code: 'AGENT_STREAM_ERROR',
    });
    reply.raw.end();
  }
}
