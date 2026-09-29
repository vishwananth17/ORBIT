import Anthropic from '@anthropic-ai/sdk';
import { FastifyReply } from 'fastify';
import { config } from '../config';
import { query } from '../db';
import { buildSystemPrompt } from './prompt';
import { retrieveRelevantMemories } from '../memory/retriever';
import { extractMemoriesFromConversation } from '../memory/extractor';
import { getAnthropicToolDefinitions } from '../tools/registry';
import { handleToolCall } from '../tools/executor';
import { User, Message, StreamEvent, TOOL_NAMES } from '@kairo/shared';
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
    // 7. Retrieve semantically relevant memories from vector vault
    const relevantMemories = await retrieveRelevantMemories(userId, content, { limit: 6 });

    // 8. Assemble dynamic system prompt with recalled memories
    const systemPrompt = buildSystemPrompt({
      user,
      memories: relevantMemories,
    });

    // 9. Stream execution (Claude or Fallback Simulation)
    const client = getAnthropicClient();
    let fullResponseText = '';

    if (client) {
      const stream = client.messages.stream({
        model: config.ANTHROPIC_DEFAULT_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: getAnthropicToolDefinitions(),
      });

      for await (const chunk of stream) {
        if (reply.raw.writableEnded) break;

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const tokenText = chunk.delta.text;
          fullResponseText += tokenText;
          sendEvent({ type: 'token', text: tokenText });
        }
      }

      // Check if Claude requested tool calls upon completion of message
      const finalMessage = await stream.finalMessage();
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          const toolCall = await handleToolCall(userId, convId, block.name, block.input as Record<string, unknown>);
          if (toolCall.status === 'confirmation_required') {
            sendEvent({
              type: 'tool_confirmation_required',
              action_id: toolCall.action_id!,
              tool_name: toolCall.tool_name!,
              permission_level: 'write',
              action_payload: toolCall.action_payload!,
              description: toolCall.description!,
            });
          } else if (toolCall.status === 'executed') {
            sendEvent({
              type: 'tool_result',
              tool_name: block.name,
              result: toolCall.result,
            });
          }
        }
      }
    } else {
      // Intelligent fallback simulator for instant local testing without API key setup
      const lower = content.toLowerCase();
      let triggeredConfirmation = false;

      if (lower.includes('email') && (lower.includes('send') || lower.includes('draft'))) {
        const actionResult = await handleToolCall(userId, convId, TOOL_NAMES.SEND_EMAIL, {
          to: 'sarah@example.com',
          subject: 'Project Sync & Orbit Launch',
          body: 'Hi Sarah, let us review the Orbit personal agent progress tomorrow afternoon.',
        });

        const simulationNotice = "I have drafted the email for you.\n\n⚠️ **Action Confirmation Required:** As per our privacy & safety guardrails, please review the confirmation card below before this message is dispatched.";
        fullResponseText += simulationNotice;
        sendEvent({ type: 'token', text: simulationNotice });

        sendEvent({
          type: 'tool_confirmation_required',
          action_id: actionResult.action_id!,
          tool_name: TOOL_NAMES.SEND_EMAIL,
          permission_level: 'write',
          action_payload: actionResult.action_payload!,
          description: actionResult.description!,
        });
        triggeredConfirmation = true;
      } else if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('calendar')) {
        const actionResult = await handleToolCall(userId, convId, TOOL_NAMES.CREATE_CALENDAR_EVENT, {
          summary: 'Strategy & Focus Sync',
          start_time: '2026-09-30T10:00:00Z',
          end_time: '2026-09-30T11:00:00Z',
          description: 'Focus block scheduled by Orbit.',
        });

        const simulationNotice = "I have prepared the calendar event.\n\n⚠️ **Action Confirmation Required:** Please review and confirm the proposed schedule below.";
        fullResponseText += simulationNotice;
        sendEvent({ type: 'token', text: simulationNotice });

        sendEvent({
          type: 'tool_confirmation_required',
          action_id: actionResult.action_id!,
          tool_name: TOOL_NAMES.CREATE_CALENDAR_EVENT,
          permission_level: 'write',
          action_payload: actionResult.action_payload!,
          description: actionResult.description!,
        });
        triggeredConfirmation = true;
      }

      if (!triggeredConfirmation) {
        const simulationChunks = [
          "Hello! I am **Orbit**, your personal AI companion.\n\n",
          `I received your message: _"${content}"_.\n\n`,
          "I am currently operating in high-efficiency local development mode with **pgvector continuous memory** and **safe two-phase tool execution**.\n\n",
          "- **Write Guardrails Active**: I will never send an email or alter your calendar without your explicit in-app confirmation.\n",
          "- Try asking: _\"Send an email to Sarah confirming lunch\"_ or _\"Schedule a strategy meeting tomorrow\"_ to see the confirmation card in action!\n\n",
          "What would you like to accomplish next?"
        ];

        for (const chunk of simulationChunks) {
          if (reply.raw.writableEnded) break;
          fullResponseText += chunk;
          sendEvent({ type: 'token', text: chunk });
          await new Promise((r) => setTimeout(r, 40));
        }
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

    // 10. Asynchronously extract facts/preferences into pgvector memory vault
    extractMemoriesFromConversation(userId, content, fullResponseText, userMsgId).catch((memErr) => {
      console.warn('[Memory Extraction Background Error]:', memErr.message);
    });
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
