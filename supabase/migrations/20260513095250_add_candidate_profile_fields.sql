-- ============================================================
-- Migration: Add Candidate Profile Fields
-- Description: Add fields for experience, education, availability, and salary expectations
-- Date: 2026-05-13
-- ============================================================

-- Add new columns to candidates table
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS last_experience TEXT,
ADD COLUMN IF NOT EXISTS last_education TEXT,
ADD COLUMN IF NOT EXISTS availability VARCHAR(20),
ADD COLUMN IF NOT EXISTS expected_salary INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN candidates.last_experience IS 'Last work experience: Company Name - Position (Duration)';
COMMENT ON COLUMN candidates.last_education IS 'Last education: Degree - Major - Institution';
COMMENT ON COLUMN candidates.availability IS 'Availability to join: immediate, 1_week, 2_weeks, 1_month';
COMMENT ON COLUMN candidates.expected_salary IS 'Expected salary in IDR';

-- Create index for availability filtering (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_candidates_availability ON candidates(availability);
