import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

console.log('Supabase URL:', supabaseUrl ? 'set' : 'missing');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'set' : 'missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export type Goal = {
  id: string;
  user_id: string | null;
  name: string;
  icon_key: string;
  icon_color: string;
  icon_bg_color: string;
  target_amount: string;
  current_amount: string;
  status: 'active' | 'completed' | 'hidden';
  is_primary: boolean;
  order_index: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  user_id: string | null;
  operation_type: 'returns' | 'receiving';
  shift_type: 'day' | 'night';
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'no_show';
  earnings: string | null;
  earnings_recorded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  username: string;
  password: string;
  balance: string;
  created_at: string;
};

export type GoalAllocation = {
  id: string;
  shift_id: string;
  goal_id: string;
  amount: string;
  created_at: string;
};

export function toClientGoal(goal: Goal): {
  id: string;
  userId: string | null;
  name: string;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  targetAmount: string;
  currentAmount: string;
  status: 'active' | 'completed' | 'hidden';
  isPrimary: boolean;
  orderIndex: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: goal.id,
    userId: goal.user_id,
    name: goal.name,
    iconKey: goal.icon_key,
    iconColor: goal.icon_color,
    iconBgColor: goal.icon_bg_color,
    targetAmount: goal.target_amount,
    currentAmount: goal.current_amount,
    status: goal.status,
    isPrimary: goal.is_primary,
    orderIndex: goal.order_index,
    completedAt: goal.completed_at ? new Date(goal.completed_at) : null,
    createdAt: new Date(goal.created_at),
    updatedAt: new Date(goal.updated_at),
  };
}

export function toClientShift(shift: Shift): {
  id: string;
  userId: string | null;
  operationType: 'returns' | 'receiving';
  shiftType: 'day' | 'night';
  scheduledDate: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'no_show';
  earnings: string | null;
  earningsRecordedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: shift.id,
    userId: shift.user_id,
    operationType: shift.operation_type,
    shiftType: shift.shift_type,
    scheduledDate: new Date(shift.scheduled_date),
    scheduledStart: new Date(shift.scheduled_start),
    scheduledEnd: new Date(shift.scheduled_end),
    status: shift.status,
    earnings: shift.earnings,
    earningsRecordedAt: shift.earnings_recorded_at ? new Date(shift.earnings_recorded_at) : null,
    createdAt: new Date(shift.created_at),
    updatedAt: new Date(shift.updated_at),
  };
}

export function toClientUser(user: User): {
  id: string;
  username: string;
  password: string;
  balance: string;
  createdAt: Date;
} {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    balance: user.balance,
    createdAt: new Date(user.created_at),
  };
}
