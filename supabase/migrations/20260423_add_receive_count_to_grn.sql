-- ============================================
-- ADD: receive_count column to grn table
-- Date: 2026-04-23
-- Description: Track how many times a delivery has been received
-- ============================================

-- Add receive_count column
ALTER TABLE grn 
ADD COLUMN IF NOT EXISTS receive_count INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN grn.receive_count IS 'Penerimaan ke-berapa untuk delivery ini (1 = pertama, 2 = kedua, dst)';

-- Update existing records to have receive_count = 1
UPDATE grn SET receive_count = 1 WHERE receive_count IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_grn_receive_count 
ON grn(delivery_id, receive_count);
