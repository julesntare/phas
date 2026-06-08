-- Add optional proof image URL and ensure free_text is present on reports.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
