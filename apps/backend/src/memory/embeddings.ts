import crypto from 'crypto';
import { config } from '../config';

const EMBEDDING_DIMENSION = 1536;

/**
 * Generates a 1536-dimensional vector embedding for the input text.
 * Uses OpenAI text-embedding-3-small if OPENAI_API_KEY is configured,
 * otherwise generates a deterministic unit vector for development and testing.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n/g, ' ').trim();
  if (!cleanText) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // 1. Production: OpenAI API if key available
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
          input: cleanText,
          dimensions: EMBEDDING_DIMENSION,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      } else {
        const err = await response.text();
        console.warn('[Embedding API Warning] OpenAI failed, using fallback:', err);
      }
    } catch (err: any) {
      console.warn('[Embedding API Warning] Fetch error, using fallback:', err.message);
    }
  }

  // 2. Development/Mock: Deterministic unit vector generation
  return generateDeterministicEmbedding(cleanText);
}

/**
 * Generates a deterministic unit vector based on text hash.
 * This guarantees consistent cosine similarity for testing without paid API calls.
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const vector: number[] = new Array(EMBEDDING_DIMENSION);
  const hash = crypto.createHash('sha256').update(text.toLowerCase()).digest();
  
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    // Generate pseudo-random numbers seeded by hash and index
    const seed = (hash[i % hash.length] + i * 31) % 256;
    const val = (seed / 128.0) - 1.0;
    vector[i] = val;
    norm += val * val;
  }

  // Normalize to unit vector
  norm = Math.sqrt(norm);
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    vector[i] = vector[i] / norm;
  }

  return vector;
}

/**
 * Format an embedding array to a pgvector string literal: "[0.123,0.456,...]"
 */
export function formatVectorForPg(vector: number[]): string {
  return `[${vector.map((n) => Number(n.toFixed(6))).join(',')}]`;
}
