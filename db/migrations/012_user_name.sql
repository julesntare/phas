-- Allow phone-OTP citizens to set a display name.
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
