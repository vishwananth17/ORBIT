// ============================================================================
// Proactivity & Quiet Hours Unit Tests
// ============================================================================

import assert from 'node:assert';
import { isCurrentlyInQuietHours, timeStringToMinutes } from '../src/proactivity/quietHours';

async function runTests() {
  console.log('🧪 Starting Proactivity Engine Unit Tests...\n');

  // Test 1: timeStringToMinutes
  console.log('1. Testing timeStringToMinutes()...');
  assert.strictEqual(timeStringToMinutes('00:00'), 0);
  assert.strictEqual(timeStringToMinutes('08:30'), 510);
  assert.strictEqual(timeStringToMinutes('22:00:00'), 1320);
  assert.strictEqual(timeStringToMinutes('23:59:59'), 1439);
  console.log('   ✅ timeStringToMinutes passed.');

  // Test 2: isCurrentlyInQuietHours (Overnight Window: 22:00 -> 07:30)
  console.log('2. Testing isCurrentlyInQuietHours() with overnight window (22:00 - 07:30 UTC)...');
  const overnightConfig = {
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:30:00',
    timezone: 'UTC',
  };

  // 23:15 UTC -> Inside quiet hours
  const nightDate = new Date('2026-09-29T23:15:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(overnightConfig, nightDate), true, '23:15 should be inside quiet hours');

  // 03:30 UTC -> Inside quiet hours
  const earlyMorningDate = new Date('2026-09-29T03:30:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(overnightConfig, earlyMorningDate), true, '03:30 should be inside quiet hours');

  // 07:29 UTC -> Inside quiet hours
  const justBeforeEndDate = new Date('2026-09-29T07:29:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(overnightConfig, justBeforeEndDate), true, '07:29 should be inside quiet hours');

  // 07:31 UTC -> Outside quiet hours
  const justAfterEndDate = new Date('2026-09-29T07:31:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(overnightConfig, justAfterEndDate), false, '07:31 should be outside quiet hours');

  // 14:00 UTC -> Outside quiet hours
  const afternoonDate = new Date('2026-09-29T14:00:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(overnightConfig, afternoonDate), false, '14:00 should be outside quiet hours');
  console.log('   ✅ Overnight quiet hours detection passed.');

  // Test 3: isCurrentlyInQuietHours (Daytime Window: 13:00 -> 15:00 UTC)
  console.log('3. Testing isCurrentlyInQuietHours() with daytime window (13:00 - 15:00 UTC)...');
  const daytimeConfig = {
    quiet_hours_start: '13:00:00',
    quiet_hours_end: '15:00:00',
    timezone: 'UTC',
  };

  assert.strictEqual(isCurrentlyInQuietHours(daytimeConfig, new Date('2026-09-29T12:59:00Z')), false);
  assert.strictEqual(isCurrentlyInQuietHours(daytimeConfig, new Date('2026-09-29T13:30:00Z')), true);
  assert.strictEqual(isCurrentlyInQuietHours(daytimeConfig, new Date('2026-09-29T15:01:00Z')), false);
  console.log('   ✅ Daytime quiet hours detection passed.');

  // Test 4: Timezone conversions
  console.log('4. Testing quiet hours with specific timezone (Asia/Kolkata +05:30)...');
  const istConfig = {
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:30:00',
    timezone: 'Asia/Kolkata',
  };
  // 17:00 UTC is 22:30 IST -> should be inside quiet hours
  const istNightUtc = new Date('2026-09-29T17:00:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(istConfig, istNightUtc), true, '17:00 UTC (22:30 IST) should be inside quiet hours');

  // 05:00 UTC is 10:30 IST -> should be outside quiet hours
  const istMorningUtc = new Date('2026-09-29T05:00:00Z');
  assert.strictEqual(isCurrentlyInQuietHours(istConfig, istMorningUtc), false, '05:00 UTC (10:30 IST) should be outside quiet hours');
  console.log('   ✅ Timezone conversion quiet hours passed.');

  console.log('\n🎉 ALL PROACTIVITY TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Proactivity tests failed:', err);
  process.exit(1);
});
