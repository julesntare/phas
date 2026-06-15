-- Allow reports from unauthenticated (anonymous) citizens.
ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL;

-- Store a hashed IP for anonymous rate-limiting (never stored in plain text).
ALTER TABLE reports ADD COLUMN ip_hash TEXT;
