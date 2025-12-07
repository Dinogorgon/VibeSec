-- Create table to store AI-generated fixes
CREATE TABLE IF NOT EXISTS ai_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_url VARCHAR(500) NOT NULL,
  fix_data JSONB NOT NULL, -- Stores the structured diff data
  attempt_number INTEGER NOT NULL DEFAULT 1, -- Track reprompt attempts
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vulnerability_id, attempt_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_fixes_vulnerability_id ON ai_fixes(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_ai_fixes_user_id ON ai_fixes(user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_ai_fixes_updated_at
  BEFORE UPDATE ON ai_fixes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

