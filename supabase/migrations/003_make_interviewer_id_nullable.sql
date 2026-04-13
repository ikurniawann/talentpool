-- Make interviewer_id nullable in interviews table
-- This allows scheduling interviews without assigning a specific interviewer

ALTER TABLE interviews
ALTER COLUMN interviewer_id DROP NOT NULL;

-- Also add a comment for clarity
COMMENT ON COLUMN interviews.interviewer_id IS 'Nullable - can schedule without specific interviewer';
