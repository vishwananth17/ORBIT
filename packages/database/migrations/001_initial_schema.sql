-- ============================================================================
-- 001_initial_schema.sql: Kairo Complete Production Database Schema
-- Includes PostgreSQL extensions, pgvector (1536d), RLS, indexes & RPCs
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Ensure auth schema exists (for local non-Supabase dev environments)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enumerations
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE memory_category AS ENUM ('fact', 'preference', 'relationship', 'goal', 'project', 'routine');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE memory_source AS ENUM ('conversation', 'manual', 'calendar', 'gmail', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE integration_provider AS ENUM ('google_calendar', 'gmail', 'google_drive', 'apple_health');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE permission_level AS ENUM ('read', 'draft', 'write');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE confirmation_status AS ENUM ('pending', 'approved', 'rejected', 'executed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Users Table (Mirroring / augmenting auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    locale TEXT NOT NULL DEFAULT 'en-US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_token TEXT,
    quiet_hours_start TIME NOT NULL DEFAULT '22:00:00',
    quiet_hours_end TIME NOT NULL DEFAULT '07:30:00',
    morning_brief_time TIME NOT NULL DEFAULT '08:00:00',
    evening_review_time TIME NOT NULL DEFAULT '20:30:00',
    proactive_nudges_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    smart_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Custom Persona Agents (Phase 6)
CREATE TABLE IF NOT EXISTS custom_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tagline TEXT,
    system_prompt TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'concise, thoughtful, proactive',
    avatar_icon TEXT NOT NULL DEFAULT 'bot',
    enabled_tools TEXT[] NOT NULL DEFAULT ARRAY['calendar_read', 'tasks_manage', 'memory_search'],
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    custom_agent_id UUID REFERENCES custom_agents(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    summary TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    tokens_prompt INT DEFAULT 0,
    tokens_completion INT DEFAULT 0,
    model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Long-Term Semantic Memories (pgvector 1536 dimensions)
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category memory_category NOT NULL DEFAULT 'fact',
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    importance_score INT NOT NULL CHECK (importance_score BETWEEN 1 AND 10),
    confidence_score NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (confidence_score BETWEEN 0.00 AND 1.00),
    source_type memory_source NOT NULL DEFAULT 'conversation',
    source_id UUID,
    access_count INT NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    superseded_by UUID REFERENCES memories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW Vector Index for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 9. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Third-Party Integrations & OAuth Tokens (Encrypted at rest)
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider integration_provider NOT NULL,
    encrypted_access_token BYTEA NOT NULL,
    encrypted_refresh_token BYTEA,
    token_expiry TIMESTAMPTZ,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    sync_cursor TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- 12. Consequential Action Logs & Confirmation State
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    tool_name TEXT NOT NULL,
    permission_level permission_level NOT NULL,
    action_payload JSONB NOT NULL,
    confirmation_status confirmation_status NOT NULL DEFAULT 'pending',
    result_payload JSONB,
    error_message TEXT,
    idempotency_key TEXT UNIQUE,
    user_confirmed_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Daily Journals & Mood Reflection (Phase 7)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    summary TEXT NOT NULL,
    key_takeaways TEXT[] DEFAULT ARRAY[]::TEXT[],
    mood_score INT CHECK (mood_score BETWEEN 1 AND 5),
    mood_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
    productivity_score INT CHECK (productivity_score BETWEEN 1 AND 5),
    ai_reflection TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_journal_date UNIQUE (user_id, entry_date)
);

-- ============================================================================
-- Indexes for High-Traffic Queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_memories_user_category ON memories (user_id, category) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders (remind_at) WHERE NOT is_sent;
CREATE INDEX IF NOT EXISTS idx_action_logs_user_status ON action_logs (user_id, confirmation_status);

-- ============================================================================
-- Semantic Search Stored Procedure (Memory Retrieval with Recency Decay)
-- ============================================================================
CREATE OR REPLACE FUNCTION match_memories(
    p_user_id UUID,
    p_query_embedding VECTOR(1536),
    p_match_threshold FLOAT DEFAULT 0.70,
    p_match_count INT DEFAULT 8
)
RETURNS TABLE (
    id UUID,
    category memory_category,
    content TEXT,
    similarity FLOAT,
    importance_score INT,
    recency_boost FLOAT,
    final_score FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.category,
        m.content,
        (1 - (m.embedding <=> p_query_embedding))::FLOAT AS similarity,
        m.importance_score,
        -- Exponential recency decay (half life: 30 days)
        EXP(-0.023 * EXTRACT(EPOCH FROM (NOW() - m.last_accessed_at)) / 86400)::FLOAT AS recency_boost,
        -- Weighted composite score: 65% cosine similarity, 20% importance, 15% recency
        (
            (1 - (m.embedding <=> p_query_embedding)) * 0.65 +
            (m.importance_score / 10.0) * 0.20 +
            EXP(-0.023 * EXTRACT(EPOCH FROM (NOW() - m.last_accessed_at)) / 86400)::FLOAT * 0.15
        )::FLOAT AS final_score,
        m.created_at
    FROM memories m
    WHERE m.user_id = p_user_id
      AND m.is_archived = FALSE
      AND m.superseded_by IS NULL
      AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY final_score DESC
    LIMIT p_match_count;
END;
$$;

-- ============================================================================
-- Trigger: Auto-create notification_settings on new user
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
