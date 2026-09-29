import assert from 'node:assert';
import { TOOL_NAMES } from '@kairo/shared';
import {
  doesToolRequireConfirmation,
  getAnthropicToolDefinitions,
  TOOL_REGISTRY,
} from '../src/tools/registry';
import { encryptToken, decryptToken } from '../src/tools/crypto';

console.log('[Test Suite] Running Orbit Tool Registry & Security Tests...');

// 1. Test Confirmation Guardrails
console.log('1. Testing Tool Confirmation Guardrails...');
assert.strictEqual(
  doesToolRequireConfirmation(TOOL_NAMES.SEND_EMAIL),
  true,
  'send_email must strictly require confirmation'
);
assert.strictEqual(
  doesToolRequireConfirmation(TOOL_NAMES.CREATE_CALENDAR_EVENT),
  true,
  'create_calendar_event must strictly require confirmation'
);
assert.strictEqual(
  doesToolRequireConfirmation(TOOL_NAMES.DELETE_CALENDAR_EVENT),
  true,
  'delete_calendar_event must strictly require confirmation'
);
assert.strictEqual(
  doesToolRequireConfirmation(TOOL_NAMES.GET_CALENDAR_EVENTS),
  false,
  'get_calendar_events read tool must not block on confirmation'
);
assert.strictEqual(
  doesToolRequireConfirmation(TOOL_NAMES.LIST_TASKS),
  false,
  'list_tasks read tool must not block on confirmation'
);
console.log('✔ Confirmation Guardrail Tests Passed!');

// 2. Test Anthropic Tool Schemas
console.log('2. Testing Anthropic Tool Definition Export...');
const definitions = getAnthropicToolDefinitions();
assert(Array.isArray(definitions), 'Definitions must be an array');
assert(definitions.length >= 7, 'Must have registered calendar, email, and task tools');

const emailTool = definitions.find((d) => d.name === TOOL_NAMES.SEND_EMAIL);
assert(emailTool, 'send_email definition must be present');
assert.strictEqual(emailTool.input_schema.type, 'object');
assert(Array.isArray(emailTool.input_schema.required));
assert(emailTool.input_schema.required.includes('to'));
assert(emailTool.input_schema.required.includes('subject'));
console.log('✔ Anthropic Tool Definition Tests Passed!');

// 3. Test AES-256-GCM Token Encryption & Decryption
console.log('3. Testing AES-256-GCM Token Cryptography...');
const rawOAuthToken = 'ya29.a0AfH6SMDIu1234567890abcdefghijklmnopqrstuvwxyz_secret_token_123';
const encrypted = encryptToken(rawOAuthToken);
assert(Buffer.isBuffer(encrypted), 'Encrypted payload must be a Buffer');
assert(encrypted.length > rawOAuthToken.length, 'Ciphertext with IV and Tag must be longer than plaintext');

const decrypted = decryptToken(encrypted);
assert.strictEqual(decrypted, rawOAuthToken, 'Decrypted token must exactly match original plaintext');
console.log('✔ AES-256-GCM Token Cryptography Tests Passed!');

console.log('\n🎉 ALL ORBIT TOOL TESTS PASSED SUCCESSFULLY!\n');
