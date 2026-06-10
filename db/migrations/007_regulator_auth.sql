-- Regulator portal auth — adds password hash and session tracking.

ALTER TABLE regulator_accounts
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;

CREATE TABLE IF NOT EXISTS regulator_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_id  UUID NOT NULL REFERENCES regulator_accounts(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
