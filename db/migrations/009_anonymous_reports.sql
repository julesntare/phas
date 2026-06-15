-- Allow reports from unauthenticated (anonymous) citizens.
ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL;
