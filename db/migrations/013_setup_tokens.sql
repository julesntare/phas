-- First-login activation tokens for operators and regulators.
-- password_hash stays NULL until the user completes setup.

ALTER TABLE help_desk_accounts
  ADD COLUMN IF NOT EXISTS setup_token          TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ;

ALTER TABLE regulator_accounts
  ADD COLUMN IF NOT EXISTS setup_token          TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ;
