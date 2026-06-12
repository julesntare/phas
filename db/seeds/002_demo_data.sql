-- ─────────────────────────────────────────────────────────────────────────────
-- PHAS 002_demo_data.sql — 3-month demo data for portfolio presentation
--
-- Demo credentials (all accounts):  password = Demo1234!
--   Operators:   operator.{slug}@phas.demo
--   Regulators:  regulator.{auth}@phas.demo
--
-- Run AFTER all migrations (001 through 008) and seed 001.
-- Safe to re-run: uses ON CONFLICT guards throughout.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── Additional Authorities ───────────────────────────────────────────────────

INSERT INTO authorities (id, name, remit_description) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'RDB',
   'Rwanda Development Board — business registration, investment promotion, and tourism licensing.'),
  ('00000000-0000-0000-0000-000000000003',
   'RRA',
   'Rwanda Revenue Authority — domestic tax, customs, and revenue collection.'),
  ('00000000-0000-0000-0000-000000000004',
   'Irembo',
   'Irembo — digital delivery platform for over 100 Rwandan government services.')
ON CONFLICT (id) DO NOTHING;

-- ─── Additional Platforms ─────────────────────────────────────────────────────

INSERT INTO platforms (id, authority_id, name, base_url, category, public_support_channel) VALUES
  ('00000001-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'RDB Online Services', 'https://www.rdb.rw', 'business', '@RDB_Rwanda'),
  ('00000001-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'eSRS', 'https://esrs.rdb.rw', 'business', NULL),
  ('00000001-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'TradeRwanda Portal', 'https://www.traderwanda.com', 'business', '@TradeRwanda'),
  ('00000001-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000003',
   'iTax Portal', 'https://itax.rra.gov.rw', 'finance', '@RRAofficial'),
  ('00000001-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000003',
   'MTEP', 'https://mtep.rra.gov.rw', 'finance', NULL),
  ('00000001-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000004',
   'Irembo Portal', 'https://irembo.gov.rw', 'government', '@IremboRwanda'),
  ('00000001-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000004',
   'Irembo Agent Platform', 'https://agent.irembo.gov.rw', 'government', NULL),
  ('00000001-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000004',
   'Irembo Visa Online', 'https://visa.irembo.gov.rw', 'government', '@IremboRwanda')
ON CONFLICT (id) DO NOTHING;

-- ─── Operator & Regulator Accounts ───────────────────────────────────────────
-- Password hash for "Demo1234!" (scrypt, fixed salt for reproducibility)

DO $$
DECLARE
  pw TEXT := 'a3f8c12d9e4b7056:662676d3a2c4e4be947215a08000c3f124dbc008178f3ebd7fe42db544abeecf9e806b14f66409752764205c9b6684db73d625c16f02c5c1e854eb41048a9ccd';
BEGIN

INSERT INTO help_desk_accounts (id, platform_id, email, name, password_hash, role) VALUES
  ('00000002-0000-0000-0000-000000000001',
   (SELECT id FROM platforms WHERE name='MTN Rwanda'),
   'operator.mtn@phas.demo', 'MTN Rwanda Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000002',
   (SELECT id FROM platforms WHERE name='Airtel Rwanda'),
   'operator.airtel@phas.demo', 'Airtel Rwanda Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000003',
   (SELECT id FROM platforms WHERE name='Canalbox'),
   'operator.canalbox@phas.demo', 'Canalbox Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000004',
   (SELECT id FROM platforms WHERE name='REG (Electricity)'),
   'operator.reg@phas.demo', 'REG Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000005',
   (SELECT id FROM platforms WHERE name='WASAC (Water)'),
   'operator.wasac@phas.demo', 'WASAC Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000006',
   '00000001-0000-0000-0000-000000000001',
   'operator.rdb@phas.demo', 'RDB Online Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000007',
   '00000001-0000-0000-0000-000000000002',
   'operator.esrs@phas.demo', 'eSRS Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000008',
   '00000001-0000-0000-0000-000000000003',
   'operator.trade@phas.demo', 'TradeRwanda Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-000000000009',
   '00000001-0000-0000-0000-000000000004',
   'operator.itax@phas.demo', 'iTax Portal Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-00000000000a',
   '00000001-0000-0000-0000-000000000005',
   'operator.mtep@phas.demo', 'MTEP Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-00000000000b',
   '00000001-0000-0000-0000-000000000006',
   'operator.irembo@phas.demo', 'Irembo Portal Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-00000000000c',
   '00000001-0000-0000-0000-000000000007',
   'operator.irembo-agent@phas.demo', 'Irembo Agent Helpdesk', pw, 'operator'),
  ('00000002-0000-0000-0000-00000000000d',
   '00000001-0000-0000-0000-000000000008',
   'operator.irembo-visa@phas.demo', 'Irembo Visa Helpdesk', pw, 'operator')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name          = EXCLUDED.name,
  platform_id   = EXCLUDED.platform_id;

INSERT INTO regulator_accounts (id, authority_id, email, name, password_hash, role) VALUES
  ('00000003-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'regulator.rura@phas.demo', 'RURA Oversight Officer', pw, 'admin'),
  ('00000003-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'regulator.rdb@phas.demo', 'RDB Monitor', pw, 'viewer'),
  ('00000003-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   'regulator.rra@phas.demo', 'RRA Monitor', pw, 'viewer'),
  ('00000003-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000004',
   'regulator.irembo@phas.demo', 'Irembo Monitor', pw, 'viewer')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name          = EXCLUDED.name;

END $$;

-- ─── Sample Users ─────────────────────────────────────────────────────────────

INSERT INTO users (id, phone, district, created_at) VALUES
  ('00000004-0000-0000-0000-000000000001', '+250780100001', 'Gasabo',    NOW()-INTERVAL'88 days'),
  ('00000004-0000-0000-0000-000000000002', '+250780100002', 'Kicukiro',  NOW()-INTERVAL'80 days'),
  ('00000004-0000-0000-0000-000000000003', '+250780100003', 'Nyarugenge',NOW()-INTERVAL'75 days'),
  ('00000004-0000-0000-0000-000000000004', '+250780100004', 'Musanze',   NOW()-INTERVAL'72 days'),
  ('00000004-0000-0000-0000-000000000005', '+250780100005', 'Rubavu',    NOW()-INTERVAL'70 days'),
  ('00000004-0000-0000-0000-000000000006', '+250780100006', 'Huye',      NOW()-INTERVAL'65 days'),
  ('00000004-0000-0000-0000-000000000007', '+250780100007', 'Muhanga',   NOW()-INTERVAL'60 days'),
  ('00000004-0000-0000-0000-000000000008', '+250780100008', 'Rwamagana', NOW()-INTERVAL'55 days'),
  ('00000004-0000-0000-0000-000000000009', '+250780100009', 'Kayonza',   NOW()-INTERVAL'50 days'),
  ('00000004-0000-0000-0000-00000000000a', '+250780100010', 'Bugesera',  NOW()-INTERVAL'45 days'),
  ('00000004-0000-0000-0000-00000000000b', '+250780100011', 'Nyagatare', NOW()-INTERVAL'40 days'),
  ('00000004-0000-0000-0000-00000000000c', '+250780100012', 'Rusizi',    NOW()-INTERVAL'35 days'),
  ('00000004-0000-0000-0000-00000000000d', '+250780100013', 'Gicumbi',   NOW()-INTERVAL'30 days'),
  ('00000004-0000-0000-0000-00000000000e', '+250780100014', 'Rulindo',   NOW()-INTERVAL'25 days'),
  ('00000004-0000-0000-0000-00000000000f', '+250780100015', 'Nyanza',    NOW()-INTERVAL'20 days')
ON CONFLICT (phone) DO NOTHING;

-- ─── Probe Results (90 days, hourly) ─────────────────────────────────────────
-- Guarded: only inserts if no historical data already exists.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM probe_results WHERE ran_at < NOW() - INTERVAL '7 days') THEN
    INSERT INTO probe_results (platform_id, check_type, status_code, ok, latency_ms, ran_at)
    SELECT
      sub.pid,
      'http_ping',
      CASE WHEN sub.is_ok THEN 200 ELSE 503 END,
      sub.is_ok,
      CASE WHEN sub.is_ok THEN (80 + (random() * 900))::int ELSE NULL END,
      sub.slot
    FROM (
      SELECT
        p.id AS pid,
        g.slot,
        (random() <
          CASE p.name
            WHEN 'MTN Rwanda'            THEN 0.985
            WHEN 'Airtel Rwanda'         THEN 0.972
            WHEN 'Canalbox'              THEN 0.951
            WHEN 'REG (Electricity)'     THEN 0.968
            WHEN 'WASAC (Water)'         THEN 0.978
            WHEN 'RDB Online Services'   THEN 0.991
            WHEN 'eSRS'                  THEN 0.943
            WHEN 'TradeRwanda Portal'    THEN 0.987
            WHEN 'iTax Portal'           THEN 0.938
            WHEN 'MTEP'                  THEN 0.965
            WHEN 'Irembo Portal'         THEN 0.979
            WHEN 'Irembo Agent Platform' THEN 0.962
            WHEN 'Irembo Visa Online'    THEN 0.983
            ELSE 0.970
          END
        ) AS is_ok
      FROM platforms p
      CROSS JOIN (
        SELECT generate_series(
          NOW() - INTERVAL '90 days',
          NOW(),
          INTERVAL '1 hour'
        ) AS slot
      ) g
    ) sub;
  END IF;
END $$;

-- ─── Incidents ────────────────────────────────────────────────────────────────

INSERT INTO incidents (id, platform_id, state, opened_at, closed_at, updated_at, recurrence_count, confidence)
VALUES
  -- ── MTN Rwanda (4) ───────────────────────────────────────────────────────
  ('00000005-0001-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='MTN Rwanda'),
   'resolved',
   NOW()-INTERVAL'85 days', NOW()-INTERVAL'84 days 12 hours', NOW()-INTERVAL'84 days 12 hours', 0, 0.82),
  ('00000005-0002-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='MTN Rwanda'),
   'resolved',
   NOW()-INTERVAL'55 days', NOW()-INTERVAL'53 days 20 hours', NOW()-INTERVAL'53 days 20 hours', 0, 0.76),
  ('00000005-0003-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='MTN Rwanda'),
   'resolved',
   NOW()-INTERVAL'25 days', NOW()-INTERVAL'24 days 18 hours', NOW()-INTERVAL'24 days 18 hours', 1, 0.79),
  ('00000005-0004-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='MTN Rwanda'),
   'confirmed',
   NOW()-INTERVAL'3 days', NULL, NOW()-INTERVAL'2 days 20 hours', 0, 0.88),

  -- ── Airtel Rwanda (3) ────────────────────────────────────────────────────
  ('00000005-0005-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Airtel Rwanda'),
   'resolved',
   NOW()-INTERVAL'72 days', NOW()-INTERVAL'71 days 16 hours', NOW()-INTERVAL'71 days 16 hours', 0, 0.71),
  ('00000005-0006-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Airtel Rwanda'),
   'resolved',
   NOW()-INTERVAL'42 days', NOW()-INTERVAL'41 days 6 hours', NOW()-INTERVAL'41 days 6 hours', 0, 0.80),
  ('00000005-0007-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Airtel Rwanda'),
   'confirmed',
   NOW()-INTERVAL'8 days', NULL, NOW()-INTERVAL'7 days 22 hours', 0, 0.85),

  -- ── Canalbox (5) ─────────────────────────────────────────────────────────
  ('00000005-0008-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Canalbox'),
   'resolved',
   NOW()-INTERVAL'84 days', NOW()-INTERVAL'82 days 12 hours', NOW()-INTERVAL'82 days 12 hours', 0, 0.91),
  ('00000005-0009-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Canalbox'),
   'resolved',
   NOW()-INTERVAL'62 days', NOW()-INTERVAL'60 days', NOW()-INTERVAL'60 days', 0, 0.87),
  ('00000005-0010-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Canalbox'),
   'resolved',
   NOW()-INTERVAL'40 days', NOW()-INTERVAL'39 days 14 hours', NOW()-INTERVAL'39 days 14 hours', 0, 0.75),
  ('00000005-0011-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Canalbox'),
   'resolved',
   NOW()-INTERVAL'20 days', NOW()-INTERVAL'19 days 20 hours', NOW()-INTERVAL'19 days 20 hours', 0, 0.68),
  ('00000005-0012-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='Canalbox'),
   'confirmed',
   NOW()-INTERVAL'5 days', NULL, NOW()-INTERVAL'4 days 22 hours', 0, 0.92),

  -- ── REG Electricity (3) ──────────────────────────────────────────────────
  ('00000005-0013-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='REG (Electricity)'),
   'resolved',
   NOW()-INTERVAL'75 days', NOW()-INTERVAL'74 days 21 hours', NOW()-INTERVAL'74 days 21 hours', 0, 0.65),
  ('00000005-0014-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='REG (Electricity)'),
   'resolved',
   NOW()-INTERVAL'50 days', NOW()-INTERVAL'47 days', NOW()-INTERVAL'47 days', 0, 0.94),
  ('00000005-0015-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='REG (Electricity)'),
   'resolved',
   NOW()-INTERVAL'18 days', NOW()-INTERVAL'17 days 15 hours', NOW()-INTERVAL'17 days 15 hours', 0, 0.77),

  -- ── WASAC Water (2) ──────────────────────────────────────────────────────
  ('00000005-0016-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='WASAC (Water)'),
   'resolved',
   NOW()-INTERVAL'60 days', NOW()-INTERVAL'59 days 19 hours', NOW()-INTERVAL'59 days 19 hours', 0, 0.70),
  ('00000005-0017-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='WASAC (Water)'),
   'resolved',
   NOW()-INTERVAL'30 days', NOW()-INTERVAL'29 days 8 hours', NOW()-INTERVAL'29 days 8 hours', 0, 0.73),

  -- ── RDB Online Services (3) ──────────────────────────────────────────────
  ('00000005-0018-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000001',
   'resolved',
   NOW()-INTERVAL'65 days', NOW()-INTERVAL'64 days 16 hours', NOW()-INTERVAL'64 days 16 hours', 0, 0.78),
  ('00000005-0019-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000001',
   'resolved',
   NOW()-INTERVAL'32 days', NOW()-INTERVAL'31 days 22 hours', NOW()-INTERVAL'31 days 22 hours', 0, 0.62),
  ('00000005-0020-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000001',
   'detected',
   NOW()-INTERVAL'20 hours', NULL, NOW()-INTERVAL'20 hours', 0, 0.55),

  -- ── eSRS (5) ─────────────────────────────────────────────────────────────
  ('00000005-0021-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000002',
   'resolved',
   NOW()-INTERVAL'82 days', NOW()-INTERVAL'81 days', NOW()-INTERVAL'81 days', 0, 0.83),
  ('00000005-0022-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000002',
   'resolved',
   NOW()-INTERVAL'58 days', NOW()-INTERVAL'57 days 18 hours', NOW()-INTERVAL'57 days 18 hours', 0, 0.69),
  ('00000005-0023-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000002',
   'resolved',
   NOW()-INTERVAL'35 days', NOW()-INTERVAL'33 days', NOW()-INTERVAL'33 days', 0, 0.89),
  ('00000005-0024-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000002',
   'acknowledged',
   NOW()-INTERVAL'12 days', NULL, NOW()-INTERVAL'11 days 20 hours', 0, 0.86),
  ('00000005-0025-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000002',
   'confirmed',
   NOW()-INTERVAL'2 days', NULL, NOW()-INTERVAL'1 day 22 hours', 0, 0.91),

  -- ── TradeRwanda Portal (2) ───────────────────────────────────────────────
  ('00000005-0026-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000003',
   'resolved',
   NOW()-INTERVAL'55 days', NOW()-INTERVAL'54 days 21 hours', NOW()-INTERVAL'54 days 21 hours', 0, 0.64),
  ('00000005-0027-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000003',
   'resolved',
   NOW()-INTERVAL'20 days', NOW()-INTERVAL'19 days 12 hours', NOW()-INTERVAL'19 days 12 hours', 0, 0.71),

  -- ── iTax Portal (5) ──────────────────────────────────────────────────────
  ('00000005-0028-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000004',
   'resolved',
   NOW()-INTERVAL'88 days', NOW()-INTERVAL'87 days 4 hours', NOW()-INTERVAL'87 days 4 hours', 0, 0.78),
  ('00000005-0029-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000004',
   'resolved',
   NOW()-INTERVAL'70 days', NOW()-INTERVAL'69 days 9 hours', NOW()-INTERVAL'69 days 9 hours', 1, 0.81),
  ('00000005-0030-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000004',
   'resolved',
   NOW()-INTERVAL'50 days', NOW()-INTERVAL'47 days', NOW()-INTERVAL'47 days', 0, 0.96),
  ('00000005-0031-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000004',
   'resolved',
   NOW()-INTERVAL'28 days', NOW()-INTERVAL'27 days 18 hours', NOW()-INTERVAL'27 days 18 hours', 0, 0.74),
  ('00000005-0032-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000004',
   'detected',
   NOW()-INTERVAL'6 days', NULL, NOW()-INTERVAL'5 days 22 hours', 0, 0.72),

  -- ── MTEP (3) ─────────────────────────────────────────────────────────────
  ('00000005-0033-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000005',
   'resolved',
   NOW()-INTERVAL'78 days', NOW()-INTERVAL'77 days 20 hours', NOW()-INTERVAL'77 days 20 hours', 0, 0.67),
  ('00000005-0034-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000005',
   'resolved',
   NOW()-INTERVAL'45 days', NOW()-INTERVAL'44 days 14 hours', NOW()-INTERVAL'44 days 14 hours', 0, 0.73),
  ('00000005-0035-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000005',
   'resolved',
   NOW()-INTERVAL'15 days', NOW()-INTERVAL'14 days 17 hours', NOW()-INTERVAL'14 days 17 hours', 0, 0.69),

  -- ── Irembo Portal (4) ────────────────────────────────────────────────────
  ('00000005-0036-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000006',
   'resolved',
   NOW()-INTERVAL'84 days', NOW()-INTERVAL'83 days 6 hours', NOW()-INTERVAL'83 days 6 hours', 0, 0.80),
  ('00000005-0037-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000006',
   'resolved',
   NOW()-INTERVAL'56 days', NOW()-INTERVAL'55 days', NOW()-INTERVAL'55 days', 0, 0.85),
  ('00000005-0038-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000006',
   'resolved',
   NOW()-INTERVAL'30 days', NOW()-INTERVAL'29 days 22 hours', NOW()-INTERVAL'29 days 22 hours', 0, 0.61),
  ('00000005-0039-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000006',
   'confirmed',
   NOW()-INTERVAL'7 days', NULL, NOW()-INTERVAL'6 days 22 hours', 0, 0.87),

  -- ── Irembo Agent Platform (4) ────────────────────────────────────────────
  ('00000005-0040-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000007',
   'resolved',
   NOW()-INTERVAL'76 days', NOW()-INTERVAL'75 days 12 hours', NOW()-INTERVAL'75 days 12 hours', 0, 0.76),
  ('00000005-0041-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000007',
   'resolved',
   NOW()-INTERVAL'52 days', NOW()-INTERVAL'51 days 19 hours', NOW()-INTERVAL'51 days 19 hours', 0, 0.65),
  ('00000005-0042-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000007',
   'resolved',
   NOW()-INTERVAL'25 days', NOW()-INTERVAL'23 days 18 hours', NOW()-INTERVAL'23 days 18 hours', 0, 0.88),
  ('00000005-0043-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000007',
   'confirmed',
   NOW()-INTERVAL'4 days', NULL, NOW()-INTERVAL'3 days 22 hours', 0, 0.83),

  -- ── Irembo Visa Online (2) ───────────────────────────────────────────────
  ('00000005-0044-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000008',
   'resolved',
   NOW()-INTERVAL'68 days', NOW()-INTERVAL'67 days 21 hours', NOW()-INTERVAL'67 days 21 hours', 0, 0.72),
  ('00000005-0045-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000008',
   'resolved',
   NOW()-INTERVAL'38 days', NOW()-INTERVAL'37 days 16 hours', NOW()-INTERVAL'37 days 16 hours', 0, 0.76)

