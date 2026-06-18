-- Merge regulator_accounts into authorities.
-- Authorities now carry their own portal login credentials.
-- regulator_accounts and regulator_sessions are left intact but no longer used.
-- Also drops the regulator_id column added to platforms in 015 (redundant now —
-- a platform's authority_id already establishes the oversight relationship).

ALTER TABLE authorities
  ADD COLUMN IF NOT EXISTS contact_email          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS contact_name           TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT,
  ADD COLUMN IF NOT EXISTS password_hash          TEXT,
  ADD COLUMN IF NOT EXISTS setup_token            TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS authority_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id UUID NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platforms DROP COLUMN IF EXISTS regulator_id;
