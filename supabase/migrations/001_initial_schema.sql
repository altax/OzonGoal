-- Supabase Migration: Initial Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE goal_status AS ENUM ('active', 'completed');
CREATE TYPE operation_type AS ENUM ('returns', 'receiving');
CREATE TYPE shift_type AS ENUM ('day', 'night');
CREATE TYPE shift_status AS ENUM ('scheduled', 'in_progress', 'completed', 'canceled', 'no_show');

-- Create users table (profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '',
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT 'target',
  icon_color TEXT NOT NULL DEFAULT '#3B82F6',
  icon_bg_color TEXT NOT NULL DEFAULT '#E0E7FF',
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status goal_status NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  operation_type operation_type NOT NULL,
  shift_type shift_type NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status shift_status NOT NULL DEFAULT 'scheduled',
  earnings DECIMAL(12, 2),
  earnings_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create goal_allocations table
CREATE TABLE IF NOT EXISTS goal_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_scheduled_date ON shifts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_goal_allocations_shift_id ON goal_allocations(shift_id);
CREATE INDEX IF NOT EXISTS idx_goal_allocations_goal_id ON goal_allocations(goal_id);

-- Create default user for anonymous access
INSERT INTO users (id, username, password, balance)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'default', 0)
ON CONFLICT (username) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_allocations ENABLE ROW LEVEL SECURITY;

-- For now, allow anonymous access (we'll use a default user)
-- In production, you should use auth.uid() for proper user isolation

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for goals" ON goals FOR ALL USING (true);
CREATE POLICY "Allow all for shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow all for goal_allocations" ON goal_allocations FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check shift conflict
CREATE OR REPLACE FUNCTION check_shift_conflict(
  p_user_id UUID,
  p_scheduled_date TIMESTAMPTZ,
  p_shift_type shift_type,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM shifts
  WHERE user_id = p_user_id
    AND shift_type = p_shift_type
    AND DATE(scheduled_date) = DATE(p_scheduled_date)
    AND status != 'canceled'
    AND (p_exclude_id IS NULL OR id != p_exclude_id);
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to record earnings (transactional)
CREATE OR REPLACE FUNCTION record_earnings(
  p_shift_id UUID,
  p_earnings DECIMAL,
  p_allocations JSONB
)
RETURNS shifts AS $$
DECLARE
  v_shift shifts;
  v_allocation JSONB;
  v_total_allocated DECIMAL := 0;
  v_remainder DECIMAL;
  v_goal goals;
BEGIN
  -- Update the shift
  UPDATE shifts
  SET status = 'completed',
      earnings = p_earnings,
      earnings_recorded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_shift_id
  RETURNING * INTO v_shift;
  
  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  
  -- Process each allocation
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    -- Insert allocation record
    INSERT INTO goal_allocations (shift_id, goal_id, amount)
    VALUES (
      p_shift_id,
      (v_allocation->>'goalId')::UUID,
      (v_allocation->>'amount')::DECIMAL
    );
    
    -- Update goal current amount
    UPDATE goals
    SET current_amount = current_amount + (v_allocation->>'amount')::DECIMAL,
        updated_at = NOW()
    WHERE id = (v_allocation->>'goalId')::UUID;
    
    v_total_allocated := v_total_allocated + (v_allocation->>'amount')::DECIMAL;
    
    -- Check if goal is completed
    SELECT * INTO v_goal FROM goals WHERE id = (v_allocation->>'goalId')::UUID;
    IF v_goal.current_amount >= v_goal.target_amount THEN
      UPDATE goals
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_goal.id;
    END IF;
  END LOOP;
  
  -- Add remainder to user balance
  v_remainder := p_earnings - v_total_allocated;
  IF v_remainder > 0 AND v_shift.user_id IS NOT NULL THEN
    UPDATE users
    SET balance = balance + v_remainder
    WHERE id = v_shift.user_id;
  END IF;
  
  RETURN v_shift;
END;
$$ LANGUAGE plpgsql;

-- Function to get goals summary
CREATE OR REPLACE FUNCTION get_goals_summary(p_user_id UUID)
RETURNS TABLE(count BIGINT, total_target DECIMAL, total_current DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(target_amount), 0)::DECIMAL,
    COALESCE(SUM(current_amount), 0)::DECIMAL
  FROM goals
  WHERE user_id = p_user_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to get shifts summary
CREATE OR REPLACE FUNCTION get_shifts_summary(p_user_id UUID)
RETURNS TABLE(past BIGINT, scheduled BIGINT, current_shift JSONB) AS $$
DECLARE
  v_current_shift JSONB;
BEGIN
  SELECT to_jsonb(s.*) INTO v_current_shift
  FROM shifts s
  WHERE s.user_id = p_user_id AND s.status = 'in_progress'
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM shifts WHERE user_id = p_user_id AND status = 'completed')::BIGINT,
    (SELECT COUNT(*) FROM shifts WHERE user_id = p_user_id AND status = 'scheduled' AND scheduled_start >= NOW())::BIGINT,
    v_current_shift;
END;
$$ LANGUAGE plpgsql;
