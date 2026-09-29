import assert from 'node:assert';
import { generateEmbedding, generateDeterministicEmbedding } from '../src/memory/embeddings';

console.log('[Test Suite] Running Orbit Memory Engine Unit Tests...');

async function runTests() {
  // 1. Test Embedding Generation
  console.log('1. Testing Vector Embedding Generation...');
  const vector = await generateEmbedding('I prefer deep work sessions before noon.');
  assert(Array.isArray(vector), 'Vector must be an array');
  assert.strictEqual(vector.length, 1536, 'Vector dimension must be exactly 1536');

  // Verify vector is normalized (unit vector length ~ 1.0)
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  assert(Math.abs(norm - 1.0) < 0.01, 'Vector must be normalized to unit length');
  console.log('✔ Vector Embedding Generation Passed! (1536d normalized)');

  // 2. Test Determinism & Consistency
  console.log('2. Testing Deterministic Vector Seed Consistency...');
  const vectorA = generateDeterministicEmbedding('Orbit personal agent');
  const vectorB = generateDeterministicEmbedding('Orbit personal agent');
  assert.deepStrictEqual(vectorA, vectorB, 'Identical texts must produce identical embeddings');

  const vectorDifferent = generateDeterministicEmbedding('Completely unrelated topic about gardening');
  assert.notDeepStrictEqual(vectorA, vectorDifferent, 'Different texts must produce different embeddings');
  console.log('✔ Deterministic Embedding Consistency Passed!');

  console.log('\n🎉 ALL ORBIT MEMORY ENGINE TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
