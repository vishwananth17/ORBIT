import { PermissionLevel, TOOL_NAMES, SENSITIVE_WRITE_TOOLS } from '@orbit/shared';
import Anthropic from '@anthropic-ai/sdk';

export interface OrbitToolDefinition {
  name: string;
  description: string;
  permission_level: PermissionLevel;
  requires_confirmation: boolean;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const TOOL_REGISTRY: Record<string, OrbitToolDefinition> = {
  // --- Calendar Tools ---
  [TOOL_NAMES.GET_CALENDAR_EVENTS]: {
    name: TOOL_NAMES.GET_CALENDAR_EVENTS,
    description: "Retrieve upcoming events and appointments from the user's primary calendar.",
    permission_level: 'read',
    requires_confirmation: false,
    parameters: {
      type: 'object',
      properties: {
        time_min: { type: 'string', description: 'ISO date string representing start of range (e.g. 2026-09-29T00:00:00Z)' },
        time_max: { type: 'string', description: 'ISO date string representing end of range (e.g. 2026-09-30T23:59:59Z)' },
        query: { type: 'string', description: 'Optional text query to filter events by title or attendee' },
      },
      required: [],
    },
  },

  [TOOL_NAMES.CREATE_CALENDAR_EVENT]: {
    name: TOOL_NAMES.CREATE_CALENDAR_EVENT,
    description: 'Schedule a new calendar event. Consequential action that triggers a user confirmation card.',
    permission_level: 'write',
    requires_confirmation: true,
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Title or summary of the meeting/event' },
        start_time: { type: 'string', description: 'ISO 8601 start time (e.g. 2026-09-30T14:00:00Z)' },
        end_time: { type: 'string', description: 'ISO 8601 end time (e.g. 2026-09-30T15:00:00Z)' },
        description: { type: 'string', description: 'Optional notes or agenda for the event' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of email addresses of attendees to invite',
        },
      },
      required: ['summary', 'start_time', 'end_time'],
    },
  },

  [TOOL_NAMES.DELETE_CALENDAR_EVENT]: {
    name: TOOL_NAMES.DELETE_CALENDAR_EVENT,
    description: 'Delete or cancel an existing calendar event. Requires explicit user confirmation.',
    permission_level: 'write',
    requires_confirmation: true,
    parameters: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'ID of the calendar event to delete' },
        summary: { type: 'string', description: 'Title of the event for confirmation summary' },
      },
      required: ['event_id', 'summary'],
    },
  },

  // --- Email Tools ---
  [TOOL_NAMES.SEARCH_EMAILS]: {
    name: TOOL_NAMES.SEARCH_EMAILS,
    description: "Search user's Gmail inbox for recent messages, threads, and senders.",
    permission_level: 'read',
    requires_confirmation: false,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query syntax (e.g. "from:sarah urgent", "subject:invoice")' },
        max_results: { type: 'number', description: 'Maximum number of emails to retrieve (default: 5)' },
      },
      required: ['query'],
    },
  },

  [TOOL_NAMES.SEND_EMAIL]: {
    name: TOOL_NAMES.SEND_EMAIL,
    description: 'Send an email to a recipient via Gmail. Consequential write action that requires explicit user confirmation.',
    permission_level: 'write',
    requires_confirmation: true,
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Subject line of the email' },
        body: { type: 'string', description: 'Complete body text of the email message' },
        cc: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional CC email addresses',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },

  // --- Task & Reminder Tools ---
  [TOOL_NAMES.CREATE_TASK]: {
    name: TOOL_NAMES.CREATE_TASK,
    description: 'Create a new task or to-do item in the user personal task manager.',
    permission_level: 'write',
    requires_confirmation: false, // Low-friction task capture
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title or action description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Priority level (default: medium)' },
        due_date: { type: 'string', description: 'Optional ISO date for task deadline' },
        description: { type: 'string', description: 'Additional details or checklist items' },
      },
      required: ['title'],
    },
  },

  [TOOL_NAMES.LIST_TASKS]: {
    name: TOOL_NAMES.LIST_TASKS,
    description: 'List user tasks, pending action items, and completed items.',
    permission_level: 'read',
    requires_confirmation: false,
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'completed', 'cancelled'], description: 'Filter by task status' },
      },
      required: [],
    },
  },

  [TOOL_NAMES.COMPLETE_TASK]: {
    name: TOOL_NAMES.COMPLETE_TASK,
    description: 'Mark a task as completed.',
    permission_level: 'write',
    requires_confirmation: false,
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to mark as completed' },
      },
      required: ['task_id'],
    },
  },
};

/**
 * Returns tools formatted for Anthropic SDK tool calling
 */
export function getAnthropicToolDefinitions(): Anthropic.Tool[] {
  return Object.values(TOOL_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
  }));
}

/**
 * Checks if a tool call requires user confirmation card
 */
export function doesToolRequireConfirmation(toolName: string): boolean {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    return SENSITIVE_WRITE_TOOLS.includes(toolName);
  }
  return tool.requires_confirmation;
}
