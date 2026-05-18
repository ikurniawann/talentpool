-- AI Assistant Memory & Chat History
-- Supports persistent chat sessions and per-message storage

CREATE TABLE IF NOT EXISTS ai_assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_assistant_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  meta JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_assistant_sessions_user ON ai_assistant_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_messages_session ON ai_assistant_messages(session_id, created_at ASC);

-- RLS (enabled, but API uses service_role; safe for server routes)
ALTER TABLE ai_assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_assistant_sessions_owner ON ai_assistant_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY ai_assistant_messages_owner ON ai_assistant_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ai_assistant_sessions WHERE user_id = auth.uid()
    )
  );
