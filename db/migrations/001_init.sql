-- PHAS Phase 1 — initial schema
-- Run against a fresh Postgres 16+ database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Core lookup tables ───────────────────────────────────────────────────────

CREATE TABLE authorities (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  remit_description TEXT
);

CREATE TABLE platforms (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id           UUID NOT NULL REFERENCES authorities(id),
  name                   TEXT NOT NULL,
  base_url               TEXT NOT NULL,
  category               TEXT NOT NULL,
  public_support_channel TEXT
);

-- ─── Citizen identity ─────────────────────────────────────────────────────────

-- Location stored at district level only — raw GPS is never persisted.
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL UNIQUE,
  district   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Short-lived OTP codes (10-minute TTL, single-use).
CREATE TABLE otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX otp_codes_phone_idx ON otp_codes(phone) WHERE NOT used;

-- JWT backing store — lets us revoke sessions if needed.
CREATE TABLE user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Operator & regulator identity ───────────────────────────────────────────

-- Phase 2 entity — created now to avoid a migration mid-sprint.
-- webhook_url receives a POST when an incident on their platform changes state.
CREATE TABLE help_desk_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'operator',
  webhook_url TEXT
);

CREATE TABLE regulator_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id UUID NOT NULL REFERENCES authorities(id),
  email        TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL DEFAULT 'viewer' -- 'viewer' | 'admin'
);

-- ─── Citizen activity ─────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform_id)
);

-- type='affected' → numerator; type='ok' → denominator.
-- district is pre-coarsened by the API before insert.
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('affected', 'ok')),
  district    TEXT,
  free_text   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reports_platform_created_idx ON reports(platform_id, created_at DESC);

-- ─── Incident lifecycle ───────────────────────────────────────────────────────

-- confidence: 0.0–1.0 signal strength at last update (affected-ratio × probe weight).
CREATE TABLE incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id      UUID NOT NULL REFERENCES platforms(id),
  state            TEXT NOT NULL DEFAULT 'detected'
                   CHECK (state IN (
                     'detected','confirmed','acknowledged',
                     'partially_resolved','resolved','recurred'
                   )),
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recurrence_count INTEGER NOT NULL DEFAULT 0,
  confidence       NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX incidents_platform_state_idx ON incidents(platform_id, state);

-- Immutable audit trail — every state change appends a row. Never update/delete.
-- source: who drove the transition.
CREATE TABLE incident_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  from_state  TEXT,
  to_state    TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('crowd','probe','helpdesk')),
  note        TEXT,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Probe results ────────────────────────────────────────────────────────────

-- check_type enum (Phase 1: http_ping only; others added in Phase 3).
CREATE TABLE probe_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  check_type  TEXT NOT NULL CHECK (check_type IN ('http_ping','login_flow','payment_flow','dns')),
  status_code INTEGER,
  ok          BOOLEAN NOT NULL,
  latency_ms  INTEGER,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX probe_results_platform_ran_idx ON probe_results(platform_id, ran_at DESC);

-- ─── Notification deduplication ──────────────────────────────────────────────

-- Prevents sending "are you affected?" twice for the same incident to the same user.
CREATE TABLE notifications_sent (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, incident_id)
);
