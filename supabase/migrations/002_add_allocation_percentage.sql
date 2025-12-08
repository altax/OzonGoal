-- Migration: Add allocation percentage to goals
-- This allows users to set a default percentage for auto-allocation of earnings

ALTER TABLE goals ADD COLUMN IF NOT EXISTS allocation_percentage INTEGER DEFAULT 0;

-- Add constraint to ensure percentage is between 0 and 100
ALTER TABLE goals ADD CONSTRAINT allocation_percentage_range 
  CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);

-- Comment for documentation
COMMENT ON COLUMN goals.allocation_percentage IS 'Default percentage of earnings to auto-allocate to this goal (0-100)';
