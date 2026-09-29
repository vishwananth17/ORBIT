-- ============================================================================
-- 003_journal_entries.sql: Daily Journal, Mood & Reflection Schema (Phase 7)
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries (user_id, entry_date DESC);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'Users access own journal entries'
    ) THEN
        CREATE POLICY "Users access own journal entries" ON journal_entries
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
