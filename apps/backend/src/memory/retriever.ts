import { query } from '../db';
import { Memory, MemoryCategory } from '@kairo/shared';
import { generateEmbedding, formatVectorForPg } from './embeddings';

export interface RetrievedMemory extends Memory {
  similarity: number;
  importance_score: number;
  recency_boost: number;
  final_score: number;
}

export interface RetrievalOptions {
  limit?: number;
  threshold?: number;
  category?: MemoryCategory;
}

/**
 * Retrieves the most relevant long-term memories for a user given a query string.
 * Uses pgvector cosine distance + exponential recency decay + importance weighting.
 */
export async function retrieveRelevantMemories(
  userId: string,
  queryText: string,
  options: RetrievalOptions = {}
): Promise<RetrievedMemory[]> {
  const limit = options.limit || 6;
  const threshold = options.threshold || 0.40;

  try {
    const queryVector = await generateEmbedding(queryText);
    const vectorLiteral = formatVectorForPg(queryVector);

    // Call stored procedure match_memories
    const result = await query<RetrievedMemory>(
      `SELECT * FROM match_memories($1::uuid, $2::vector, $3::float, $4::int)`,
      [userId, vectorLiteral, threshold, limit]
    );

    if (result.rows.length > 0) {
      // Asynchronously update last_accessed_at and access_count for retrieved memories
      const memoryIds = result.rows.map((m) => m.id);
      query(
        `UPDATE memories
         SET last_accessed_at = NOW(),
             access_count = access_count + 1
         WHERE id = ANY($1::uuid[])`,
        [memoryIds]
      ).catch((err) => console.warn('[Memory Access Update Error]:', err.message));
    }

    return result.rows;
  } catch (err: any) {
    console.warn('[Memory Retrieval Fallback] Falling back to recent memories:', err.message);
    try {
      // Fallback to recent unarchived memories if vector extension isn't populated yet
      const fallbackResult = await query<RetrievedMemory>(
        `SELECT id, category, content, importance_score, confidence_score,
                source_type, source_id, access_count, last_accessed_at, is_pinned,
                is_archived, created_at, updated_at,
                0.80 AS similarity, 1.0 AS recency_boost, 0.85 AS final_score
         FROM memories
         WHERE user_id = $1 AND is_archived = FALSE
         ORDER BY is_pinned DESC, importance_score DESC, updated_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return fallbackResult.rows;
    } catch {
      return [];
    }
  }
}
