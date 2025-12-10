-- Migration: Add deadline column and hidden status to goals
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add 'hidden' to goal_status enum
ALTER TYPE goal_status ADD VALUE IF NOT EXISTS 'hidden';

-- Step 2: Add deadline column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN goals.deadline IS 'Optional target date for completing the goal';

-- Create index for deadline queries
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline) WHERE deadline IS NOT NULL;
