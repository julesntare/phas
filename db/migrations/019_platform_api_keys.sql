-- Long-lived API keys for platform integrations (e.g. MTN SMS gateway → PHAS).
-- The raw key is shown once on creation; only the SHA-256 hash is stored.
CREATE TABLE platform_api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id  UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX platform_api_keys_platform_idx ON platform_api_keys(platform_id);
