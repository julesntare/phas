CREATE TABLE suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id   UUID NOT NULL REFERENCES platforms(id),
  reporter_id   UUID REFERENCES citizen_accounts(id),
  user_id       UUID REFERENCES users(id),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'improvement'
                CHECK (category IN ('feature', 'improvement', 'other')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN (
                  'pending', 'public', 'dismissed',
                  'forwarded', 'acknowledged', 'planned', 'declined'
                )),
  upvotes       INTEGER NOT NULL DEFAULT 0,
  admin_note    TEXT,
  operator_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (reporter_id IS NOT NULL AND user_id IS NULL) OR
    (reporter_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX suggestions_platform_status_idx ON suggestions(platform_id, status);
CREATE INDEX suggestions_status_created_idx  ON suggestions(status, created_at DESC);

CREATE TABLE suggestion_upvotes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  reporter_id   UUID REFERENCES citizen_accounts(id),
  user_id       UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (reporter_id IS NOT NULL AND user_id IS NULL) OR
    (reporter_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Partial unique indexes so NULL values don't bypass uniqueness.
CREATE UNIQUE INDEX suggestion_upvotes_citizen_uniq ON suggestion_upvotes(suggestion_id, reporter_id) WHERE reporter_id IS NOT NULL;
CREATE UNIQUE INDEX suggestion_upvotes_user_uniq    ON suggestion_upvotes(suggestion_id, user_id)    WHERE user_id    IS NOT NULL;
