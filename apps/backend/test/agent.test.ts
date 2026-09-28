import assert from 'node:assert';
import { buildSystemPrompt } from '../src/agent/prompt';
import {
  CreateConversationSchema,
  SendMessageSchema,
  UpdateSettingsSchema,
} from '@kairo/shared';

console.log('[Test Suite] Running Orbit Backend & Agent Core Tests...');

// 1. Test Prompt Builder
console.log('1. Testing Prompt Assembly...');
const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@orbit.ai',
  full_name: 'Alex Rivera',
  avatar_url: null,
  timezone: 'America/New_York',
  locale: 'en-US',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockMemories: any[] = [
  {
    id: 'mem-1',
    category: 'preference',
    content: 'Prefers concise updates in bullet points',
    importance_score: 8,
  },
];

const prompt = buildSystemPrompt({
  user: mockUser,
  memories: mockMemories,
});

assert(prompt.includes('Alex Rivera'), 'Prompt must contain user name');
assert(prompt.includes('Orbit'), 'Prompt must contain agent name Orbit');
assert(prompt.includes('Prefers concise updates in bullet points'), 'Prompt must contain recalled memory');
assert(prompt.includes('CONSEQUENTIAL ACTION CONFIRMATION'), 'Prompt must enforce confirmation guardrail');
console.log('✔ Prompt Assembly Tests Passed!');

// 2. Test Zod Schemas
console.log('2. Testing Zod Validation Schemas...');
const validSend = SendMessageSchema.safeParse({
  content: 'Plan my daily schedule for tomorrow morning.',
});
assert(validSend.success === true, 'Valid message must parse successfully');

const emptySend = SendMessageSchema.safeParse({
  content: '',
});
assert(emptySend.success === false, 'Empty message must fail validation');

const validSettings = UpdateSettingsSchema.safeParse({
  quiet_hours_start: '23:00',
  morning_brief_time: '07:30',
  proactive_nudges_enabled: true,
});
assert(validSettings.success === true, 'Valid settings must parse successfully');
console.log('✔ Zod Schema Tests Passed!');

console.log('\n🎉 ALL ORBIT AGENT TESTS PASSED SUCCESSFULLY!\n');
