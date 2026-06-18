-- Regulators can be cross-authority (not tied to one authority).
-- Drop the NOT NULL constraint so authority_id can be NULL.
ALTER TABLE regulator_accounts
  ALTER COLUMN authority_id DROP NOT NULL;
