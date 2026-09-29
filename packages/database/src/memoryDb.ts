// ============================================================================
// Zero-Docker In-Memory Fallback Database
// Provides a local in-memory relational store when PostgreSQL is not running.
// ============================================================================

import { QueryResult, QueryResultRow } from 'pg';

export interface InMemoryStore {
  users: any[];
  auth_users: any[];
  notification_settings: any[];
  custom_agents: any[];
  conversations: any[];
  messages: any[];
  memories: any[];
  tasks: any[];
  reminders: any[];
  integrations: any[];
  action_logs: any[];
  daily_briefs: any[];
  proactive_nudges: any[];
  journal_entries: any[];
}

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const today = new Date().toISOString().split('T')[0];

function createInitialStore(): InMemoryStore {
  return {
    auth_users: [
      { id: DEMO_USER_ID, email: 'vishw@orbit.ai', created_at: new Date().toISOString() },
    ],
    users: [
      {
        id: DEMO_USER_ID,
        email: 'vishw@orbit.ai',
        full_name: 'Vishw',
        timezone: 'Asia/Kolkata',
        locale: 'en-US',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    notification_settings: [
      {
        id: 'settings-1',
        user_id: DEMO_USER_ID,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '07:30:00',
        morning_brief_time: '08:00:00',
        evening_review_time: '20:30:00',
        proactive_nudges_enabled: true,
        smart_reminders_enabled: true,
        push_token: null,
      },
    ],
    custom_agents: [
      {
        id: 'agent-chief-of-staff',
        user_id: DEMO_USER_ID,
        name: 'Executive Chief of Staff',
        tagline: 'High-leverage calendar triage, briefing, and proactive delegation',
        system_prompt: 'You are an elite Executive Chief of Staff to the user. Prioritize extreme density, brevity, action-oriented bullet points, and proactive calendar scheduling.',
        tone: 'commanding, crisp, exceptionally organized, proactive',
        avatar_icon: 'briefcase',
        enabled_tools: ['calendar_read', 'calendar_write', 'tasks_manage', 'memory_search', 'send_email'],
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'agent-deep-work',
        user_id: DEMO_USER_ID,
        name: 'Deep Work Sentinel',
        tagline: 'Ruthless focus defender, task breaker, and distraction blocker',
        system_prompt: 'You are a Deep Work Sentinel. Protect cognitive flow, break projects into 25-minute Pomodoro sprints, and eliminate trivia.',
        tone: 'stoic, focused, encouraging, high-agency',
        avatar_icon: 'shield',
        enabled_tools: ['tasks_manage', 'memory_search'],
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'agent-founder-advisor',
        user_id: DEMO_USER_ID,
        name: 'Founder & Venture Advisor',
        tagline: 'Strategic sparring partner for product, fundraising, and go-to-market',
        system_prompt: 'You are a seasoned Silicon Valley founder and venture advisor. Challenge assumptions, demand ruthless prioritization, and give first-principles feedback.',
        tone: 'sharp, incisive, visionary, pragmatic',
        avatar_icon: 'trending-up',
        enabled_tools: ['memory_search', 'tasks_manage'],
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    conversations: [
      {
        id: 'conv-demo-1',
        user_id: DEMO_USER_ID,
        custom_agent_id: 'agent-chief-of-staff',
        title: 'Sprint Planning & Architecture',
        is_archived: false,
        pinned: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg-1',
        conversation_id: 'conv-demo-1',
        user_id: DEMO_USER_ID,
        role: 'user',
        content: 'What are our highest leverage priorities for this week?',
        model: 'claude-3-5-sonnet-20241022',
        created_at: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-demo-1',
        user_id: DEMO_USER_ID,
        role: 'assistant',
        content: 'Here are your top 3 leverage points for this sprint:\n\n1. **Proactive Morning Briefing**: Delivery scheduled for 8:00 AM with today\'s agenda.\n2. **Google Calendar & Drive Integration**: Review two-phase write confirmation card scopes.\n3. **Mindful Evening Reflection**: Log your cognitive pause and review weekly mood momentum.',
        model: 'claude-3-5-sonnet-20241022',
        created_at: new Date(Date.now() - 3400000).toISOString(),
      },
    ],
    memories: [
      {
        id: 'mem-1',
        user_id: DEMO_USER_ID,
        category: 'preference',
        content: 'Prefers morning deep work blocks before 11 AM with zero interruptions.',
        importance_score: 9,
        is_pinned: true,
        is_archived: false,
        last_accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem-2',
        user_id: DEMO_USER_ID,
        category: 'preference',
        content: 'Prefers dense bullet-point executive summaries over conversational fluff.',
        importance_score: 8,
        is_pinned: false,
        is_archived: false,
        last_accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem-3',
        user_id: DEMO_USER_ID,
        category: 'fact',
        content: 'Based in Bangalore, India (UTC+5:30).',
        importance_score: 7,
        is_pinned: false,
        is_archived: false,
        last_accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem-4',
        user_id: DEMO_USER_ID,
        category: 'project',
        content: 'Building Orbit, a proactive personal AI agent monorepo with Fastify and React Native.',
        importance_score: 9,
        is_pinned: true,
        is_archived: false,
        last_accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    tasks: [
      {
        id: 'task-1',
        user_id: DEMO_USER_ID,
        title: 'Finalize Orbit End-to-End Demo Video',
        priority: 'high',
        status: 'in_progress',
        due_date: '2026-09-30',
        created_at: new Date().toISOString(),
      },
      {
        id: 'task-2',
        user_id: DEMO_USER_ID,
        title: 'Review Google Calendar OAuth Scopes',
        priority: 'medium',
        status: 'completed',
        due_date: '2026-09-28',
        created_at: new Date().toISOString(),
      },
      {
        id: 'task-3',
        user_id: DEMO_USER_ID,
        title: 'Test Morning Brief push notification delivery',
        priority: 'high',
        status: 'todo',
        due_date: '2026-10-01',
        created_at: new Date().toISOString(),
      },
    ],
    reminders: [],
    integrations: [],
    action_logs: [],
    daily_briefs: [
      {
        id: 'brief-today',
        user_id: DEMO_USER_ID,
        brief_type: 'morning_brief',
        brief_date: today,
        audio_script: 'Good morning Vishw. Today is Tuesday, September 29th. You have 3 key priorities today: finalizing the Orbit demo walkthrough, reviewing calendar OAuth tokens, and safeguarding your morning deep work block.',
        agenda_items: [
          { time: '09:00 AM', title: 'Deep Work Block: Demo Video & Polish', type: 'focus' },
          { time: '02:00 PM', title: 'Team Sync & Product Review', type: 'meeting' },
          { time: '05:00 PM', title: 'Architecture Review & GitHub Push', type: 'task' },
        ],
        key_priorities: [
          'Finalize Orbit End-to-End Demo Video',
          'Review Google Calendar & Drive OAuth Scopes',
          'Test Morning Brief push notification delivery',
        ],
        weather_summary: { condition: 'Clear Skies', temp_f: 74, summary: '74°F and clear in Bangalore. Perfect conditions for focus.' },
        suggested_actions: [
          { id: 'nudge-1', title: 'Schedule Standup Reminder', action_type: 'reminder', description: 'Meeting in 45m: Team Sync' },
          { id: 'nudge-2', title: 'Review Unfinished Tasks', action_type: 'task_review', description: '1 high-priority task due tomorrow' },
        ],
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ],
    proactive_nudges: [
      {
        id: 'nudge-1',
        user_id: DEMO_USER_ID,
        brief_id: 'brief-today',
        title: 'Meeting in 45m: Team Sync',
        body: 'Sync with product team starting at 2:00 PM.',
        suggested_action: { id: 'act-1', title: 'Prepare Notes' },
        is_dismissed: false,
        created_at: new Date().toISOString(),
      },
    ],
    journal_entries: [
      {
        id: 'journal-1',
        user_id: DEMO_USER_ID,
        entry_date: today,
        summary: 'Completed custom agent personas, daily reflection insights analytics, and offline-first sync engine.',
        key_takeaways: ['Stay focused on high-leverage outcomes', 'Protect flow states'],
        mood_score: 5,
        mood_tags: ['Deep Work', 'Coding', 'Breakthrough'],
        energy_level: 5,
        productivity_score: 5,
        ai_reflection: 'You have brought the entire 8-phase Orbit vision into cohesive reality. Tomorrow, run the live demonstration with confidence.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };
}

export class MemoryDb {
  private store: InMemoryStore;

  constructor() {
    this.store = createInitialStore();
  }

  public reset() {
    this.store = createInitialStore();
  }

  public execute<T extends QueryResultRow = any>(sql: string, params: any[] = []): QueryResult<T> {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    const upper = cleanSql.toUpperCase();

    // 1. Health check or simple test
    if (upper === 'SELECT 1' || upper.startsWith('SELECT 1 FROM')) {
      return this.makeResult([{ '?column?': 1 }] as any);
    }

    // Determine target table
    const table = this.detectTable(cleanSql);
    const tableData: any[] = table ? (this.store as any)[table] || [] : [];

    // 2. INSERT Queries
    if (upper.startsWith('INSERT INTO')) {
      const inserted = this.handleInsert(table, cleanSql, params);
      return this.makeResult(inserted as T[]);
    }

    // 3. SELECT Queries
    if (upper.startsWith('SELECT')) {
      const selected = this.handleSelect(table, cleanSql, params, tableData);
      return this.makeResult(selected as T[]);
    }

    // 4. UPDATE Queries
    if (upper.startsWith('UPDATE')) {
      const updated = this.handleUpdate(table, cleanSql, params, tableData);
      return this.makeResult(updated as T[]);
    }

    // 5. DELETE Queries
    if (upper.startsWith('DELETE FROM')) {
      const deleted = this.handleDelete(table, cleanSql, params, tableData);
      return this.makeResult(deleted as T[]);
    }

    // Fallback default empty
    return this.makeResult([] as T[]);
  }

  private detectTable(sql: string): string | null {
    const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_\.]+)/i);
    const intoMatch = sql.match(/INTO\s+([a-zA-Z0-9_\.]+)/i);
    const updateMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_\.]+)/i);

    const raw = (fromMatch && fromMatch[1]) || (intoMatch && intoMatch[1]) || (updateMatch && updateMatch[1]);
    if (!raw) return null;

    const normalized = raw.replace('public.', '').replace('auth.', '').toLowerCase();
    if (normalized.includes('user')) {
      if (raw.toLowerCase().includes('auth.users')) return 'auth_users';
      return 'users';
    }
    return normalized;
  }

  private handleInsert(table: string | null, sql: string, params: any[]): any[] {
    if (!table) return [];
    const list: any[] = (this.store as any)[table] || [];

    const newRecord: any = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Extract column names from INSERT INTO table (col1, col2, ...)
    const colsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
    if (colsMatch && colsMatch[1]) {
      const cols = colsMatch[1].split(',').map((c) => c.trim().toLowerCase());
      cols.forEach((col, idx) => {
        if (params && idx < params.length) {
          let val = params[idx];
          // Handle parsed JSON parameters
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
              val = JSON.parse(val);
            } catch {
              // keep as string
            }
          }
          newRecord[col] = val;
        }
      });
    }

    // Ensure ID from params if passed
    if (params && params.length > 0 && typeof params[0] === 'string' && params[0].includes('-')) {
      if (!newRecord.id || newRecord.id.startsWith('mock-')) {
        newRecord.id = params[0];
      }
    }

    // Upsert behavior on unique key if exists
    const existingIndex = list.findIndex((item) => {
      if (item.id && newRecord.id && item.id === newRecord.id) return true;
      if (table === 'users' && item.email && newRecord.email && item.email === newRecord.email) return true;
      if (table === 'notification_settings' && item.user_id && newRecord.user_id && item.user_id === newRecord.user_id) return true;
      if (table === 'journal_entries' && item.user_id === newRecord.user_id && item.entry_date === newRecord.entry_date) return true;
      if (table === 'daily_briefs' && item.user_id === newRecord.user_id && item.brief_type === newRecord.brief_type && item.brief_date === newRecord.brief_date) return true;
      return false;
    });

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newRecord, updated_at: new Date().toISOString() };
      return [list[existingIndex]];
    } else {
      list.push(newRecord);
      (this.store as any)[table] = list;
      return [newRecord];
    }
  }

  private handleSelect(table: string | null, sql: string, params: any[], data: any[]): any[] {
    if (!table) return [];

    let filtered = [...data];

    // Filter by user_id
    if (params && params.length > 0) {
      const userIdParam = params.find((p) => typeof p === 'string' && p.length >= 10);
      if (userIdParam && sql.includes('user_id = $')) {
        filtered = filtered.filter((item) => !item.user_id || item.user_id === userIdParam);
      }
    }

    // Filter by id
    if (sql.includes('WHERE id = $') && params.length > 0) {
      filtered = filtered.filter((item) => item.id === params[0]);
    }

    // Filter by conversation_id
    if (sql.includes('conversation_id = $') && params.length > 0) {
      filtered = filtered.filter((item) => item.conversation_id === params[0]);
    }

    // Filter by entry_date
    if (sql.includes('entry_date = $') && params.length > 1) {
      filtered = filtered.filter((item) => item.entry_date === params[1]);
    }

    // Order by created_at / entry_date
    if (sql.includes('ORDER BY is_default DESC')) {
      filtered.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    } else if (sql.includes('ORDER BY entry_date DESC') || sql.includes('ORDER BY created_at DESC')) {
      filtered.sort((a, b) => new Date(b.entry_date || b.created_at).getTime() - new Date(a.entry_date || a.created_at).getTime());
    } else if (sql.includes('ORDER BY created_at ASC')) {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    // LIMIT handling
    const limitMatch = sql.match(/LIMIT\s+(\$?\d+)/i);
    if (limitMatch) {
      const limitVal = limitMatch[1].startsWith('$')
        ? parseInt(params[parseInt(limitMatch[1].slice(1), 10) - 1], 10)
        : parseInt(limitMatch[1], 10);
      if (!isNaN(limitVal)) {
        filtered = filtered.slice(0, limitVal);
      }
    }

    return filtered;
  }

  private handleUpdate(table: string | null, sql: string, params: any[], data: any[]): any[] {
    if (!table) return [];

    let updatedRows: any[] = [];
    if (params && params.length > 0) {
      const idParam = params[params.length - 1]; // usually WHERE id = $N
      data.forEach((item) => {
        if (item.id === idParam || item.user_id === idParam) {
          if (sql.includes('is_default = TRUE')) {
            item.is_default = true;
          }
          if (sql.includes('is_default = FALSE')) {
            item.is_default = false;
          }
          item.updated_at = new Date().toISOString();
          updatedRows.push(item);
        }
      });
    }

    return updatedRows.length > 0 ? updatedRows : data.slice(0, 1);
  }

  private handleDelete(table: string | null, sql: string, params: any[], data: any[]): any[] {
    if (!table) return [];
    const list: any[] = (this.store as any)[table] || [];

    if (params.length > 0) {
      const idToDelete = params[0];
      const index = list.findIndex((i) => i.id === idToDelete);
      if (index >= 0) {
        const deleted = list.splice(index, 1);
        return deleted;
      }
    }
    return [];
  }

  private makeResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
    return {
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }
}

export const memoryDb = new MemoryDb();
