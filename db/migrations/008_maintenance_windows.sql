-- Scheduled maintenance windows declared by operators.
-- When active, the status page shows "Scheduled Maintenance" instead of triggering alerts.
CREATE TABLE maintenance_windows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  operator_id UUID NOT NULL REFERENCES help_desk_accounts(id),
  title       TEXT NOT NULL,
  description TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX mw_platform_time_idx ON maintenance_windows(platform_id, starts_at, ends_at);
