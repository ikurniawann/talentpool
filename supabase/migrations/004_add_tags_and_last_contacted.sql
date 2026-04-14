-- Add tags and last_contacted_at columns for Talent Pool Phase 4

-- Tags: array of text for custom tagging
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Last contacted: tracks when HR last contacted candidate
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Create index for faster queries on last_contacted_at
CREATE INDEX IF NOT EXISTS idx_candidates_last_contacted ON candidates(last_contacted_at);

-- Create GIN index for tags (faster array contains queries)
CREATE INDEX IF NOT EXISTS idx_candidates_tags ON candidates USING GIN(tags);

-- Add comments
COMMENT ON COLUMN candidates.tags IS 'Custom tags for talent pool categorization (e.g., Bisa part-time, Berpengalaman HACCP)';
COMMENT ON COLUMN candidates.last_contacted_at IS 'Timestamp when HR last contacted this candidate';
