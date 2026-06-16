-- Citizens who sign in via Google OAuth to submit reports.
CREATE TABLE IF NOT EXISTS citizen_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id  TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link existing/new reports to a citizen_account (nullable for legacy phone rows).
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES citizen_accounts(id),
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT TRUE;