ON CONFLICT (id) DO NOTHING;

-- ─── Incident Events ──────────────────────────────────────────────────────────

INSERT INTO incident_events (id, incident_id, from_state, to_state, source, note, at)
VALUES
  -- Inc 01: MTN Rwanda, 85d, 12h resolved (detected→confirmed→acknowledged→resolved)
  ('00000006-0001-0001-0000-000000000000','00000005-0001-0000-0000-000000000000',
   NULL,'detected','crowd','Multiple users in Gasabo and Kicukiro reporting MTN data and voice failures.',NOW()-INTERVAL'85 days'),
  ('00000006-0001-0002-0000-000000000000','00000005-0001-0000-0000-000000000000',
   'detected','confirmed','probe','HTTP probe failure confirmed — 94% packet loss to mtn.co.rw.',NOW()-INTERVAL'84 days 23 hours'),
  ('00000006-0001-0003-0000-000000000000','00000005-0001-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Network ops team engaged. BGP route leak identified at Gisozi data center.',NOW()-INTERVAL'84 days 21 hours'),
  ('00000006-0001-0004-0000-000000000000','00000005-0001-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','BGP routing tables restored. All regions recovering normally.',NOW()-INTERVAL'84 days 12 hours'),

  -- Inc 02: MTN Rwanda, 55d, 28h resolved (detected→confirmed→acknowledged→partially_resolved→resolved)
  ('00000006-0002-0001-0000-000000000000','00000005-0002-0000-0000-000000000000',
   NULL,'detected','crowd','Intermittent 4G connectivity failures reported in Northern Province.',NOW()-INTERVAL'55 days'),
  ('00000006-0002-0002-0000-000000000000','00000005-0002-0000-0000-000000000000',
   'detected','confirmed','probe','Probe failure — elevated latency and packet loss on core network.',NOW()-INTERVAL'54 days 23 hours'),
  ('00000006-0002-0003-0000-000000000000','00000005-0002-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Engineering on-site at Musanze tower. Fiber splice failure identified.',NOW()-INTERVAL'54 days 20 hours'),
  ('00000006-0002-0004-0000-000000000000','00000005-0002-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','Temporary routing restored. Northern Province 4G improving — full repair ongoing.',NOW()-INTERVAL'54 days 8 hours'),
  ('00000006-0002-0005-0000-000000000000','00000005-0002-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','Fiber splice completed. All services restored to 100%.',NOW()-INTERVAL'53 days 20 hours'),

  -- Inc 03: MTN Rwanda, 25d, 6h resolved, recurrence=1 (detected→confirmed→acknowledged→resolved)
  ('00000006-0003-0001-0000-000000000000','00000005-0003-0000-0000-000000000000',
   NULL,'detected','crowd','Data outage reported — pattern similar to March incident. Kigali most affected.',NOW()-INTERVAL'25 days'),
  ('00000006-0003-0002-0000-000000000000','00000005-0003-0000-0000-000000000000',
   'detected','confirmed','probe','BGP probe confirms route instability — recurring issue detected.',NOW()-INTERVAL'24 days 23 hours'),
  ('00000006-0003-0003-0000-000000000000','00000005-0003-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Applying permanent BGP fix to prevent recurrence. ETA 4 hours.',NOW()-INTERVAL'24 days 21 hours'),
  ('00000006-0003-0004-0000-000000000000','00000005-0003-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Permanent routing fix deployed. Route dampening enabled to prevent future recurrence.',NOW()-INTERVAL'24 days 18 hours'),

  -- Inc 04: MTN Rwanda, 3d, ACTIVE confirmed (SLA breach)
  ('00000006-0004-0001-0000-000000000000','00000005-0004-0000-0000-000000000000',
   NULL,'detected','crowd','Widespread voice call failures reported in Kigali and Gasabo district.',NOW()-INTERVAL'3 days'),
  ('00000006-0004-0002-0000-000000000000','00000005-0004-0000-0000-000000000000',
   'detected','confirmed','probe','HTTP probe failure confirmed. Voice gateway 503 errors.',NOW()-INTERVAL'2 days 22 hours'),

  -- Inc 05: Airtel Rwanda, 72d, 8h resolved (detected→acknowledged→resolved)
  ('00000006-0005-0001-0000-000000000000','00000005-0005-0000-0000-000000000000',
   NULL,'detected','crowd','Airtel voice service disruption reported across Rubavu and Western Province.',NOW()-INTERVAL'72 days'),
  ('00000006-0005-0002-0000-000000000000','00000005-0005-0000-0000-000000000000',
   'detected','acknowledged','helpdesk','Investigating VoIP gateway issue at Rubavu exchange. Probe confirms 85% failure rate.',NOW()-INTERVAL'71 days 22 hours'),
  ('00000006-0005-0003-0000-000000000000','00000005-0005-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','VoIP gateway restarted and reconfigured. Voice service fully restored.',NOW()-INTERVAL'71 days 16 hours'),

  -- Inc 06: Airtel Rwanda, 42d, 18h resolved (detected→confirmed→acknowledged→resolved)
  ('00000006-0006-0001-0000-000000000000','00000005-0006-0000-0000-000000000000',
   NULL,'detected','crowd','4G LTE degradation reported in multiple provinces — speeds below 1Mbps.',NOW()-INTERVAL'42 days'),
  ('00000006-0006-0002-0000-000000000000','00000005-0006-0000-0000-000000000000',
   'detected','confirmed','probe','Probe confirms network congestion — average latency 2800ms vs normal 80ms.',NOW()-INTERVAL'41 days 23 hours'),
  ('00000006-0006-0003-0000-000000000000','00000005-0006-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Traffic analysis complete. Capacity upgrade underway on Kigali backhaul.',NOW()-INTERVAL'41 days 18 hours'),
  ('00000006-0006-0004-0000-000000000000','00000005-0006-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Backhaul capacity doubled. Network performance back to SLA thresholds.',NOW()-INTERVAL'41 days 6 hours'),

  -- Inc 07: Airtel Rwanda, 8d, ACTIVE confirmed
  ('00000006-0007-0001-0000-000000000000','00000005-0007-0000-0000-000000000000',
   NULL,'detected','crowd','Airtel Mobile Money timeouts affecting business transactions in Kigali.',NOW()-INTERVAL'8 days'),
  ('00000006-0007-0002-0000-000000000000','00000005-0007-0000-0000-000000000000',
   'detected','confirmed','probe','MoMo API endpoint returning 504 Gateway Timeout consistently.',NOW()-INTERVAL'7 days 22 hours'),

  -- Inc 08: Canalbox, 84d, 36h resolved (detected→confirmed→acknowledged→partially_resolved→resolved)
  ('00000006-0008-0001-0000-000000000000','00000005-0008-0000-0000-000000000000',
   NULL,'detected','crowd','Canalbox broadband out across Kigali residential areas. Multiple offices affected.',NOW()-INTERVAL'84 days'),
  ('00000006-0008-0002-0000-000000000000','00000005-0008-0000-0000-000000000000',
   'detected','confirmed','probe','Core router failure confirmed. Probes timing out on all Canalbox subnets.',NOW()-INTERVAL'83 days 23 hours'),
  ('00000006-0008-0003-0000-000000000000','00000005-0008-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','NOC engaged. Core router hardware failure — replacement unit being shipped from Nairobi.',NOW()-INTERVAL'83 days 18 hours'),
  ('00000006-0008-0004-0000-000000000000','00000005-0008-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','Failover activated. Business zones restored. Residential traffic routing via backup link (reduced capacity).',NOW()-INTERVAL'83 days 6 hours'),
  ('00000006-0008-0005-0000-000000000000','00000005-0008-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','New core router installed and configured. Full capacity restored across all zones.',NOW()-INTERVAL'82 days 12 hours'),

  -- Inc 09: Canalbox, 62d, 48h resolved (detected→confirmed→acknowledged→partially_resolved→resolved)
  ('00000006-0009-0001-0000-000000000000','00000005-0009-0000-0000-000000000000',
   NULL,'detected','crowd','DNS resolution failures. Multiple Canalbox customers unable to reach any websites.',NOW()-INTERVAL'62 days'),
  ('00000006-0009-0002-0000-000000000000','00000005-0009-0000-0000-000000000000',
   'detected','confirmed','probe','DNS server probes failing. Recursive resolver not responding.',NOW()-INTERVAL'61 days 23 hours'),
  ('00000006-0009-0003-0000-000000000000','00000005-0009-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Primary and secondary DNS servers both degraded. Investigating root cause.',NOW()-INTERVAL'61 days 18 hours'),
  ('00000006-0009-0004-0000-000000000000','00000005-0009-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','Switched customers to Google DNS as interim. Root cause: DDoS on resolver infrastructure.',NOW()-INTERVAL'61 days 6 hours'),
  ('00000006-0009-0005-0000-000000000000','00000005-0009-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','DDoS mitigation complete. Own DNS infrastructure restored with rate limiting.',NOW()-INTERVAL'60 days'),

  -- Inc 10: Canalbox, 40d, 10h resolved
  ('00000006-0010-0001-0000-000000000000','00000005-0010-0000-0000-000000000000',
   NULL,'detected','crowd','Business internet down in Kacyiru and CBD areas. VPN connections dropping.',NOW()-INTERVAL'40 days'),
  ('00000006-0010-0002-0000-000000000000','00000005-0010-0000-0000-000000000000',
   'detected','confirmed','probe','BGP session with upstream provider dropped. Traffic blackholed.',NOW()-INTERVAL'39 days 23 hours'),
  ('00000006-0010-0003-0000-000000000000','00000005-0010-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Upstream provider notified. BGP session restart in progress.',NOW()-INTERVAL'39 days 20 hours'),
  ('00000006-0010-0004-0000-000000000000','00000005-0010-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','BGP session restored with upstream. All business zones back online.',NOW()-INTERVAL'39 days 14 hours'),

  -- Inc 11: Canalbox, 20d, 4h resolved (detected→resolved — fast fix)
  ('00000006-0011-0001-0000-000000000000','00000005-0011-0000-0000-000000000000',
   NULL,'detected','crowd','Brief Canalbox outage — home users reporting connectivity loss after 6pm.',NOW()-INTERVAL'20 days'),
  ('00000006-0011-0002-0000-000000000000','00000005-0011-0000-0000-000000000000',
   'detected','resolved','helpdesk','Identified and resolved config push that caused route withdrawal. Hotfix deployed.',NOW()-INTERVAL'19 days 20 hours'),

  -- Inc 12: Canalbox, 5d, ACTIVE confirmed (SLA breach)
  ('00000006-0012-0001-0000-000000000000','00000005-0012-0000-0000-000000000000',
   NULL,'detected','crowd','Canalbox fiber network down across Gasabo district. Large-scale outage.',NOW()-INTERVAL'5 days'),
  ('00000006-0012-0002-0000-000000000000','00000005-0012-0000-0000-000000000000',
   'detected','confirmed','probe','All probes failing. Physical fiber cut suspected — engineering team dispatched.',NOW()-INTERVAL'4 days 22 hours'),

  -- Inc 13: REG Electricity, 75d, 3h resolved (detected→resolved — fast)
  ('00000006-0013-0001-0000-000000000000','00000005-0013-0000-0000-000000000000',
   NULL,'detected','crowd','REG smart meter portal not loading. Customers unable to check prepaid balances.',NOW()-INTERVAL'75 days'),
  ('00000006-0013-0002-0000-000000000000','00000005-0013-0000-0000-000000000000',
   'detected','resolved','helpdesk','Database connection pool exhausted. Pool size increased and stale connections cleared.',NOW()-INTERVAL'74 days 21 hours'),

  -- Inc 14: REG Electricity, 50d, 72h resolved (MAJOR outage)
  ('00000006-0014-0001-0000-000000000000','00000005-0014-0000-0000-000000000000',
   NULL,'detected','crowd','REG portal completely down. Customers cannot purchase electricity tokens.',NOW()-INTERVAL'50 days'),
  ('00000006-0014-0002-0000-000000000000','00000005-0014-0000-0000-000000000000',
   'detected','confirmed','probe','Server returning 500 errors. Database integrity issues detected post-update.',NOW()-INTERVAL'49 days 23 hours'),
  ('00000006-0014-0003-0000-000000000000','00000005-0014-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Critical: database corruption after failed migration. DBA team engaged for recovery.',NOW()-INTERVAL'49 days 20 hours'),
  ('00000006-0014-0004-0000-000000000000','00000005-0014-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','Token purchase restored via backup system. Smart meter sync still degraded.',NOW()-INTERVAL'48 days 8 hours'),
  ('00000006-0014-0005-0000-000000000000','00000005-0014-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','Full database recovery complete. All REG services restored. Post-mortem scheduled.',NOW()-INTERVAL'47 days'),

  -- Inc 15: REG Electricity, 18d, 9h resolved
  ('00000006-0015-0001-0000-000000000000','00000005-0015-0000-0000-000000000000',
   NULL,'detected','crowd','REG web portal slow — token purchase taking over 5 minutes to process.',NOW()-INTERVAL'18 days'),
  ('00000006-0015-0002-0000-000000000000','00000005-0015-0000-0000-000000000000',
   'detected','confirmed','probe','Payment gateway latency 15x above normal. Third-party provider degraded.',NOW()-INTERVAL'17 days 23 hours'),
  ('00000006-0015-0003-0000-000000000000','00000005-0015-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Payment provider contacted. Switching to secondary payment processor.',NOW()-INTERVAL'17 days 20 hours'),
  ('00000006-0015-0004-0000-000000000000','00000005-0015-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Secondary payment processor active. Purchase flow back to normal speed.',NOW()-INTERVAL'17 days 15 hours'),

  -- Inc 16: WASAC Water, 60d, 5h resolved
  ('00000006-0016-0001-0000-000000000000','00000005-0016-0000-0000-000000000000',
   NULL,'detected','crowd','WASAC online portal 404 errors. Water bill payments inaccessible.',NOW()-INTERVAL'60 days'),
  ('00000006-0016-0002-0000-000000000000','00000005-0016-0000-0000-000000000000',
   'detected','resolved','helpdesk','Web server misconfiguration from overnight deployment. Rolled back and redeployed.',NOW()-INTERVAL'59 days 19 hours'),

  -- Inc 17: WASAC Water, 30d, 16h resolved
  ('00000006-0017-0001-0000-000000000000','00000005-0017-0000-0000-000000000000',
   NULL,'detected','crowd','WASAC bill payment failing — transaction errors on all payment methods.',NOW()-INTERVAL'30 days'),
  ('00000006-0017-0002-0000-000000000000','00000005-0017-0000-0000-000000000000',
   'detected','confirmed','probe','Payment API endpoint returning 502. Bank integration layer failing.',NOW()-INTERVAL'29 days 23 hours'),
  ('00000006-0017-0003-0000-000000000000','00000005-0017-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','BK payment API credentials expired. Renewal request submitted.',NOW()-INTERVAL'29 days 20 hours'),
  ('00000006-0017-0004-0000-000000000000','00000005-0017-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','API credentials renewed. All payment methods restored.',NOW()-INTERVAL'29 days 8 hours'),

  -- Inc 18: RDB Online, 65d, 8h resolved
  ('00000006-0018-0001-0000-000000000000','00000005-0018-0000-0000-000000000000',
   NULL,'detected','crowd','RDB company registration portal down. Entrepreneurs unable to submit new applications.',NOW()-INTERVAL'65 days'),
  ('00000006-0018-0002-0000-000000000000','00000005-0018-0000-0000-000000000000',
   'detected','confirmed','probe','Server returning 503. Load balancer health checks failing.',NOW()-INTERVAL'64 days 23 hours'),
  ('00000006-0018-0003-0000-000000000000','00000005-0018-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Three of four application servers unresponsive. Memory leak identified in overnight deployment.',NOW()-INTERVAL'64 days 20 hours'),
  ('00000006-0018-0004-0000-000000000000','00000005-0018-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Rolled back deployment. All servers healthy. Registration submissions processing normally.',NOW()-INTERVAL'64 days 16 hours'),

  -- Inc 19: RDB Online, 32d, 2h resolved (fast)
  ('00000006-0019-0001-0000-000000000000','00000005-0019-0000-0000-000000000000',
   NULL,'detected','crowd','RDB portal slow — document uploads timing out.',NOW()-INTERVAL'32 days'),
  ('00000006-0019-0002-0000-000000000000','00000005-0019-0000-0000-000000000000',
   'detected','resolved','helpdesk','Storage quota exceeded on document server. Cleared temporary files and expanded quota.',NOW()-INTERVAL'31 days 22 hours'),

  -- Inc 20: RDB Online, 20h, ACTIVE detected (unacknowledged breach)
  ('00000006-0020-0001-0000-000000000000','00000005-0020-0000-0000-000000000000',
   NULL,'detected','crowd','RDB Online Services returning intermittent 404 errors on key pages.',NOW()-INTERVAL'20 hours'),

  -- Inc 21: eSRS, 82d, 24h resolved
  ('00000006-0021-0001-0000-000000000000','00000005-0021-0000-0000-000000000000',
   NULL,'detected','crowd','eSRS registry system not loading. Business owners unable to update entity records.',NOW()-INTERVAL'82 days'),
  ('00000006-0021-0002-0000-000000000000','00000005-0021-0000-0000-000000000000',
   'detected','confirmed','probe','eSRS API returning 502. Backend microservice crash detected.',NOW()-INTERVAL'81 days 23 hours'),
  ('00000006-0021-0003-0000-000000000000','00000005-0021-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Microservice OOM crash. Container restarted with increased memory limits.',NOW()-INTERVAL'81 days 20 hours'),
  ('00000006-0021-0004-0000-000000000000','00000005-0021-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','eSRS fully restored. Memory limits permanently increased. Monitoring alerts added.',NOW()-INTERVAL'81 days'),

  -- Inc 22: eSRS, 58d, 6h resolved (fast)
  ('00000006-0022-0001-0000-000000000000','00000005-0022-0000-0000-000000000000',
   NULL,'detected','crowd','eSRS login page not loading — blank white screen for users.',NOW()-INTERVAL'58 days'),
  ('00000006-0022-0002-0000-000000000000','00000005-0022-0000-0000-000000000000',
   'detected','confirmed','probe','Frontend CDN asset 404 — build artifact missing after failed deployment.',NOW()-INTERVAL'57 days 23 hours'),
  ('00000006-0022-0003-0000-000000000000','00000005-0022-0000-0000-000000000000',
   'confirmed','resolved','helpdesk','Previous stable build re-deployed. Login working. Root cause: failed CI pipeline.',NOW()-INTERVAL'57 days 18 hours'),

  -- Inc 23: eSRS, 35d, 48h resolved
  ('00000006-0023-0001-0000-000000000000','00000005-0023-0000-0000-000000000000',
   NULL,'detected','crowd','eSRS document submission failing — files uploading but not appearing in system.',NOW()-INTERVAL'35 days'),
  ('00000006-0023-0002-0000-000000000000','00000005-0023-0000-0000-000000000000',
   'detected','confirmed','probe','Storage service unreachable. Object storage bucket permissions reverted unintentionally.',NOW()-INTERVAL'34 days 23 hours'),
  ('00000006-0023-0003-0000-000000000000','00000005-0023-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Storage permissions restored. Backlog of 340 document submissions queued for reprocessing.',NOW()-INTERVAL'34 days 20 hours'),
  ('00000006-0023-0004-0000-000000000000','00000005-0023-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','New submissions working. Historical backlog reprocessing at 60% complete.',NOW()-INTERVAL'34 days 8 hours'),
  ('00000006-0023-0005-0000-000000000000','00000005-0023-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','All 340 queued submissions processed successfully. System fully restored.',NOW()-INTERVAL'33 days'),

  -- Inc 24: eSRS, 12d, ACTIVE acknowledged (SLA breach — >24h unresolved)
  ('00000006-0024-0001-0000-000000000000','00000005-0024-0000-0000-000000000000',
   NULL,'detected','crowd','eSRS entity search returning incorrect or stale data. Critical for due diligence checks.',NOW()-INTERVAL'12 days'),
  ('00000006-0024-0002-0000-000000000000','00000005-0024-0000-0000-000000000000',
   'detected','confirmed','probe','Search index corruption detected. 30% of queries returning stale results.',NOW()-INTERVAL'11 days 23 hours'),
  ('00000006-0024-0003-0000-000000000000','00000005-0024-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Full index rebuild initiated. ETA 72 hours for complete reindex of 2.4M entity records.',NOW()-INTERVAL'11 days 20 hours'),

  -- Inc 25: eSRS, 2d, ACTIVE confirmed
  ('00000006-0025-0001-0000-000000000000','00000005-0025-0000-0000-000000000000',
   NULL,'detected','crowd','eSRS portal login failing — authentication errors for all users.',NOW()-INTERVAL'2 days'),
  ('00000006-0025-0002-0000-000000000000','00000005-0025-0000-0000-000000000000',
   'detected','confirmed','probe','Auth service returning 503. Token validation endpoint down.',NOW()-INTERVAL'1 day 22 hours'),

  -- Inc 26: TradeRwanda, 55d, 3h resolved (fast)
  ('00000006-0026-0001-0000-000000000000','00000005-0026-0000-0000-000000000000',
   NULL,'detected','crowd','TradeRwanda portal not accessible — connection timeout.',NOW()-INTERVAL'55 days'),
  ('00000006-0026-0002-0000-000000000000','00000005-0026-0000-0000-000000000000',
   'detected','resolved','helpdesk','Nginx config error from automated SSL renewal blocked traffic. Fixed and certificates renewed.',NOW()-INTERVAL'54 days 21 hours'),

  -- Inc 27: TradeRwanda, 20d, 12h resolved
  ('00000006-0027-0001-0000-000000000000','00000005-0027-0000-0000-000000000000',
   NULL,'detected','crowd','TradeRwanda product catalogue not loading. Exporters unable to list goods.',NOW()-INTERVAL'20 days'),
  ('00000006-0027-0002-0000-000000000000','00000005-0027-0000-0000-000000000000',
   'detected','confirmed','probe','API gateway returning 429 Too Many Requests — rate limit misconfigured.',NOW()-INTERVAL'19 days 23 hours'),
  ('00000006-0027-0003-0000-000000000000','00000005-0027-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Rate limits corrected. Investigating why limits were lowered in last deployment.',NOW()-INTERVAL'19 days 18 hours'),
  ('00000006-0027-0004-0000-000000000000','00000005-0027-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Rate limits restored and deployment pipeline updated to validate config changes.',NOW()-INTERVAL'19 days 12 hours'),

  -- Inc 28: iTax, 88d, 20h resolved
  ('00000006-0028-0001-0000-000000000000','00000005-0028-0000-0000-000000000000',
   NULL,'detected','crowd','iTax portal 503 errors. Taxpayers unable to file returns.',NOW()-INTERVAL'88 days'),
  ('00000006-0028-0002-0000-000000000000','00000005-0028-0000-0000-000000000000',
   'detected','confirmed','probe','Application server cluster unresponsive. Traffic surge from quarterly filing deadline.',NOW()-INTERVAL'87 days 23 hours'),
  ('00000006-0028-0003-0000-000000000000','00000005-0028-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Emergency scaling initiated. Additional compute provisioned. Queue depth reducing.',NOW()-INTERVAL'87 days 18 hours'),
  ('00000006-0028-0004-0000-000000000000','00000005-0028-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Capacity restored. Filing deadline extended by 24 hours communicated to RRA.',NOW()-INTERVAL'87 days 4 hours'),

  -- Inc 29: iTax, 70d, 15h resolved, recurrence=1
  ('00000006-0029-0001-0000-000000000000','00000005-0029-0000-0000-000000000000',
   NULL,'detected','crowd','iTax portal degraded again during peak filing hours. Same symptoms as March incident.',NOW()-INTERVAL'70 days'),
  ('00000006-0029-0002-0000-000000000000','00000005-0029-0000-0000-000000000000',
   'detected','confirmed','probe','Server overload confirmed. Auto-scaling limits hit — capacity ceiling reached.',NOW()-INTERVAL'69 days 23 hours'),
  ('00000006-0029-0003-0000-000000000000','00000005-0029-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Scaling limits increased to handle peak load. Capacity planning review requested.',NOW()-INTERVAL'69 days 18 hours'),
  ('00000006-0029-0004-0000-000000000000','00000005-0029-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Portal stable. Permanent capacity upgrade approved — deployment scheduled next month.',NOW()-INTERVAL'69 days 9 hours'),

  -- Inc 30: iTax, 50d, 72h resolved — MAJOR peak filing outage
  ('00000006-0030-0001-0000-000000000000','00000005-0030-0000-0000-000000000000',
   NULL,'detected','crowd','Critical: iTax portal completely down. Annual tax filing deadline is in 72 hours.',NOW()-INTERVAL'50 days'),
  ('00000006-0030-0002-0000-000000000000','00000005-0030-0000-0000-000000000000',
   'detected','confirmed','probe','Total service outage. Database cluster primary node failed. Replica promotion delayed.',NOW()-INTERVAL'49 days 23 hours'),
  ('00000006-0030-0003-0000-000000000000','00000005-0030-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','RRA escalated to national ICT infrastructure team. Database failover in progress.',NOW()-INTERVAL'49 days 20 hours'),
  ('00000006-0030-0004-0000-000000000000','00000005-0030-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','Read-only mode restored — taxpayers can view previous filings. Submissions still blocked.',NOW()-INTERVAL'49 days 8 hours'),
  ('00000006-0030-0005-0000-000000000000','00000005-0030-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','Full write access restored. Filing deadline extended by 5 days by RRA Commissioner.',NOW()-INTERVAL'47 days'),

  -- Inc 31: iTax, 28d, 6h resolved
  ('00000006-0031-0001-0000-000000000000','00000005-0031-0000-0000-000000000000',
   NULL,'detected','crowd','iTax payment integration failing — custom duty payments not processing.',NOW()-INTERVAL'28 days'),
  ('00000006-0031-0002-0000-000000000000','00000005-0031-0000-0000-000000000000',
   'detected','confirmed','probe','Payment gateway certificate expired overnight. SSL handshake failing.',NOW()-INTERVAL'27 days 23 hours'),
  ('00000006-0031-0003-0000-000000000000','00000005-0031-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Certificate renewal in progress. Temporary bypass for urgent duty clearances arranged.',NOW()-INTERVAL'27 days 20 hours'),
  ('00000006-0031-0004-0000-000000000000','00000005-0031-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','New SSL certificates deployed. Automated renewal configured to prevent recurrence.',NOW()-INTERVAL'27 days 18 hours'),

  -- Inc 32: iTax, 6d, ACTIVE detected (SLA breach)
  ('00000006-0032-0001-0000-000000000000','00000005-0032-0000-0000-000000000000',
   NULL,'detected','crowd','iTax portal slow — filing submissions taking over 10 minutes to confirm.',NOW()-INTERVAL'6 days'),

  -- Inc 33: MTEP, 78d, 4h resolved (fast)
  ('00000006-0033-0001-0000-000000000000','00000005-0033-0000-0000-000000000000',
   NULL,'detected','crowd','MTEP mobile tax platform showing maintenance page unexpectedly.',NOW()-INTERVAL'78 days'),
  ('00000006-0033-0002-0000-000000000000','00000005-0033-0000-0000-000000000000',
   'detected','resolved','helpdesk','Accidental maintenance mode flag left enabled after testing. Disabled and service restored.',NOW()-INTERVAL'77 days 20 hours'),

  -- Inc 34: MTEP, 45d, 10h resolved
  ('00000006-0034-0001-0000-000000000000','00000005-0034-0000-0000-000000000000',
   NULL,'detected','crowd','MTEP mobile app returning errors on SMS PIN verification step.',NOW()-INTERVAL'45 days'),
  ('00000006-0034-0002-0000-000000000000','00000005-0034-0000-0000-000000000000',
   'detected','confirmed','probe','SMS gateway API returning 503. Telecom SMS provider outage.',NOW()-INTERVAL'44 days 23 hours'),
  ('00000006-0034-0003-0000-000000000000','00000005-0034-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','SMS provider incident confirmed. Switched to backup Airtel SMS gateway.',NOW()-INTERVAL'44 days 18 hours'),
  ('00000006-0034-0004-0000-000000000000','00000005-0034-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Primary SMS provider restored. Failover to secondary proven to work.',NOW()-INTERVAL'44 days 14 hours'),

  -- Inc 35: MTEP, 15d, 7h resolved
  ('00000006-0035-0001-0000-000000000000','00000005-0035-0000-0000-000000000000',
   NULL,'detected','crowd','MTEP app crashing on Android 14 after recent update. Force close on launch.',NOW()-INTERVAL'15 days'),
  ('00000006-0035-0002-0000-000000000000','00000005-0035-0000-0000-000000000000',
   'detected','confirmed','probe','API compatibility issue confirmed with Android 14 WebView version.',NOW()-INTERVAL'14 days 23 hours'),
  ('00000006-0035-0003-0000-000000000000','00000005-0035-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Hotfix release prepared and submitted to Play Store expedited review.',NOW()-INTERVAL'14 days 20 hours'),
  ('00000006-0035-0004-0000-000000000000','00000005-0035-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','v2.4.1 hotfix live on Play Store. Android 14 compatibility restored.',NOW()-INTERVAL'14 days 17 hours'),

  -- Inc 36: Irembo Portal, 84d, 18h resolved
  ('00000006-0036-0001-0000-000000000000','00000005-0036-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo Portal down — citizens unable to apply for driving licenses or ID renewals.',NOW()-INTERVAL'84 days'),
  ('00000006-0036-0002-0000-000000000000','00000005-0036-0000-0000-000000000000',
   'detected','confirmed','probe','Frontend and API services unreachable. Infrastructure provider reporting regional issues.',NOW()-INTERVAL'83 days 23 hours'),
  ('00000006-0036-0003-0000-000000000000','00000005-0036-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Cloud provider incident affecting our availability zone. Failover to secondary AZ initiated.',NOW()-INTERVAL'83 days 18 hours'),
  ('00000006-0036-0004-0000-000000000000','00000005-0036-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Failover complete. All Irembo services running from secondary AZ. Latency slightly elevated.',NOW()-INTERVAL'83 days 6 hours'),

  -- Inc 37: Irembo Portal, 56d, 24h resolved
  ('00000006-0037-0001-0000-000000000000','00000005-0037-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo payment gateway rejecting all card payments.',NOW()-INTERVAL'56 days'),
  ('00000006-0037-0002-0000-000000000000','00000005-0037-0000-0000-000000000000',
   'detected','confirmed','probe','Card payment API 3DS authentication failing. Processor endpoint unreachable.',NOW()-INTERVAL'55 days 23 hours'),
  ('00000006-0037-0003-0000-000000000000','00000005-0037-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Engaging payment processor. Mobile money payments remain available as alternative.',NOW()-INTERVAL'55 days 18 hours'),
  ('00000006-0037-0004-0000-000000000000','00000005-0037-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Card processor restored 3DS authentication. All payment methods working.',NOW()-INTERVAL'55 days'),

  -- Inc 38: Irembo Portal, 30d, 2h resolved (fast)
  ('00000006-0038-0001-0000-000000000000','00000005-0038-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo Portal login returning "Service Unavailable" for 20 minutes.',NOW()-INTERVAL'30 days'),
  ('00000006-0038-0002-0000-000000000000','00000005-0038-0000-0000-000000000000',
   'detected','resolved','helpdesk','Auto-scaler triggered and new instances launched. Brief spike from school registration season.',NOW()-INTERVAL'29 days 22 hours'),

  -- Inc 39: Irembo Portal, 7d, ACTIVE confirmed (SLA breach)
  ('00000006-0039-0001-0000-000000000000','00000005-0039-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo Visa Online not loading — applicants getting timeout errors.',NOW()-INTERVAL'7 days'),
  ('00000006-0039-0002-0000-000000000000','00000005-0039-0000-0000-000000000000',
   'detected','confirmed','probe','Visa service API returning 504. Integration with Immigration Department system degraded.',NOW()-INTERVAL'6 days 22 hours'),

  -- Inc 40: Irembo Agent, 76d, 12h resolved
  ('00000006-0040-0001-0000-000000000000','00000005-0040-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo agents across Rwanda reporting they cannot process citizen transactions.',NOW()-INTERVAL'76 days'),
  ('00000006-0040-0002-0000-000000000000','00000005-0040-0000-0000-000000000000',
   'detected','confirmed','probe','Agent platform API returning auth errors. Session tokens invalidated.',NOW()-INTERVAL'75 days 23 hours'),
  ('00000006-0040-0003-0000-000000000000','00000005-0040-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Auth service key rotation error. Rolling back key rotation and reissuing agent tokens.',NOW()-INTERVAL'75 days 18 hours'),
  ('00000006-0040-0004-0000-000000000000','00000005-0040-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Agent auth restored. 12,000+ active agents automatically re-authenticated.',NOW()-INTERVAL'75 days 12 hours'),

  -- Inc 41: Irembo Agent, 52d, 5h resolved (fast)
  ('00000006-0041-0001-0000-000000000000','00000005-0041-0000-0000-000000000000',
   NULL,'detected','crowd','Agent platform mobile app not syncing — transaction receipts delayed.',NOW()-INTERVAL'52 days'),
  ('00000006-0041-0002-0000-000000000000','00000005-0041-0000-0000-000000000000',
   'detected','resolved','helpdesk','Message queue backlog cleared. Sync service restarted. All receipts delivered.',NOW()-INTERVAL'51 days 19 hours'),

  -- Inc 42: Irembo Agent, 25d, 30h resolved
  ('00000006-0042-0001-0000-000000000000','00000005-0042-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo Agent cash reconciliation feature broken — agents cannot close daily float.',NOW()-INTERVAL'25 days'),
  ('00000006-0042-0002-0000-000000000000','00000005-0042-0000-0000-000000000000',
   'detected','confirmed','probe','Accounting microservice crash. Reconciliation endpoint 500 error.',NOW()-INTERVAL'24 days 23 hours'),
  ('00000006-0042-0003-0000-000000000000','00000005-0042-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','Accounting service data corruption from failed transaction. Manual reconciliation process activated.',NOW()-INTERVAL'24 days 18 hours'),
  ('00000006-0042-0004-0000-000000000000','00000005-0042-0000-0000-000000000000',
   'acknowledged','partially_resolved','helpdesk','Service restored for new transactions. Historical data re-reconciliation ongoing.',NOW()-INTERVAL'24 days 6 hours'),
  ('00000006-0042-0005-0000-000000000000','00000005-0042-0000-0000-000000000000',
   'partially_resolved','resolved','helpdesk','Full reconciliation complete. All agent float balances verified correct.',NOW()-INTERVAL'23 days 18 hours'),

  -- Inc 43: Irembo Agent, 4d, ACTIVE confirmed (SLA breach)
  ('00000006-0043-0001-0000-000000000000','00000005-0043-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo Agent platform down — agents unable to serve customers.',NOW()-INTERVAL'4 days'),
  ('00000006-0043-0002-0000-000000000000','00000005-0043-0000-0000-000000000000',
   'detected','confirmed','probe','Complete platform outage. Kubernetes cluster crashlooping after config update.',NOW()-INTERVAL'3 days 22 hours'),

  -- Inc 44: Irembo Visa, 68d, 3h resolved (fast)
  ('00000006-0044-0001-0000-000000000000','00000005-0044-0000-0000-000000000000',
   NULL,'detected','crowd','Irembo Visa Online not accessible — applicants timing out.',NOW()-INTERVAL'68 days'),
  ('00000006-0044-0002-0000-000000000000','00000005-0044-0000-0000-000000000000',
   'detected','resolved','helpdesk','CDN edge nodes flushed and origin server restarted. SSL certificate auto-renewed.',NOW()-INTERVAL'67 days 21 hours'),

  -- Inc 45: Irembo Visa, 38d, 8h resolved
  ('00000006-0045-0001-0000-000000000000','00000005-0045-0000-0000-000000000000',
   NULL,'detected','crowd','Visa application document upload failing — file size limits triggering error.',NOW()-INTERVAL'38 days'),
  ('00000006-0045-0002-0000-000000000000','00000005-0045-0000-0000-000000000000',
   'detected','confirmed','probe','Upload API rejecting files >1MB. Config regression from last deployment.',NOW()-INTERVAL'37 days 23 hours'),
  ('00000006-0045-0003-0000-000000000000','00000005-0045-0000-0000-000000000000',
   'confirmed','acknowledged','helpdesk','File size limit corrected to 10MB. Deployment pipeline config validated.',NOW()-INTERVAL'37 days 20 hours'),
  ('00000006-0045-0004-0000-000000000000','00000005-0045-0000-0000-000000000000',
   'acknowledged','resolved','helpdesk','Upload restored. Applicants who encountered errors notified to re-submit.',NOW()-INTERVAL'37 days 16 hours')

