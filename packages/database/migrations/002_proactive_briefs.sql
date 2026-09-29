-- ============================================================================
-- 002_proactive_briefs.sql: Proactive Briefs & Smart Nudges Schema
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE brief_type AS ENUM ('morning_brief', 'evening_review', 'smart_nudge');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS daily_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type brief_type NOT NULL DEFAULT 'morning_brief',
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    agenda_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    audio_summary TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_brief UNIQUE (user_id, date, type)
);

CREATE TABLE IF NOT EXISTS proactive_nudges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_briefs_user_date ON daily_briefs (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_nudges_user ON proactive_nudges (user_id, is_dismissed, created_at DESC);

ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_nudges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users access own daily briefs" ON daily_briefs
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users access own proactive nudges" ON proactive_nudges
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
