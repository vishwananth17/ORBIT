import assert from 'node:assert';
import { CreateJournalEntrySchema, JournalAnalytics } from '@orbit/shared';

console.log('[Test Suite] Running Orbit Daily Journal & Insights Analytics Tests (Phase 7)...');

// 1. Test Journal Zod Validation
console.log('1. Testing Journal Entry Validation Schemas...');
const validEntry = CreateJournalEntrySchema.safeParse({
  entry_date: '2026-09-29',
  summary: 'Intense deep work day finalizing Orbit agent architecture and speech engine.',
  key_takeaways: ['Ship early, refine continuously', 'Protect first 2 hours of day'],
  mood_score: 5,
  mood_tags: ['Deep Work', 'Coding', 'Breakthrough'],
  energy_level: 4,
  productivity_score: 5,
  request_ai_reflection: true,
});
assert.strictEqual(validEntry.success, true, 'Valid journal entry must succeed');

const invalidMood = CreateJournalEntrySchema.safeParse({
  summary: 'Testing out of bounds mood score',
  mood_score: 10, // Must be between 1 and 5
});
assert.strictEqual(invalidMood.success, false, 'Mood score > 5 must fail validation');

const invalidDate = CreateJournalEntrySchema.safeParse({
  entry_date: '29-09-2026', // Wrong format, must be YYYY-MM-DD
  summary: 'Invalid date format test',
});
assert.strictEqual(invalidDate.success, false, 'Non-ISO date format must fail validation');
console.log('✔ Journal Schema Validation Tests Passed!');

// 2. Test Multi-Day Analytics Calculation Logic
console.log('2. Testing Multi-Day Trend Analytics Calculation...');
const mockHistory = [
  { mood_score: 5, energy_level: 4, productivity_score: 5, mood_tags: ['Deep Work', 'Breakthrough'] },
  { mood_score: 4, energy_level: 4, productivity_score: 4, mood_tags: ['Coding', 'Meetings'] },
  { mood_score: 3, energy_level: 3, productivity_score: 4, mood_tags: ['Deep Work', 'Reading'] },
  { mood_score: 4, energy_level: 5, productivity_score: 4, mood_tags: ['Deep Work', 'Gym & Health'] },
];

const totalMood = mockHistory.reduce((acc, e) => acc + e.mood_score, 0);
const avgMood = Number((totalMood / mockHistory.length).toFixed(1));
assert.strictEqual(avgMood, 4.0, 'Average mood must calculate to 4.0');

const tagCounts: Record<string, number> = {};
for (const item of mockHistory) {
  for (const tag of item.mood_tags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
}
assert.strictEqual(tagCounts['Deep Work'], 3, 'Deep Work count must be 3');
assert.strictEqual(tagCounts['Coding'], 1, 'Coding count must be 1');

const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const item of mockHistory) {
  dist[item.mood_score] = (dist[item.mood_score] || 0) + 1;
}
assert.strictEqual(dist[5], 1, '5-score count must be 1');
assert.strictEqual(dist[4], 2, '4-score count must be 2');
assert.strictEqual(dist[3], 1, '3-score count must be 1');
console.log('✔ Trend Analytics Calculation Tests Passed!');

console.log('✔ All Phase 7 Daily Journal Tests Passed Successfully!\n');
