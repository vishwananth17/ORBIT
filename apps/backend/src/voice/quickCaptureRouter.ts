// ============================================================================
// Quick Capture Router & Intent Classifier
// Classifies raw voice/text brain dumps into Tasks, Memories, or Calendar events
// ============================================================================

import { pool } from '@orbit/database';
import Anthropic from '@anthropic-ai/sdk';
import { QuickCaptureResult, QuickCaptureCategory, TaskPriority, MemoryCategory } from '@orbit/shared';
import { generateEmbedding } from '../memory/embeddings';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'mock-key',
});

export async function routeQuickCapture(userId: string, rawInput: string): Promise<QuickCaptureResult> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Quick capture input cannot be empty');
  }

  // 1. Fetch user timezone for relative date parsing
  let timezone = 'UTC';
  try {
    const userRes = await pool.query('SELECT timezone FROM users WHERE id = $1', [userId]);
    timezone = userRes.rows[0]?.timezone || 'UTC';
  } catch (err) {
    // Offline / unit-test fallback
  }
  const now = new Date();
  const currentIso = now.toISOString();

  let category: QuickCaptureCategory = 'task';
  let summary = '';
  let confidence = 0.9;
  let extractedData: QuickCaptureResult['extracted_data'] = {};

  const hasApiKey = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('mock');

  if (hasApiKey) {
    try {
      const prompt = `You are Orbit's intelligent Quick-Capture router. Analyze this user input:
"${trimmed}"

Current context:
- Current timestamp (UTC): ${currentIso}
- User timezone: ${timezone}

Classify the input into one category:
1. "task": An action item, to-do, reminder, or chore with optional deadline/priority.
2. "memory": A personal fact, enduring preference, relationship note, goal, or project context that should be remembered forever.
3. "calendar_event": A meeting, appointment, flight, or scheduled event at a specific date and time.
4. "note": A general reflection, observation, or unorganized thought.

Output strict JSON with this exact schema:
{
  "category": "task" | "memory" | "calendar_event" | "note",
  "confidence": 0.0 to 1.0,
  "summary": "Short confirmation string describing what was captured",
  "extracted_data": {
    "title": "Clear action or entity title",
    "description": "Optional details",
    "due_date": "ISO8601 string or null",
    "priority": "low" | "medium" | "high" | "urgent",
    "category": "fact" | "preference" | "relationship" | "goal" | "project" | "routine",
    "content": "Normalized statement for memory storage",
    "importance_score": 1 to 10,
    "event_start": "ISO8601 string or null",
    "event_end": "ISO8601 string or null"
  }
}`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          category = parsed.category || 'task';
          confidence = parsed.confidence ?? 0.9;
          summary = parsed.summary || '';
          extractedData = parsed.extracted_data || {};
        }
      }
    } catch (llmErr: any) {
      console.warn(`[QuickCapture] LLM classification error, falling back to heuristics:`, llmErr.message);
    }
  }

  // 2. Deterministic Heuristic Fallback
  if (!summary) {
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('remember ') ||
      lower.startsWith('i prefer ') ||
      lower.startsWith('my ') ||
      lower.includes(' is my ') ||
      lower.includes('favorite')
    ) {
      category = 'memory';
      const cleanContent = trimmed.replace(/^remember (that )?/i, '');
      const memCategory: MemoryCategory = lower.includes('prefer') || lower.includes('favorite') ? 'preference' : 'fact';
      extractedData = {
        title: cleanContent,
        content: cleanContent,
        category: memCategory,
        importance_score: 7,
      };
      summary = `Captured memory: "${cleanContent}"`;
    } else if (
      lower.startsWith('meeting') ||
      lower.startsWith('flight') ||
      lower.includes('appointment') ||
      lower.includes('call with ')
    ) {
      category = 'calendar_event';
      extractedData = {
        title: trimmed,
        event_start: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      };
      summary = `Scheduled event: "${trimmed}"`;
    } else {
      category = 'task';
      const isUrgent = lower.includes('urgent') || lower.includes('asap');
      extractedData = {
        title: trimmed,
        priority: isUrgent ? 'urgent' : 'medium',
        status: 'todo',
      };
      summary = `Created task: "${trimmed}"`;
    }
  }

  // 3. Persist to Database
  let persistedId: string | undefined;

  try {
    if (category === 'task') {
      const title = extractedData.title || trimmed;
      const desc = extractedData.description || null;
      const priority = extractedData.priority || 'medium';
      const dueDate = extractedData.due_date || null;

      const res = await pool.query(
        `INSERT INTO tasks (user_id, title, description, priority, due_date, status)
         VALUES ($1, $2, $3, $4, $5, 'todo')
         RETURNING id`,
        [userId, title, desc, priority, dueDate]
      );
      persistedId = res.rows[0]?.id;
    } else if (category === 'memory') {
      const content = extractedData.content || extractedData.title || trimmed;
      const memCat = extractedData.category || 'fact';
      const importance = extractedData.importance_score || 6;

      const embedding = await generateEmbedding(content);

      const res = await pool.query(
        `INSERT INTO memories (
           user_id, category, content, embedding, importance_score,
           confidence_score, source_type, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, 1.00, 'conversation', NOW(), NOW())
         RETURNING id`,
        [userId, memCat, content, JSON.stringify(embedding), importance]
      );
      persistedId = res.rows[0]?.id;
    } else if (category === 'calendar_event') {
      const title = extractedData.title || trimmed;
      const startTime = extractedData.event_start || new Date(Date.now() + 3600 * 1000).toISOString();

      const res = await pool.query(
        `INSERT INTO tasks (user_id, title, due_date, priority, tags, status)
         VALUES ($1, $2, $3, 'high', ARRAY['calendar_event'], 'todo')
         RETURNING id`,
        [userId, title, startTime]
      );
      persistedId = res.rows[0]?.id;
    } else {
      // General note -> saved as memory with routine/project category
      const res = await pool.query(
        `INSERT INTO tasks (user_id, title, description, priority, tags, status)
         VALUES ($1, $2, $3, 'low', ARRAY['quick_note'], 'completed')
         RETURNING id`,
        [userId, `Note: ${trimmed.slice(0, 50)}`, trimmed]
      );
      persistedId = res.rows[0]?.id;
    }
  } catch (dbErr: any) {
    console.error('[QuickCapture] Database persistence error:', dbErr.message);
  }

  return {
    category,
    raw_input: trimmed,
    summary,
    confidence,
    extracted_data: extractedData,
    persisted_id: persistedId,
  };
}
