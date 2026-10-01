// ============================================================================
// Orbit Backend Integration Test Suite Runner
// Executes all subsystem test suites sequentially and reports metrics
// ============================================================================

import { spawnSync } from 'child_process';
import path from 'path';

const testSuites = [
  { name: 'Groq provider safety and streaming', file: 'groq.test.ts' },
  { name: 'Foundation ownership and read continuation', file: 'foundation.test.ts' },
  { name: 'Agent Core & System Prompt', file: 'agent.test.ts' },
  { name: 'Semantic Memory & Vector Embeddings', file: 'memory.test.ts' },
  { name: 'Tool Sandboxing & Cryptography', file: 'tools.test.ts' },
  { name: 'Proactivity & Quiet Hours Engine', file: 'proactivity.test.ts' },
  { name: 'Voice STT, TTS & Intent Router', file: 'voice.test.ts' },
  { name: 'Custom Agents & Tool Whitelists (Phase 6)', file: 'custom_agents.test.ts' },
  { name: 'Daily Reflection & Insights Analytics (Phase 7)', file: 'journal.test.ts' },
];

console.log('================================================================');
console.log('🚀 [Orbit Test Suite] Running Comprehensive Backend Verifications');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;
const startTime = Date.now();

for (const suite of testSuites) {
  const filePath = path.join(__dirname, suite.file);
  console.log(`▶ Executing: ${suite.name} (${suite.file})...`);

  const result = spawnSync('npx', ['tsx', filePath], {
    env: { ...process.env, ...(suite.file === 'foundation.test.ts' ? { DEMO_MODE: 'false' } : {}) },
    shell: true,
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  if (result.status === 0) {
    passedCount++;
    console.log(`[PASS] ${suite.name}\n`);
  } else {
    failedCount++;
    console.error(`[FAIL] ${suite.name} exited with code ${result.status}\n`);
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('================================================================');
console.log(`📊 Test Summary: ${passedCount} passed, ${failedCount} failed (${duration}s)`);
console.log('================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Orbit Integration Test Suites Passed Cleanly!\n');
  process.exit(0);
}
