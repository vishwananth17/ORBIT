// ============================================================================
// Voice & Quick Capture Engine Unit Tests
// ============================================================================

import assert from 'node:assert';
import { transcribeAudio } from '../src/voice/stt';
import { synthesizeSpeech } from '../src/voice/tts';
import { routeQuickCapture } from '../src/voice/quickCaptureRouter';

async function runTests() {
  console.log('🎙️ Starting Orbit Voice & Quick Capture Unit Tests...\n');

  // Test 1: Speech-to-Text (STT) fallback handling
  console.log('1. Testing transcribeAudio()...');
  const dummyAudioBase64 = Buffer.from('mock-audio-bytes-for-unit-testing').toString('base64');
  const sttResult = await transcribeAudio({ audioBase64: dummyAudioBase64 });
  assert.ok(sttResult.text, 'Transcription text must not be empty');
  assert.strictEqual(typeof sttResult.text, 'string');
  console.log(`   ✅ STT transcription passed: "${sttResult.text.slice(0, 40)}..."`);

  // Test 2: Text-to-Speech (TTS)
  console.log('2. Testing synthesizeSpeech()...');
  const ttsResult = await synthesizeSpeech({
    text: 'Good morning, Vish. Here is your Orbit daily brief.',
    voice: 'nova',
  });
  assert.ok(ttsResult.audio_base64, 'Audio base64 must be present');
  assert.strictEqual(ttsResult.format, 'mp3');
  console.log('   ✅ TTS synthesis passed: Generated MP3 base64 payload.');

  // Test 3: Quick Capture - Task Routing
  console.log('3. Testing routeQuickCapture() with Task intent...');
  const taskResult = await routeQuickCapture('00000000-0000-0000-0000-000000000001', 'Submit quarterly tax report tomorrow afternoon');
  assert.strictEqual(taskResult.category, 'task');
  assert.ok(taskResult.summary.length > 0);
  assert.ok(taskResult.extracted_data.title);
  console.log(`   ✅ Task classified: "${taskResult.summary}"`);

  // Test 4: Quick Capture - Memory Routing
  console.log('4. Testing routeQuickCapture() with Memory intent...');
  const memoryResult = await routeQuickCapture('00000000-0000-0000-0000-000000000001', 'Remember that my sister Sarah is a pediatric surgeon in Seattle');
  assert.strictEqual(memoryResult.category, 'memory');
  assert.ok(memoryResult.summary.length > 0);
  console.log(`   ✅ Memory classified: "${memoryResult.summary}"`);

  // Test 5: Quick Capture - Calendar Event Routing
  console.log('5. Testing routeQuickCapture() with Calendar Event intent...');
  const eventResult = await routeQuickCapture('00000000-0000-0000-0000-000000000001', 'Meeting with venture team on Friday at 2 PM');
  assert.strictEqual(eventResult.category, 'calendar_event');
  assert.ok(eventResult.summary.length > 0);
  console.log(`   ✅ Calendar Event classified: "${eventResult.summary}"`);

  console.log('\n🎉 ALL ORBIT VOICE & QUICK CAPTURE TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Voice tests failed:', err);
  process.exit(1);
});
