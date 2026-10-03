-- Single-use OAuth state with encrypted PKCE verifier; no browser token exposure.
CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'google_calendar')),
  encrypted_verifier BYTEA NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_states_expiry ON oauth_states(expires_at);
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
-- No client policy. Only the server database role may access this table.
