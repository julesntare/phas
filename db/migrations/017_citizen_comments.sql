-- Allow Google citizens (citizen_accounts) to post comments, not just phone OTP users.
ALTER TABLE incident_comments
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES citizen_accounts(id) ON DELETE CASCADE;

ALTER TABLE incident_comments
  ADD CONSTRAINT comments_author_required
  CHECK (user_id IS NOT NULL OR citizen_id IS NOT NULL);
