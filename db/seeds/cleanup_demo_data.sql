-- ─────────────────────────────────────────────────────────────────────────────
-- cleanup_demo_data.sql
-- Removes all rows inserted by 002_demo_data.sql from the live database.
-- Authorities and platforms added by that file are KEPT (they are real).
-- Real operator/regulator accounts from 003_initial_creds.sql are NOT touched.
-- Run once against your production database, then delete this file.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Nullify incident_id on ANY report linked to a demo incident
--    (catches both seeded reports AND real reports that fusion linked to them)
UPDATE reports
SET incident_id = NULL
WHERE incident_id::text LIKE '00000005-%';

-- 2. Delete ALL comments referencing demo incidents (seeded + any real ones)
DELETE FROM incident_comments
WHERE incident_id::text LIKE '00000005-%';

-- 3. Delete ALL reports referencing demo incidents (seeded + any real ones)
DELETE FROM reports
WHERE id::text LIKE '00000008-%';

-- 4. Delete maintenance windows
DELETE FROM maintenance_windows WHERE id::text LIKE '00000007-%';

-- 5. Delete ALL incident events referencing demo incidents
--    (covers both seeded 00000006- rows AND real probe/fusion events)
DELETE FROM incident_events
WHERE incident_id::text LIKE '00000005-%';

-- 5a. Clear any notification dedup rows for demo incidents
DELETE FROM notifications_sent
WHERE incident_id::text LIKE '00000005-%';

-- 6. Delete incidents (all FK children now removed — safe)
DELETE FROM incidents WHERE id::text LIKE '00000005-%';

-- 7. Clear 90-day generated probe history; real cron rows (<2 days) are kept
DELETE FROM probe_results WHERE ran_at < NOW() - INTERVAL '2 days';

-- 8. Delete fake citizen users
DELETE FROM users
WHERE phone LIKE '+25078010000%' OR phone = '+250780100010';

-- 9. Delete demo operator and regulator accounts
DELETE FROM help_desk_accounts WHERE email LIKE '%@phas.demo';
DELETE FROM regulator_accounts  WHERE email LIKE '%@phas.demo';

COMMIT;
