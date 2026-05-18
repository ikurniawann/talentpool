CREATE TABLE IF NOT EXISTS ai_assistant_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  prompt TEXT NOT NULL,
  intent TEXT NOT NULL,
  mode TEXT NOT NULL,
  model TEXT,
  latency_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_assistant_logs_created_at ON ai_assistant_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_logs_user_id ON ai_assistant_logs(user_id);
