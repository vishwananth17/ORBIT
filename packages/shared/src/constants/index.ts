// ============================================================================
// @orbit/shared - System Constants
// ============================================================================

export const APP_NAME = 'Orbit';
export const APP_TAGLINE = 'Proactive, memory-driven personal agent';

export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
export const FAST_MODEL = 'claude-3-5-haiku-20241022';

export const API_VERSION = 'v1';

export const SYSTEM_DEFAULTS = {
  QUIET_HOURS_START: '22:00:00',
  QUIET_HOURS_END: '07:30:00',
  MORNING_BRIEF_TIME: '08:00:00',
  EVENING_REVIEW_TIME: '20:30:00',
  PROACTIVE_NUDGES_ENABLED: true,
  SMART_REMINDERS_ENABLED: true,
};

export const TOOL_NAMES = {
  // Calendar
  GET_CALENDAR_EVENTS: 'get_calendar_events',
  CREATE_CALENDAR_EVENT: 'create_calendar_event',
  DELETE_CALENDAR_EVENT: 'delete_calendar_event',

  // Email
  SEARCH_EMAILS: 'search_emails',
  READ_EMAIL: 'read_email',
  DRAFT_EMAIL: 'draft_email',
  SEND_EMAIL: 'send_email',

  // Tasks & Reminders
  CREATE_TASK: 'create_task',
  LIST_TASKS: 'list_tasks',
  COMPLETE_TASK: 'complete_task',
  SET_REMINDER: 'set_reminder',

  // Memory
  SEARCH_MEMORIES: 'search_memories',
  SAVE_MEMORY: 'save_memory',
  DELETE_MEMORY: 'delete_memory',
} as const;

export const SENSITIVE_WRITE_TOOLS: readonly string[] = [
  TOOL_NAMES.CREATE_CALENDAR_EVENT,
  TOOL_NAMES.DELETE_CALENDAR_EVENT,
  TOOL_NAMES.SEND_EMAIL,
  TOOL_NAMES.DELETE_MEMORY,
];
