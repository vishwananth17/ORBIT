import assert from 'node:assert';
import { CreateCustomAgentSchema, UpdateCustomAgentSchema, TOOL_NAMES } from '@orbit/shared';
import { buildSystemPrompt } from '../src/agent/prompt';
import { getAnthropicToolDefinitions } from '../src/tools/registry';

console.log('[Test Suite] Running Orbit Custom Agents & Personas Tests (Phase 6)...');

// 1. Test Schema Validation
console.log('1. Testing Custom Agent Zod Schemas...');
const validAgent = CreateCustomAgentSchema.safeParse({
  name: 'Deep Work Sentinel',
  tagline: 'Focus defender and task breaker',
  system_prompt: 'You are a ruthless focus defender. Eliminate trivia and maintain deep concentration.',
  tone: 'stoic, encouraging, direct',
  avatar_icon: 'shield',
  enabled_tools: ['tasks_manage', 'memory_search'],
  is_default: false,
});
assert.strictEqual(validAgent.success, true, 'Valid custom agent input must succeed');

const invalidAgent = CreateCustomAgentSchema.safeParse({
  name: '', // Empty name should fail
  system_prompt: 'Short', // Less than 10 chars should fail
});
assert.strictEqual(invalidAgent.success, false, 'Invalid agent input must fail validation');

// 2. Test Prompt Injection with Custom Agent
console.log('2. Testing Dynamic System Prompt Injection...');
const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@orbit.ai',
  full_name: 'Vishw',
  avatar_url: null,
  timezone: 'UTC',
  locale: 'en-US',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const prompt = buildSystemPrompt({
  user: mockUser,
  agentName: 'Executive Chief of Staff',
  tone: 'commanding, crisp, exceptionally organized',
  customSystemPrompt: 'Anticipate calendar conflicts 48 hours in advance and aggressively guard morning hours.',
});

assert(prompt.includes('Executive Chief of Staff'), 'Prompt must use custom agent name');
assert(prompt.includes('commanding, crisp, exceptionally organized'), 'Prompt must include custom agent tone');
assert(prompt.includes('Anticipate calendar conflicts 48 hours in advance'), 'Prompt must include custom instructions');
assert(prompt.includes('[CUSTOM AGENT INSTRUCTIONS]'), 'Prompt must include custom instructions header');
console.log('✔ Custom Agent Prompt Injection Tests Passed!');

// 3. Test Tool Whitelisting / Filtering
console.log('3. Testing Tool Whitelist Filtering per Persona...');
const allTools = getAnthropicToolDefinitions();
const whitelist = [TOOL_NAMES.LIST_TASKS, TOOL_NAMES.CREATE_TASK];
const filteredTools = allTools.filter((t) => (whitelist as readonly string[]).includes(t.name));

assert.strictEqual(filteredTools.length, 2, 'Filtered tool set must only contain whitelisted tools');
assert(filteredTools.some((t) => t.name === TOOL_NAMES.LIST_TASKS), 'list_tasks must be present');
assert(filteredTools.some((t) => t.name === TOOL_NAMES.CREATE_TASK), 'create_task must be present');
assert(!filteredTools.some((t) => t.name === TOOL_NAMES.SEND_EMAIL), 'send_email must be excluded when not in whitelist');
console.log('✔ Persona Tool Filtering Tests Passed!');

console.log('✔ All Phase 6 Custom Agent Tests Passed Successfully!\n');
