import { supabase, getCurrentUserId, toClientGoal, toClientShift, toClientUser } from './supabase';
import { localStorageService, LocalGoal, LocalShift, LocalUser } from './localStorage';
import type { Goal as SupabaseGoal, Shift as SupabaseShift, User as SupabaseUser } from './supabase';

export type DataMode = 'local' | 'cloud';

function localGoalToClient(goal: LocalGoal) {
  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    iconKey: goal.iconKey,
    iconColor: goal.iconColor,
    iconBgColor: goal.iconBgColor,
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    status: goal.status,
    isPrimary: goal.isPrimary,
    orderIndex: goal.orderIndex,
    allocationPercentage: goal.allocationPercentage,
    completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
    createdAt: new Date(goal.createdAt),
    updatedAt: new Date(goal.updatedAt),
  };
}

function localShiftToClient(shift: LocalShift) {
  return {
    id: shift.id,
    userId: shift.userId,
    operationType: shift.operationType,
    shiftType: shift.shiftType,
    scheduledDate: new Date(shift.scheduledDate),
    scheduledStart: new Date(shift.scheduledStart),
    scheduledEnd: new Date(shift.scheduledEnd),
    status: shift.status,
    earnings: shift.earnings !== null ? String(shift.earnings) : null,
    earningsRecordedAt: shift.earningsRecordedAt ? new Date(shift.earningsRecordedAt) : null,
    createdAt: new Date(shift.createdAt),
    updatedAt: new Date(shift.updatedAt),
  };
}

function localUserToClient(user: LocalUser) {
  return {
    id: user.id,
    username: user.username,
    password: '',
    balance: String(user.balance),
    createdAt: new Date(user.createdAt),
  };
}