ON CONFLICT (id) DO NOTHING;

-- ─── Maintenance Windows ──────────────────────────────────────────────────────

INSERT INTO maintenance_windows (id, platform_id, operator_id, title, description, starts_at, ends_at) VALUES
  ('00000007-0001-0000-0000-000000000000',
   (SELECT id FROM platforms WHERE name='MTN Rwanda'),
   '00000002-0000-0000-0000-000000000001',
   'Core Network Equipment Upgrade',
   'Scheduled replacement of aging BGP routers in Gisozi data center. Expect intermittent connectivity.',
   NOW()-INTERVAL'14 days', NOW()-INTERVAL'13 days 22 hours'),
  ('00000007-0002-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000004',
   '00000002-0000-0000-0000-000000000009',
   'Q2 Database Migration — iTax',
   'Annual database infrastructure upgrade. Filing and payments unavailable during window.',
   NOW()-INTERVAL'45 days', NOW()-INTERVAL'44 days 20 hours'),
  ('00000007-0003-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000006',
   '00000002-0000-0000-0000-00000000000b',
   'SSL Certificate Renewal & Security Hardening',
   NULL,
   NOW()-INTERVAL'56 days 2 hours', NOW()-INTERVAL'55 days 22 hours'),
  ('00000007-0004-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000002',
   '00000002-0000-0000-0000-000000000007',
   'Emergency Security Patch — Auth Layer',
   'Patching critical vulnerability in API authentication. Brief service interruption expected.',
   NOW()-INTERVAL'2 hours', NOW()+INTERVAL'4 hours'),
  ('00000007-0005-0000-0000-000000000000',
   '00000001-0000-0000-0000-000000000001',
   '00000002-0000-0000-0000-000000000006',
   'Scheduled Cloud Infrastructure Migration',
   'Migration to new cloud region for improved latency and resilience. Intermittent availability.',
   NOW()+INTERVAL'3 days', NOW()+INTERVAL'3 days 6 hours')
