-- Add vote direction and optional comment to suggestion votes.
ALTER TABLE suggestion_upvotes
  ADD COLUMN vote_type text NOT NULL DEFAULT 'up'
              CHECK (vote_type IN ('up', 'down')),
  ADD COLUMN comment   text
              CHECK (comment IS NULL OR char_length(comment) <= 200);
