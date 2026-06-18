-- Merge operator (help_desk_accounts) into platforms.
-- Platforms now carry their own portal login credentials and contact info.
-- help_desk_accounts and operator_sessions are left intact but no longer used.

ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS contact_email          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS contact_name           TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT,
  ADD COLUMN IF NOT EXISTS password_hash          TEXT,
  ADD COLUMN IF NOT EXISTS setup_token            TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_url            TEXT,
  ADD COLUMN IF NOT EXISTS regulator_id           UUID REFERENCES regulator_accounts(id);

CREATE TABLE IF NOT EXISTS platform_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
