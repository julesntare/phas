-- ─────────────────────────────────────────────────────────────────────────────
-- PHAS 003_initial_creds.sql — real operator & regulator accounts
--
-- Initial password for ALL accounts below: Phas@Admin1
-- → Change immediately after first login via the Profile tab.
--
-- Run AFTER all migrations (001 through 010) and seeds 001 + 002.
-- Safe to re-run: ON CONFLICT guards throughout.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DO $$
DECLARE
  pw TEXT := 'b2e4f6a8c0d1e3f5:3aa63aa1afbdb2e19d47febdc11386f1dd789ccaf82fdccae588fd109a51cc347a40618e013333b9af80b94cfe6cab988009233ecbd8b521c24904ff43635735';
BEGIN

-- ─── Operator accounts ────────────────────────────────────────────────────────
-- One account per platform. Replace emails with real contacts.

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.mtn@rura.gov.rw', 'MTN Rwanda Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'MTN Rwanda'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.airtel@rura.gov.rw', 'Airtel Rwanda Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'Airtel Rwanda'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.canalbox@rura.gov.rw', 'Canalbox Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'Canalbox'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.reg@rura.gov.rw', 'REG Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'REG (Electricity)'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.wasac@rura.gov.rw', 'WASAC Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'WASAC (Water)'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.rdb@rdb.gov.rw', 'RDB Online Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'RDB Online Services'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.itax@rra.gov.rw', 'iTax Portal Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'iTax Portal'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, role)
SELECT p.id, 'operator.irembo@irembo.gov.rw', 'Irembo Portal Operator', pw, 'operator'
FROM platforms p WHERE p.name = 'Irembo Portal'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

-- ─── Regulator accounts ───────────────────────────────────────────────────────

INSERT INTO regulator_accounts (authority_id, email, name, password_hash, role)
SELECT a.id, 'regulator.rura@rura.gov.rw', 'RURA Regulator', pw, 'admin'
FROM authorities a WHERE a.name = 'RURA'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO regulator_accounts (authority_id, email, name, password_hash, role)
SELECT a.id, 'regulator.rdb@rdb.gov.rw', 'RDB Regulator', pw, 'viewer'
FROM authorities a WHERE a.name = 'RDB'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO regulator_accounts (authority_id, email, name, password_hash, role)
SELECT a.id, 'regulator.rra@rra.gov.rw', 'RRA Regulator', pw, 'viewer'
FROM authorities a WHERE a.name = 'RRA'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

INSERT INTO regulator_accounts (authority_id, email, name, password_hash, role)
SELECT a.id, 'regulator.irembo@irembo.gov.rw', 'Irembo Regulator', pw, 'viewer'
FROM authorities a WHERE a.name = 'Irembo'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

END $$;

COMMIT;