ON CONFLICT (id) DO NOTHING;

-- ─── Citizen Reports (Cosigns) ────────────────────────────────────────────────

INSERT INTO reports (id, platform_id, user_id, type, district, free_text, incident_id, created_at) VALUES
  -- iTax major outage (inc 30) — 6 cosigns
  ('00000008-0001-0000-0000-000000000000','00000001-0000-0000-0000-000000000004',
   '00000004-0000-0000-0000-000000000001','affected','Gasabo',
   'Cannot file my VAT return — deadline is in 2 days!',
   '00000005-0030-0000-0000-000000000000',NOW()-INTERVAL'50 days 1 hour'),
  ('00000008-0002-0000-0000-000000000000','00000001-0000-0000-0000-000000000004',
   '00000004-0000-0000-0000-000000000002','affected','Kicukiro',
   'Portal showing service unavailable. Cannot process customs duty payment.',
   '00000005-0030-0000-0000-000000000000',NOW()-INTERVAL'49 days 22 hours'),
  ('00000008-0003-0000-0000-000000000000','00000001-0000-0000-0000-000000000004',
   '00000004-0000-0000-0000-000000000003','affected','Nyarugenge',
   'Confirmed — tried from multiple browsers and network connections.',
   '00000005-0030-0000-0000-000000000000',NOW()-INTERVAL'49 days 18 hours'),
  ('00000008-0004-0000-0000-000000000000','00000001-0000-0000-0000-000000000004',
   '00000004-0000-0000-0000-000000000004','affected','Musanze',
   'Business tax filing blocked. This will cause late penalties.',
   '00000005-0030-0000-0000-000000000000',NOW()-INTERVAL'49 days 12 hours'),
  ('00000008-0005-0000-0000-000000000000','00000001-0000-0000-0000-000000000004',
   '00000004-0000-0000-0000-000000000005','affected','Rubavu',
   'Same here. No progress for 24 hours.',
   '00000005-0030-0000-0000-000000000000',NOW()-INTERVAL'49 days 6 hours'),
  ('00000008-0006-0000-0000-000000000000','00000001-0000-0000-0000-000000000004',
   '00000004-0000-0000-0000-000000000006','affected','Huye',
   'Affects all our company accounts. Bookkeeper also confirmed.',
   '00000005-0030-0000-0000-000000000000',NOW()-INTERVAL'48 days 20 hours'),

  -- Canalbox 48h DNS outage (inc 09) — 4 cosigns
  ('00000008-0007-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='Canalbox'),
   '00000004-0000-0000-0000-000000000007','affected','Muhanga',
   'Cannot access any websites. DNS not working at all.',
   '00000005-0009-0000-0000-000000000000',NOW()-INTERVAL'62 days 2 hours'),
  ('00000008-0008-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='Canalbox'),
   '00000004-0000-0000-0000-000000000008','affected','Rwamagana',
   'Office internet completely down. Whole day of work lost.',
   '00000005-0009-0000-0000-000000000000',NOW()-INTERVAL'61 days 20 hours'),
  ('00000008-0009-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='Canalbox'),
   '00000004-0000-0000-0000-000000000009','affected','Kayonza',
   'Confirmed using 8.8.8.8 as manual DNS workaround — needed by IT to fix temporarily.',
   '00000005-0009-0000-0000-000000000000',NOW()-INTERVAL'61 days 14 hours'),
  ('00000008-0010-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='Canalbox'),
   '00000004-0000-0000-0000-00000000000a','affected','Bugesera',
   'Same problem. Internet works with Google DNS entered manually.',
   '00000005-0009-0000-0000-000000000000',NOW()-INTERVAL'61 days 8 hours'),

  -- MTN active incident (inc 04) — 4 cosigns
  ('00000008-0011-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='MTN Rwanda'),
   '00000004-0000-0000-0000-000000000001','affected','Gasabo',
   'Voice calls dropping every 2-3 minutes in Remera.',
   '00000005-0004-0000-0000-000000000000',NOW()-INTERVAL'2 days 20 hours'),
  ('00000008-0012-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='MTN Rwanda'),
   '00000004-0000-0000-0000-000000000002','affected','Kicukiro',
   'Data very slow — WhatsApp messages not sending.',
   '00000005-0004-0000-0000-000000000000',NOW()-INTERVAL'2 days 18 hours'),
  ('00000008-0013-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='MTN Rwanda'),
   '00000004-0000-0000-0000-00000000000b','affected','Nyagatare',
   'Problem confirmed here too — outside Kigali.',
   '00000005-0004-0000-0000-000000000000',NOW()-INTERVAL'2 days 12 hours'),
  ('00000008-0014-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='MTN Rwanda'),
   '00000004-0000-0000-0000-00000000000c','affected','Rusizi',
   'MTN completely dead in Rusizi. Cannot reach emergency services.',
   '00000005-0004-0000-0000-000000000000',NOW()-INTERVAL'1 day 22 hours'),

  -- eSRS acknowledged breach (inc 24) — 3 cosigns
  ('00000008-0015-0000-0000-000000000000','00000001-0000-0000-0000-000000000002',
   '00000004-0000-0000-0000-00000000000d','affected','Gicumbi',
   'eSRS showing wrong company directors for my business. Urgent due diligence blocked.',
   '00000005-0024-0000-0000-000000000000',NOW()-INTERVAL'11 days 18 hours'),
  ('00000008-0016-0000-0000-000000000000','00000001-0000-0000-0000-000000000002',
   '00000004-0000-0000-0000-00000000000e','affected','Rulindo',
   'Confirmed — entity search results are days old and incorrect.',
   '00000005-0024-0000-0000-000000000000',NOW()-INTERVAL'11 days 12 hours'),
  ('00000008-0017-0000-0000-000000000000','00000001-0000-0000-0000-000000000002',
   '00000004-0000-0000-0000-00000000000f','affected','Nyanza',
   'This is blocking an acquisition we are finalising. Critical.',
   '00000005-0024-0000-0000-000000000000',NOW()-INTERVAL'11 days 6 hours'),

  -- Irembo Portal active (inc 39) — 2 cosigns
  ('00000008-0018-0000-0000-000000000000','00000001-0000-0000-0000-000000000006',
   '00000004-0000-0000-0000-000000000003','affected','Nyarugenge',
   'Cannot apply for visitor visa. Getting timeout error.',
   '00000005-0039-0000-0000-000000000000',NOW()-INTERVAL'6 days 18 hours'),
  ('00000008-0019-0000-0000-000000000000','00000001-0000-0000-0000-000000000006',
   '00000004-0000-0000-0000-000000000006','affected','Huye',
   'Visa application stuck at document upload step.',
   '00000005-0039-0000-0000-000000000000',NOW()-INTERVAL'6 days 12 hours'),

  -- REG major outage (inc 14) — 2 cosigns
  ('00000008-0020-0000-0000-000000000000',(SELECT id FROM platforms WHERE name='REG (Electricity)'),
   '00000004-0000-0000-0000-000000000004','affected','Musanze',
   'Cannot purchase electricity tokens. Family running out of units.',
   '00000005-0014-0000-0000-000000000000',NOW()-INTERVAL'49 days 18 hours')
