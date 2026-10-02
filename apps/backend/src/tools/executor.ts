import { searchGoogleEmails, readGoogleEmail, readGoogleCalendar } from '../integrations/google';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { ActionLog, TOOL_NAMES, Task } from '@orbit/shared';
import { doesToolRequireConfirmation, TOOL_REGISTRY } from './registry';

export interface ToolExecutionResponse {
  status: 'executed' | 'confirmation_required' | 'failed';
  result?: unknown;
  action_id?: string;
  tool_name?: string;
  action_payload?: Record<string, unknown>;
  description?: string;
  error?: string;
}

/**
 * Handles incoming tool calls from Claude.
 * Intercepts consequential write operations and logs them as pending confirmation.
 */
export async function handleToolCall(
  userId: string,
  conversationId: string | null,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResponse> {
  if (!TOOL_REGISTRY[toolName]) return { status: 'failed', error: 'Unknown tool' };
  const requiresConfirmation = doesToolRequireConfirmation(toolName);

  if (requiresConfirmation) {
    // 1. Create a pending action in action_logs
    const actionId = uuidv4();
    const friendlyDescription = generateFriendlyDescription(toolName, args);

    await query(
      `INSERT INTO action_logs (
        id, user_id, conversation_id, tool_name, permission_level,
        action_payload, confirmation_status, created_at
      ) VALUES ($1, $2, $3, $4, 'write', $5, 'pending', NOW())`,
      [actionId, userId, conversationId, toolName, JSON.stringify(args)]
    );

    return {
      status: 'confirmation_required',
      action_id: actionId,
      tool_name: toolName,
      action_payload: args,
      description: friendlyDescription,
    };
  }

  // 2. Read or auto-executable write action: execute immediately
  try {
    const result = await executeDirectTool(userId, toolName, args);

    // Audit log the executed action
    const actionId = uuidv4();
    await query(
      `INSERT INTO action_logs (
        id, user_id, conversation_id, tool_name, permission_level,
        action_payload, confirmation_status, result_payload, executed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'executed', $7, NOW(), NOW())`,
      [
        actionId,
        userId,
        conversationId,
        toolName,
        TOOL_REGISTRY[toolName]?.permission_level || 'read',
        JSON.stringify(args),
        JSON.stringify(result),
      ]
    ).catch(() => {});

    return {
      status: 'executed',
      result,
    };
  } catch (err: any) {
    return {
      status: 'failed',
      error: err.message || 'Tool execution failed',
    };
  }
}

/**
 * Executes direct read/write tools (tasks, simulated calendar read, email search).
 */
async function executeDirectTool(userId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  switch (toolName) {
    case TOOL_NAMES.CREATE_TASK: {
      const title = String(args.title || 'Untitled Task');
      const priority = String(args.priority || 'medium');
      const dueDate = args.due_date ? String(args.due_date) : null;
      const description = args.description ? String(args.description) : null;

      const res = await query<Task>(
        `INSERT INTO tasks (user_id, title, priority, due_date, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, title, priority, dueDate, description]
      );
      return { success: true, task: res.rows[0], message: `Task "${title}" created successfully.` };
    }

    case TOOL_NAMES.LIST_TASKS: {
      const status = args.status ? String(args.status) : null;
      let sql = 'SELECT * FROM tasks WHERE user_id = $1';
      const params: any[] = [userId];

      if (status) {
        params.push(status);
        sql += ` AND status = $2`;
      }
      sql += ' ORDER BY priority DESC, created_at DESC LIMIT 20';

      const res = await query<Task>(sql, params);
      return { tasks: res.rows, count: res.rows.length };
    }

    case TOOL_NAMES.COMPLETE_TASK: {
      const taskId = String(args.task_id);
      const res = await query<Task>(
        `UPDATE tasks
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [taskId, userId]
      );
      if (res.rows.length === 0) throw new Error('Task not found');
      return { success: true, task: res.rows[0] };
    }

    case TOOL_NAMES.GET_CALENDAR_EVENTS:
      return readGoogleCalendar(userId, args);
    case TOOL_NAMES.SEARCH_EMAILS:
      return searchGoogleEmails(userId, args);
    case TOOL_NAMES.READ_EMAIL:
      return readGoogleEmail(userId, args);

    default:
      throw new Error('Tool is not implemented');
  }
}

/**
 * User Confirmation Phase: executes or rejects a pending consequential action.
 */
export async function confirmAction(
  userId: string,
  actionId: string,
  approved: boolean,
  modifiedPayload?: Record<string, unknown>
): Promise<{ success: boolean; status: string; result?: unknown; error?: string }> {
  const check = await query<ActionLog>(
    `SELECT * FROM action_logs WHERE id = $1 AND user_id = $2`,
    [actionId, userId]
  );

  if (check.rows.length === 0) {
    throw new Error('Action record not found');
  }

  const action = check.rows[0];

  if (action.confirmation_status !== 'pending') {
    return {
      success: false,
      status: action.confirmation_status,
      error: `Action is already ${action.confirmation_status}`,
    };
  }

  if (!approved) {
    await query(
      `UPDATE action_logs
       SET confirmation_status = 'rejected'
       WHERE id = $1`,
      [actionId]
    );
    return { success: true, status: 'rejected' };
  }

  // Approved: execute consequential action
  if (modifiedPayload) throw new Error('Changed actions need a new preview and confirmation.');
  const payload = action.action_payload;
  let executionResult: unknown = null;

  try {
    throw new Error('Google integration is not configured. No email was sent or calendar event changed.');

    await query(
      `UPDATE action_logs
       SET confirmation_status = 'executed',
           result_payload = $1,
           executed_at = NOW(),
           user_confirmed_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(executionResult), actionId]
    );

    return {
      success: true,
      status: 'executed',
      result: executionResult,
    };
  } catch (err: any) {
    await query(
      `UPDATE action_logs
       SET confirmation_status = 'failed',
           error_message = $1
       WHERE id = $2`,
      [err.message, actionId]
    );

    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Creates user-friendly summaries for confirmation modals
 */
function generateFriendlyDescription(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case TOOL_NAMES.SEND_EMAIL:
      return `Send email to "${args.to}" regarding "${args.subject}"`;
    case TOOL_NAMES.CREATE_CALENDAR_EVENT:
      return `Schedule event "${args.summary}" on ${args.start_time}`;
    case TOOL_NAMES.DELETE_CALENDAR_EVENT:
      return `Delete calendar event "${args.summary || args.event_id}"`;
    default:
      return `Execute consequential action: ${toolName}`;
  }
}