export const dataService = {
  async getUser(mode: DataMode) {
    if (mode === 'local') {
      const user = await localStorageService.getUser();
      return localUserToClient(user);
    } else {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw new Error(error.message);
      return toClientUser(data as SupabaseUser);
    }
  },

  async getGoals(mode: DataMode) {
    if (mode === 'local') {
      const goals = await localStorageService.getGoals();
      return goals
        .filter(g => g.status !== 'hidden')
        .sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return a.orderIndex - b.orderIndex;
        })
        .map(localGoalToClient);
    } else {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('order_index', { ascending: true });
      
      if (error) throw new Error(error.message);
      return (data as SupabaseGoal[]).map(toClientGoal);
    }
  },

  async createGoal(mode: DataMode, goalData: {
    name: string;
    targetAmount: string;
    iconKey?: string;
    iconColor?: string;
    iconBgColor?: string;
  }) {
    if (mode === 'local') {
      const goals = await localStorageService.getGoals();
      const maxOrder = goals.length > 0 ? Math.max(...goals.map(g => g.orderIndex)) : 0;
      
      const newGoal = await localStorageService.createGoal({
        name: goalData.name,
        iconKey: goalData.iconKey || 'target',
        iconColor: goalData.iconColor || '#3B82F6',
        iconBgColor: goalData.iconBgColor || '#E0E7FF',
        targetAmount: parseFloat(goalData.targetAmount),
        currentAmount: 0,
        status: 'active',
        isPrimary: false,
        orderIndex: maxOrder + 1,
        allocationPercentage: 0,
        completedAt: null,
      });
      
      return localGoalToClient(newGoal);
    } else {
      const userId = await getCurrentUserId();
      const { data: maxOrderData } = await supabase
        .from('goals')
        .select('order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const maxOrder = maxOrderData?.[0]?.order_index || 0;
      
      const { data: newGoal, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          name: goalData.name,
          target_amount: parseFloat(goalData.targetAmount),
          icon_key: goalData.iconKey || 'target',
          icon_color: goalData.iconColor || '#3B82F6',
          icon_bg_color: goalData.iconBgColor || '#E0E7FF',
          order_index: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientGoal(newGoal as SupabaseGoal);
    }
  },

  async updateGoal(mode: DataMode, id: string, updates: Partial<{
    name: string;
    targetAmount: string;
    currentAmount: string;
    iconKey: string;
    iconColor: string;
    iconBgColor: string;
    status: 'active' | 'completed' | 'hidden';
    isPrimary: boolean;
    orderIndex: number;
    allocationPercentage: number;
  }>) {
    if (mode === 'local') {
      const localUpdates: Partial<LocalGoal> = {};
      if (updates.name !== undefined) localUpdates.name = updates.name;
      if (updates.targetAmount !== undefined) localUpdates.targetAmount = parseFloat(updates.targetAmount);
      if (updates.currentAmount !== undefined) localUpdates.currentAmount = parseFloat(updates.currentAmount);
      if (updates.iconKey !== undefined) localUpdates.iconKey = updates.iconKey;
      if (updates.iconColor !== undefined) localUpdates.iconColor = updates.iconColor;
      if (updates.iconBgColor !== undefined) localUpdates.iconBgColor = updates.iconBgColor;
      if (updates.status !== undefined) {
        localUpdates.status = updates.status;
        if (updates.status === 'completed') {
          localUpdates.completedAt = new Date().toISOString();
        }
      }
      if (updates.isPrimary !== undefined) localUpdates.isPrimary = updates.isPrimary;
      if (updates.orderIndex !== undefined) localUpdates.orderIndex = updates.orderIndex;
      if (updates.allocationPercentage !== undefined) localUpdates.allocationPercentage = updates.allocationPercentage;
      
      const updated = await localStorageService.updateGoal(id, localUpdates);
      return updated ? localGoalToClient(updated) : null;
    } else {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.targetAmount !== undefined) updateData.target_amount = parseFloat(updates.targetAmount);
      if (updates.currentAmount !== undefined) updateData.current_amount = parseFloat(updates.currentAmount);
      if (updates.iconKey !== undefined) updateData.icon_key = updates.iconKey;
      if (updates.iconColor !== undefined) updateData.icon_color = updates.iconColor;
      if (updates.iconBgColor !== undefined) updateData.icon_bg_color = updates.iconBgColor;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        if (updates.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;
      if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;
      if (updates.allocationPercentage !== undefined) updateData.allocation_percentage = updates.allocationPercentage;
      
      const { data, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientGoal(data as SupabaseGoal);
    }
  },

  async deleteGoal(mode: DataMode, id: string) {
    if (mode === 'local') {
      return await localStorageService.deleteGoal(id);
    } else {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      return true;
    }
  },

  async getShifts(mode: DataMode) {
    if (mode === 'local') {
      const shifts = await localStorageService.getShifts();
      return shifts
        .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime())
        .map(localShiftToClient);
    } else {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_start', { ascending: false });
      
      if (error) throw new Error(error.message);
      return (data as SupabaseShift[]).map(toClientShift);
    }
  },

  async createShift(mode: DataMode, shiftData: {
    operationType: 'returns' | 'receiving';
    shiftType: 'day' | 'night';
    scheduledDate: string;
  }) {
    const date = new Date(shiftData.scheduledDate);
    
    let scheduledStart: Date;
    let scheduledEnd: Date;
    
    if (shiftData.shiftType === 'day') {
      scheduledStart = new Date(date);
      scheduledStart.setHours(8, 0, 0, 0);
      scheduledEnd = new Date(date);
      scheduledEnd.setHours(20, 0, 0, 0);
    } else {
      scheduledStart = new Date(date);
      scheduledStart.setHours(20, 0, 0, 0);
      scheduledEnd = new Date(date);
      scheduledEnd.setDate(scheduledEnd.getDate() + 1);
      scheduledEnd.setHours(8, 0, 0, 0);
    }
    
    const now = new Date();
    const status = scheduledStart <= now && now < scheduledEnd ? 'in_progress' : 'scheduled';
    
    if (mode === 'local') {
      const newShift = await localStorageService.createShift({
        operationType: shiftData.operationType,
        shiftType: shiftData.shiftType,
        scheduledDate: date.toISOString(),
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        status: status as 'scheduled' | 'in_progress',
        earnings: null,
        earningsRecordedAt: null,
      });
      
      return localShiftToClient(newShift);
    } else {
      const userId = await getCurrentUserId();
      
      const { data: newShift, error } = await supabase
        .from('shifts')
        .insert({
          user_id: userId,
          operation_type: shiftData.operationType,
          shift_type: shiftData.shiftType,
          scheduled_date: date.toISOString(),
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          status,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientShift(newShift as SupabaseShift);
    }
  },

  async updateShift(mode: DataMode, id: string, updates: Partial<{
    status: string;
    scheduledDate: string;
    earnings: number;
    earningsRecordedAt: string;
  }>) {
    if (mode === 'local') {
      const localUpdates: Partial<LocalShift> = {};
      if (updates.status !== undefined) localUpdates.status = updates.status as LocalShift['status'];
      if (updates.earnings !== undefined) localUpdates.earnings = updates.earnings;
      if (updates.earningsRecordedAt !== undefined) localUpdates.earningsRecordedAt = updates.earningsRecordedAt;
      
      const updated = await localStorageService.updateShift(id, localUpdates);
      return updated ? localShiftToClient(updated) : null;
    } else {
      const updateData: Record<string, unknown> = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.earnings !== undefined) updateData.earnings = updates.earnings;
      if (updates.earningsRecordedAt !== undefined) updateData.earnings_recorded_at = updates.earningsRecordedAt;
      
      const { data, error } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientShift(data as SupabaseShift);
    }
  },

  async cancelShift(mode: DataMode, id: string) {
    return this.updateShift(mode, id, { status: 'canceled' });
  },
};
