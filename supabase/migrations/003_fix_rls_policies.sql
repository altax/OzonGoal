-- Migration: Fix Row Level Security (RLS) Policies
-- This migration ensures proper RLS policies are in place for all tables
-- Users can only access their own data

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_allocations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;

DROP POLICY IF EXISTS "Users can view own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can insert own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can update own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can delete own shifts" ON shifts;

DROP POLICY IF EXISTS "Users can view own allocations" ON goal_allocations;
DROP POLICY IF EXISTS "Users can insert own allocations" ON goal_allocations;
DROP POLICY IF EXISTS "Users can update own allocations" ON goal_allocations;
DROP POLICY IF EXISTS "Users can delete own allocations" ON goal_allocations;

-- Users table policies
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Goals table policies
CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Shifts table policies
CREATE POLICY "Users can view own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shifts"
  ON shifts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shifts"
  ON shifts FOR DELETE
  USING (auth.uid() = user_id);

-- Goal allocations table policies (based on shift ownership)
CREATE POLICY "Users can view own allocations"
  ON goal_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts 
      WHERE shifts.id = goal_allocations.shift_id 
      AND shifts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own allocations"
  ON goal_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts 
      WHERE shifts.id = goal_allocations.shift_id 
      AND shifts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own allocations"
  ON goal_allocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shifts 
      WHERE shifts.id = goal_allocations.shift_id 
      AND shifts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts 
      WHERE shifts.id = goal_allocations.shift_id 
      AND shifts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own allocations"
  ON goal_allocations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shifts 
      WHERE shifts.id = goal_allocations.shift_id 
      AND shifts.user_id = auth.uid()
    )
  );
