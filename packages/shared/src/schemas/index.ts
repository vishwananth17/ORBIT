// ============================================================================
// @orbit/shared - Zod Validation Schemas
// ============================================================================

import { z } from 'zod';

export const CreateConversationSchema = z.object({
  title: z.string().min(1).max(120).optional().default('New Conversation'),
  custom_agent_id: z.string().uuid().optional().nullable(),
});

export const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  is_archived: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid().optional(), // If omitted, server creates a new conversation
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message is too long'),
  custom_agent_id: z.string().uuid().optional().nullable(),
  client_timestamp: z.string().optional(),
});

export const UpdateSettingsSchema = z.object({
  quiet_hours_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):?([0-5]\d)?$/, 'Invalid time format HH:MM').optional(),
  quiet_hours_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):?([0-5]\d)?$/, 'Invalid time format HH:MM').optional(),
  morning_brief_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):?([0-5]\d)?$/, 'Invalid time format HH:MM').optional(),
  evening_review_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):?([0-5]\d)?$/, 'Invalid time format HH:MM').optional(),
  proactive_nudges_enabled: z.boolean().optional(),
  smart_reminders_enabled: z.boolean().optional(),
  push_token: z.string().nullable().optional(),
});

export const ConfirmActionSchema = z.object({
  action_id: z.string().uuid(),
  approved: z.boolean(),
  modified_payload: z.record(z.unknown()).optional(),
});

export const CreateMemorySchema = z.object({
  category: z.enum(['fact', 'preference', 'relationship', 'goal', 'project', 'routine']).default('fact'),
  content: z.string().min(3).max(1000),
  importance_score: z.number().int().min(1).max(10).default(5),
  is_pinned: z.boolean().optional().default(false),
});

export const UpdateMemorySchema = z.object({
  content: z.string().min(3).max(1000).optional(),
  importance_score: z.number().int().min(1).max(10).optional(),
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const CreateCustomAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(60),
  tagline: z.string().max(120).optional().nullable(),
  system_prompt: z.string().min(10, 'System prompt must be at least 10 characters').max(5000),
  tone: z.string().max(100).optional().default('concise, thoughtful, proactive'),
  avatar_icon: z.string().max(50).optional().default('bot'),
  enabled_tools: z.array(z.string()).optional().default(['calendar_read', 'tasks_manage', 'memory_search']),
  is_default: z.boolean().optional().default(false),
});

export const UpdateCustomAgentSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  tagline: z.string().max(120).optional().nullable(),
  system_prompt: z.string().min(10).max(5000).optional(),
  tone: z.string().max(100).optional(),
  avatar_icon: z.string().max(50).optional(),
  enabled_tools: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

export const CreateJournalEntrySchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional(),
  summary: z.string().min(3, 'Summary must be at least 3 characters').max(4000),
  key_takeaways: z.array(z.string()).optional().default([]),
  mood_score: z.number().int().min(1).max(5).optional().default(3),
  mood_tags: z.array(z.string()).optional().default([]),
  energy_level: z.number().int().min(1).max(5).optional().default(3),
  productivity_score: z.number().int().min(1).max(5).optional().default(3),
  request_ai_reflection: z.boolean().optional().default(true),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type ConfirmActionInput = z.infer<typeof ConfirmActionSchema>;
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
export type CreateCustomAgentInputSchema = z.infer<typeof CreateCustomAgentSchema>;
export type UpdateCustomAgentInputSchema = z.infer<typeof UpdateCustomAgentSchema>;
export type CreateJournalEntryInputSchema = z.infer<typeof CreateJournalEntrySchema>;

