-- Finer-grained location fields on reports.
-- sector / cell / village are free-text (user-typed).
-- latitude / longitude are only stored when the reporter explicitly
-- taps "Use my location" — opt-in, not auto-captured.
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS sector    TEXT,
  ADD COLUMN IF NOT EXISTS cell      TEXT,
  ADD COLUMN IF NOT EXISTS village   TEXT,
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
