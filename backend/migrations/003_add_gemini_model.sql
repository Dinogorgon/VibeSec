-- Add gemini_model column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_model VARCHAR(100) DEFAULT 'gemini-pro';

-- Add index for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_users_gemini_model ON users(gemini_model) WHERE gemini_model IS NOT NULL;

