-- Extend device_tokens, subscriptions, and notifications_sent to support
-- Google OAuth citizens (citizen_accounts) alongside phone OTP users (users).

-- device_tokens
ALTER TABLE device_tokens
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES citizen_accounts(id) ON DELETE CASCADE;

ALTER TABLE device_tokens
  ADD CONSTRAINT device_tokens_owner_required
  CHECK (user_id IS NOT NULL OR citizen_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS device_tokens_citizen_idx
  ON device_tokens(citizen_id) WHERE citizen_id IS NOT NULL;

-- subscriptions
ALTER TABLE subscriptions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES citizen_accounts(id) ON DELETE CASCADE;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_owner_required
  CHECK (user_id IS NOT NULL OR citizen_id IS NOT NULL);

-- The existing UNIQUE(user_id, platform_id) still covers phone OTP rows.
-- Add a separate partial unique index for Google citizen rows.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_citizen_platform_idx
  ON subscriptions(citizen_id, platform_id) WHERE citizen_id IS NOT NULL;

-- notifications_sent
ALTER TABLE notifications_sent
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES citizen_accounts(id) ON DELETE CASCADE;

ALTER TABLE notifications_sent
  ADD CONSTRAINT notifications_sent_owner_required
  CHECK (user_id IS NOT NULL OR citizen_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_sent_citizen_incident_idx
  ON notifications_sent(citizen_id, incident_id) WHERE citizen_id IS NOT NULL;
