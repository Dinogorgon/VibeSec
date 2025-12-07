-- Add gemini_api_key column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255);

-- Add index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_gemini_api_key ON users(gemini_api_key) WHERE gemini_api_key IS NOT NULL;

