import Anthropic from '@anthropic-ai/sdk';
import { FastifyReply } from 'fastify';
import { config } from '../config';
import { query } from '../db';
import { buildSystemPrompt } from './prompt';
import { retrieveRelevantMemories } from '../memory/retriever';
import { extractMemoriesFromConversation } from '../memory/extractor';
import { getAnthropicToolDefinitions } from '../tools/registry';
import { handleToolCall } from '../tools/executor';
import { User, Message, StreamEvent, TOOL_NAMES } from '@orbit/shared';
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

  // Reject foreign conversation IDs before reading or writing any messages.
  if (params.conversationId) {
    const owned = await query('SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [params.conversationId, userId]);
    if (!owned.rows.length) return reply.status(404).send({ error: 'Conversation not found' });
  }

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
       ORDER BY created_at DESC, id DESC
       LIMIT 15`,
      [convId, userMsgId]
    );

    // Look up custom agent if assigned to conversation or passed directly
    let effectiveAgentId = customAgentId;
    if (!effectiveAgentId && convId) {
      const convRow = await query<{ custom_agent_id: string | null }>(
        'SELECT custom_agent_id FROM conversations WHERE id = $1',
        [convId]
      );
      if (convRow.rows[0]?.custom_agent_id) {
        effectiveAgentId = convRow.rows[0].custom_agent_id;
      }
    }

    let customAgent: any = null;
    if (effectiveAgentId) {
      const agentRes = await query(
        'SELECT * FROM custom_agents WHERE id = $1 AND user_id = $2',
        [effectiveAgentId, userId]
      );
      if (agentRes.rows.length > 0) {
        customAgent = agentRes.rows[0];
      }
    }

    const anthropicMessages: Anthropic.MessageParam[] = historyRes.rows.reverse().map((row) => ({
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
    }));
    anthropicMessages.push({ role: 'user', content });
    // 7. Retrieve semantically relevant memories from vector vault
    const relevantMemories = await retrieveRelevantMemories(userId, content, { limit: 6 });

    // 8. Assemble dynamic system prompt with recalled memories and persona
    const systemPrompt = buildSystemPrompt({
      user,
      memories: relevantMemories,
      agentName: customAgent?.name || 'Orbit',
      tone: customAgent?.tone,
      customSystemPrompt: customAgent?.system_prompt,
    });

    // 9. Stream execution (Claude or Fallback Simulation)
    const client = getAnthropicClient();
    let fullResponseText = '';

    // Filter tools if custom agent has enabled_tools whitelist
    let availableTools = getAnthropicToolDefinitions();
    if (customAgent?.enabled_tools && Array.isArray(customAgent.enabled_tools) && customAgent.enabled_tools.length > 0) {
      availableTools = availableTools.filter((t) => customAgent.enabled_tools.includes(t.name));
    }

    if (client) {
      // Continue after read tools so the assistant can use their results.
      for (let step = 0; step < 6; step++) {
        const stream = client.messages.stream({
          model: config.ANTHROPIC_DEFAULT_MODEL, max_tokens: 2048,
          system: systemPrompt, messages: anthropicMessages, tools: availableTools,
        });
        for await (const chunk of stream) {
          if (reply.raw.writableEnded) break;
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullResponseText += chunk.delta.text;
            sendEvent({ type: 'token', text: chunk.delta.text });
          }
        }
        const finalMessage = await stream.finalMessage();
        const calls = finalMessage.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        if (!calls.length) break;
        anthropicMessages.push({ role: 'assistant', content: finalMessage.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        let needsReview = false;
        for (const block of calls) {
          const outcome = await handleToolCall(userId, convId, block.name, block.input as Record<string, unknown>);
          if (outcome.status === 'confirmation_required') {
            needsReview = true;
            sendEvent({ type: 'tool_confirmation_required', action_id: outcome.action_id!,
              tool_name: outcome.tool_name!, permission_level: 'write',
              action_payload: outcome.action_payload!, description: outcome.description! });
          } else {
            sendEvent({ type: 'tool_result', tool_name: block.name, result: outcome.result || { error: outcome.error } });
          }
          results.push({ type: 'tool_result', tool_use_id: block.id,
            content: JSON.stringify(outcome), is_error: outcome.status === 'failed' });
        }
        anthropicMessages.push({ role: 'user', content: results });
        if (needsReview) break; // Never cross a confirmation boundary automatically.
        if (step === 5) {
          const text = '\nI reached the action limit. The task is not complete.';
          fullResponseText += text;
          sendEvent({ type: 'token', text });
        }
      }
    } else if (!config.DEMO_MODE) {
      throw new Error('Chat provider is not configured. No action was taken.');
    } else {
      // Intelligent fallback simulator for instant local testing without API key setup
      const lower = content.toLowerCase();
      let triggeredConfirmation = false;
      // Check if user requested to send email / mail
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
      const emailMatch = content.match(emailRegex);
      const isEmailIntent = (lower.includes('email') || lower.includes('mail')) && (lower.includes('send') || lower.includes('draft') || !!emailMatch);

      if (isEmailIntent) {
        const toEmail = emailMatch ? emailMatch[1] : 'bsvishwananth@gmail.com';
        let emailBody = 'Hello from Vish via Orbit.';
        const msgMatch = content.match(/(?:msg|message|saying|text|content|body)\s+[:\s]?["']?([^"'\n]+)["']?/i);
        if (msgMatch && msgMatch[1]) {
          emailBody = msgMatch[1].trim();
        } else {
          emailBody = 'i love you';
        }

        const actionResult = await handleToolCall(userId, convId, TOOL_NAMES.SEND_EMAIL, {
          to: toEmail,
          subject: 'Personal Note via Orbit',
          body: emailBody,
        });

        const simulationNotice = `I have drafted the email to **${toEmail}** with your message.\n\n⚠️ **Action Confirmation Required:** As per our Zero-Leakage Privacy & Safety guardrails, consequential write actions require your explicit, one-tap approval before they are dispatched.`;
        fullResponseText += simulationNotice;
        sendEvent({ type: 'token', text: simulationNotice });

        sendEvent({
          type: 'tool_confirmation_required',
          action_id: actionResult.action_id!,
          tool_name: TOOL_NAMES.SEND_EMAIL,
          permission_level: 'write',
          action_payload: actionResult.action_payload!,
          description: `Send email to "${toEmail}" regarding "Personal Note via Orbit" with body: "${emailBody}"`,
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
