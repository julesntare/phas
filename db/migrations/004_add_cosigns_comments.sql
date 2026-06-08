-- Link reports to the incident they were submitted against (for cosign tracking).
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id);

CREATE INDEX IF NOT EXISTS reports_incident_idx
  ON reports(incident_id) WHERE incident_id IS NOT NULL;

-- Citizen discussion thread attached to an incident.
CREATE TABLE IF NOT EXISTS incident_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  district    TEXT,  -- copied from user at post time; never linked back to identity
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incident_comments_incident_created_idx
  ON incident_comments(incident_id, created_at);
