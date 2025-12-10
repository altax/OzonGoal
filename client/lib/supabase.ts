import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supabase] Error getting current user:', error);
    }
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

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
  allocation_percentage: number;
  deadline: string | null;
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
  allocationPercentage: number;
  deadline: Date | null;
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
    allocationPercentage: goal.allocation_percentage || 0,
    deadline: goal.deadline ? new Date(goal.deadline) : null,
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
  balance: string;
  createdAt: Date;
} {
  return {
    id: user.id,
    username: user.username,
    balance: user.balance,
    createdAt: new Date(user.created_at),
  };
}