ON CONFLICT (id) DO NOTHING;

-- ─── Incident Comments ────────────────────────────────────────────────────────

INSERT INTO incident_comments (id, incident_id, user_id, content, district, created_at) VALUES
  -- iTax major outage (inc 30)
  ('00000009-0001-0000-0000-000000000000','00000005-0030-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000001',
   'Tried on Chrome, Firefox, and phone browser. All getting service unavailable. My annual return is due tomorrow.','Gasabo',
   NOW()-INTERVAL'50 days 30 minutes'),
  ('00000009-0002-0000-0000-000000000000','00000005-0030-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000002',
   'Same issue. Confirmed with colleague in Musanze — nationwide problem. RRA should extend the deadline.','Kicukiro',
   NOW()-INTERVAL'49 days 20 hours'),
  ('00000009-0003-0000-0000-000000000000','00000005-0030-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000003',
   'Portal read-only mode working now — I can see my history but cannot submit. Good progress.','Nyarugenge',
   NOW()-INTERVAL'49 days 7 hours'),

  -- MTN active incident (inc 04)
  ('00000009-0004-0000-0000-000000000000','00000005-0004-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000001',
   'Calls dropping every few minutes. I missed an important client call this morning.','Gasabo',
   NOW()-INTERVAL'2 days 19 hours'),
  ('00000009-0005-0000-0000-000000000000','00000005-0004-0000-0000-000000000000',
   '00000004-0000-0000-0000-00000000000b',
   'Affecting mobile money too — transactions timing out. Very disruptive.','Nyagatare',
   NOW()-INTERVAL'2 days 10 hours'),

  -- Canalbox DNS outage (inc 09)
  ('00000009-0006-0000-0000-000000000000','00000005-0009-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000007',
   'Using 8.8.8.8 as workaround. Basic browsing works but company VPN still down.','Muhanga',
   NOW()-INTERVAL'61 days 18 hours'),

  -- REG major outage (inc 14)
  ('00000009-0007-0000-0000-000000000000','00000005-0014-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000004',
   'No electricity tokens available since yesterday. This is a critical service — people need power.','Musanze',
   NOW()-INTERVAL'49 days 15 hours'),
  ('00000009-0008-0000-0000-000000000000','00000005-0014-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000005',
   'Agents at local shops also cannot process token sales. Entire district affected.','Rubavu',
   NOW()-INTERVAL'48 days 12 hours'),

  -- eSRS acknowledged breach (inc 24)
  ('00000009-0009-0000-0000-000000000000','00000005-0024-0000-0000-000000000000',
   '00000004-0000-0000-0000-00000000000d',
   'The stale data is from 12+ days ago. Merger documentation requires current registry data — this is blocking legal proceedings.','Gicumbi',
   NOW()-INTERVAL'11 days 16 hours'),

  -- Irembo Portal active (inc 39)
  ('00000009-0010-0000-0000-000000000000','00000005-0039-0000-0000-000000000000',
   '00000004-0000-0000-0000-000000000003',
   'Visa application for conference next week. If this is not resolved soon I will miss the deadline.','Nyarugenge',
   NOW()-INTERVAL'6 days 16 hours')
ON CONFLICT (id) DO NOTHING;

COMMIT;
