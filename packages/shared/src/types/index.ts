// ============================================================================
// @kairo/shared - Domain Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type MemoryCategory = 'fact' | 'preference' | 'relationship' | 'goal' | 'project' | 'routine';
export type MemorySource = 'conversation' | 'manual' | 'calendar' | 'gmail' | 'system';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type PermissionLevel = 'read' | 'draft' | 'write';
export type ConfirmationStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  user_id: string;
  push_token: string | null;
  quiet_hours_start: string;
  quiet_hours_end: string;
  morning_brief_time: string;
  evening_review_time: string;
  proactive_nudges_enabled: boolean;
  smart_reminders_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  custom_agent_id?: string | null;
  title: string;
  summary?: string | null;
  is_archived: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
  message_count?: number;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  permission_level: PermissionLevel;
  requires_confirmation: boolean;
}

export interface ToolResultPayload {
  tool_call_id: string;
  name: string;
  result: unknown;
  error?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  tool_calls?: ToolCallPayload[] | null;
  tool_results?: ToolResultPayload[] | null;
  tokens_prompt?: number;
  tokens_completion?: number;
  model: string;
  created_at: string;
}

// Server-Sent Events (SSE) Stream Protocols
export type StreamEventType =
  | 'session_start'
  | 'token'
  | 'tool_start'
  | 'tool_confirmation_required'
  | 'tool_result'
  | 'message_saved'
  | 'done'
  | 'error';

export interface StreamEventSessionStart {
  type: 'session_start';
  conversation_id: string;
  user_message_id: string;
  assistant_message_id: string;
}

export interface StreamEventToken {
  type: 'token';
  text: string;
}

export interface StreamEventToolStart {
  type: 'tool_start';
  tool_name: string;
  input: Record<string, unknown>;
}

export interface StreamEventToolConfirmationRequired {
  type: 'tool_confirmation_required';
  action_id: string;
  tool_name: string;
  permission_level: PermissionLevel;
  action_payload: Record<string, unknown>;
  description: string;
}

export interface StreamEventToolResult {
  type: 'tool_result';
  tool_name: string;
  result: unknown;
}

export interface StreamEventMessageSaved {
  type: 'message_saved';
  message: Message;
}

export interface StreamEventDone {
  type: 'done';
  conversation_id: string;
  assistant_message_id: string;
  total_tokens?: number;
}

export interface StreamEventError {
  type: 'error';
  message: string;
  code?: string;
}

export type StreamEvent =
  | StreamEventSessionStart
  | StreamEventToken
  | StreamEventToolStart
  | StreamEventToolConfirmationRequired
  | StreamEventToolResult
  | StreamEventMessageSaved
  | StreamEventDone
  | StreamEventError;

export interface Memory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  importance_score: number;
  confidence_score: number;
  source_type: MemorySource;
  source_id?: string | null;
  access_count: number;
  last_accessed_at: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  similarity?: number;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  reminder_at?: string | null;
  completed_at?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActionLog {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  message_id?: string | null;
  tool_name: string;
  permission_level: PermissionLevel;
  action_payload: Record<string, unknown>;
  confirmation_status: ConfirmationStatus;
  result_payload?: Record<string, unknown> | null;
  error_message?: string | null;
  executed_at?: string | null;
  created_at: string;
}

export type BriefType = 'morning_brief' | 'evening_review' | 'smart_nudge';

export interface AgendaItem {
  id: string;
  type: 'calendar_event' | 'task';
  title: string;
  time?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  completed?: boolean;
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  action_type: 'draft_email' | 'prepare_meeting' | 'reschedule_task' | 'log_memory' | 'custom';
  payload?: Record<string, unknown>;
}

export interface DailyBrief {
  id: string;
  user_id: string;
  date: string;
  type: BriefType;
  title: string;
  summary: string;
  agenda_items: AgendaItem[];
  suggested_actions: SuggestedAction[];
  audio_summary?: string | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProactiveNudge {
  id: string;
  user_id: string;
  title: string;
  body: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  is_dismissed: boolean;
  delivered_at?: string | null;
  created_at: string;
}

export interface NotificationSettingsUpdate {
  push_token?: string | null;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  morning_brief_time?: string;
  evening_review_time?: string;
  proactive_nudges_enabled?: boolean;
  smart_reminders_enabled?: boolean;
}

