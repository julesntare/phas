-- AI triage of citizen free-text reports (docs/ai-roadmap.md, feature #1).
-- Columns are filled asynchronously after a report is saved; NULL means "not triaged".
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS symptom      TEXT
              CHECK (symptom IS NULL OR symptom IN (
                'site_down', 'slow', 'login_failed', 'otp_not_received',
                'payment_failed', 'wrong_data', 'feature_broken', 'other'
              )),
  ADD COLUMN IF NOT EXISTS language     TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary   TEXT,
  ADD COLUMN IF NOT EXISTS relevance    TEXT
              CHECK (relevance IS NULL OR relevance IN ('on_topic', 'off_topic', 'abusive')),
  ADD COLUMN IF NOT EXISTS contains_pii BOOLEAN,
  ADD COLUMN IF NOT EXISTS triaged_at   TIMESTAMPTZ;

-- Audit trail for every AI decision, so any result can be explained if disputed.
CREATE TABLE IF NOT EXISTS ai_decisions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type   TEXT NOT NULL,
  subject_id     UUID NOT NULL,
  task           TEXT NOT NULL,
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  input_hash     TEXT NOT NULL,
  output         JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_decisions_subject_idx
  ON ai_decisions(subject_type, subject_id);
