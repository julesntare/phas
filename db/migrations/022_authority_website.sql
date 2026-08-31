-- Authorities get a public website URL, shown alongside their remit.

ALTER TABLE authorities
  ADD COLUMN IF NOT EXISTS website_url TEXT;
