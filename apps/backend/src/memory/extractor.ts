import Anthropic from '@anthropic-ai/sdk';
import { query } from '../db';
import { config } from '../config';
import { MemoryCategory, MemorySource } from '@orbit/shared';
import { generateEmbedding, formatVectorForPg } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

export interface ExtractedFact {
  content: string;
  category: MemoryCategory;
  importance_score: number;
  confidence_score: number;
}

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!anthropicClient && config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Analyzes conversation messages and extracts novel facts, user preferences, goals, and routines.
 */
export async function extractMemoriesFromConversation(
  userId: string,
  userMessage: string,
  assistantMessage?: string,
  sourceId?: string
): Promise<ExtractedFact[]> {
  const client = getClient();

  let extractedFacts: ExtractedFact[] = [];

  if (client) {
    try {
      const prompt = `You are the Memory Extraction Engine for Orbit, a personal AI agent.
Analyze the following user input and optional assistant response. Extract any key personal facts, explicit preferences, professional goals, ongoing projects, routines, or important relationships worth remembering long-term.

User Message: "${userMessage}"
${assistantMessage ? `Assistant Response: "${assistantMessage}"` : ''}

Output ONLY a JSON array of objects with the following schema, or [] if no lasting facts exist:
[
  {
    "content": "Clear, concise statement in 3rd person about the user (e.g. 'Prefers dark mode UI', 'Founder of Acme Corp')",
    "category": "fact" | "preference" | "relationship" | "goal" | "project" | "routine",
    "importance_score": 1-10 (1 = trivial trivia, 10 = core life identity or urgent priority),
    "confidence_score": 0.5-1.0
  }
]
Do NOT extract ephemeral queries like 'What is the weather today' or 'Calculate 2+2'.
Respond with valid JSON only.`;

      const response = await client.messages.create({
        model: config.ANTHROPIC_FAST_MODEL, // Claude 3.5 Haiku for fast sub-second extraction
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = response.content[0];
      if (block && block.type === 'text') {
        const jsonMatch = block.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          extractedFacts = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (err: any) {
      console.warn('[Memory Extraction API Warning]:', err.message);
    }
  } else {
    // Intelligent heuristic extractor for local development and unit tests
    extractedFacts = ruleBasedExtractor(userMessage);
  }

  // Persist extracted facts with deduplication & conflict resolution
  for (const fact of extractedFacts) {
    await storeMemoryWithConflictResolution(userId, fact, 'conversation', sourceId);
  }

  return extractedFacts;
}

/**
 * Stores a memory while performing semantic deduplication and conflict resolution.
 */
export async function storeMemoryWithConflictResolution(
  userId: string,
  fact: ExtractedFact,
  sourceType: MemorySource = 'conversation',
  sourceId?: string
): Promise<string> {
  const newId = uuidv4();
  const embedding = await generateEmbedding(fact.content);
  const vectorLiteral = formatVectorForPg(embedding);

  try {
    // 1. Check for semantically similar existing memory (cosine similarity > 0.82)
    const similarCheck = await query(
      `SELECT id, content, importance_score,
              (1 - (embedding <=> $1::vector)) AS similarity
       FROM memories
       WHERE user_id = $2 AND is_archived = FALSE AND superseded_by IS NULL
         AND (1 - (embedding <=> $1::vector)) > 0.82
       ORDER BY similarity DESC
       LIMIT 1`,
      [vectorLiteral, userId]
    );

    if (similarCheck.rows.length > 0) {
      const existing = similarCheck.rows[0];

      // If virtually identical (>0.94), reinforce access count and update timestamp
      if (existing.similarity > 0.94) {
        await query(
          `UPDATE memories
           SET access_count = access_count + 1,
               last_accessed_at = NOW(),
               importance_score = GREATEST(importance_score, $1),
               updated_at = NOW()
           WHERE id = $2`,
          [fact.importance_score, existing.id]
        );
        return existing.id;
      }

      // If high similarity (0.82 - 0.94), this is a fact revision/update (e.g. "I moved from SF to NYC")
      // Supersede the existing memory
      await query(
        `UPDATE memories
         SET is_archived = TRUE,
             superseded_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [newId, existing.id]
      );
      console.log(`[Memory Engine] Fact updated: superseded ${existing.id} with new fact.`);
    }

    // 2. Insert new memory
    await query(
      `INSERT INTO memories (
        id, user_id, category, content, embedding,
        importance_score, confidence_score, source_type, source_id
      ) VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9)`,
      [
        newId,
        userId,
        fact.category,
        fact.content,
        vectorLiteral,
        fact.importance_score,
        fact.confidence_score,
        sourceType,
        sourceId || null,
      ]
    );

    return newId;
  } catch (err: any) {
    console.error('[Memory Storage Error]:', err.message);
    // Fallback without vector literal if pgvector is not initialized
    const fallbackId = uuidv4();
    await query(
      `INSERT INTO memories (
        id, user_id, category, content,
        importance_score, confidence_score, source_type, source_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        fallbackId,
        userId,
        fact.category,
        fact.content,
        fact.importance_score,
        fact.confidence_score,
        sourceType,
        sourceId || null,
      ]
    ).catch(() => {});
    return fallbackId;
  }
}

/**
 * Heuristic extractor for common preference phrases (offline/dev fallback).
 */
function ruleBasedExtractor(text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('prefer') || lower.includes('i like') || lower.includes('i love')) {
    facts.push({
      content: text,
      category: 'preference',
      importance_score: 7,
      confidence_score: 0.9,
    });
  } else if (lower.includes('my goal') || lower.includes('i want to achieve') || lower.includes('planning to')) {
    facts.push({
      content: text,
      category: 'goal',
      importance_score: 8,
      confidence_score: 0.85,
    });
  } else if (lower.includes('i work on') || lower.includes('building') || lower.includes('my project')) {
    facts.push({
      content: text,
      category: 'project',
      importance_score: 8,
      confidence_score: 0.9,
    });
  } else if (lower.includes('my name is') || lower.includes('i live in') || lower.includes('based in')) {
    facts.push({
      content: text,
      category: 'fact',
      importance_score: 9,
      confidence_score: 0.95,
    });
  }

  return facts;
}
