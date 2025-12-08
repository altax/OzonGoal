import { supabase } from './supabase';
import { localStorageService, LocalGoal, LocalShift, LocalGoalAllocation } from './localStorage';

export interface MigrationResult {
  success: boolean;
  migratedGoals: number;
  migratedShifts: number;
  migratedAllocations: number;
  error?: string;
}

export async function getLocalDataSnapshot(): Promise<{
  user: { balance: number };
  goals: LocalGoal[];
  shifts: LocalShift[];
  allocations: LocalGoalAllocation[];
} | null> {
  try {
    const hasData = await localStorageService.hasLocalData();
    if (!hasData) return null;
    
    const data = await localStorageService.getAllLocalData();
    if (data.goals.length === 0 && data.shifts.length === 0 && data.user.balance === 0) {
      return null;
    }
    
    return {
      user: { balance: data.user.balance },
      goals: [...data.goals],
      shifts: [...data.shifts],
      allocations: [...data.allocations],
    };
  } catch (error) {
    console.error('[Migration] Error getting snapshot:', error);
    return null;
  }
}

export async function migrateLocalDataToCloud(
  userId: string,
  snapshot?: {
    user: { balance: number };
    goals: LocalGoal[];
    shifts: LocalShift[];
    allocations: LocalGoalAllocation[];
  } | null
): Promise<MigrationResult> {
  console.log('[Migration] Starting migration for user:', userId);
  
  const result: MigrationResult = {
    success: false,
    migratedGoals: 0,
    migratedShifts: 0,
    migratedAllocations: 0,
  };

  try {
    const localData = snapshot || await (async () => {
      const hasData = await localStorageService.hasLocalData();
      if (!hasData) return null;
      const data = await localStorageService.getAllLocalData();
      if (data.goals.length === 0 && data.shifts.length === 0 && data.user.balance === 0) {
        return null;
      }
      return data;
    })();

    if (!localData) {
      console.log('[Migration] No local data to migrate');
      result.success = true;
      return result;
    }

    console.log('[Migration] Local data found:', {
      goals: localData.goals.length,
      shifts: localData.shifts.length,
      allocations: localData.allocations.length,
      balance: localData.user.balance,
    });

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, balance')
      .eq('id', userId)
      .single();

    const userExisted = !!existingUser;
    
    if (!existingUser) {
      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        username: 'user',
        password: '',
        balance: localData.user.balance,
      });
      if (userError) {
        console.error('[Migration] Error creating user:', userError);
      }
    }

    const { data: existingGoals } = await supabase
      .from('goals')
      .select('id, name, target_amount')
      .eq('user_id', userId);
    
    const existingGoalMap = new Map<string, string>();
    for (const g of existingGoals || []) {
      existingGoalMap.set(`${g.name}|${g.target_amount}`, g.id);
    }

    const goalIdMapping: Record<string, string> = {};
    
    for (const localGoal of localData.goals) {
      const goalKey = `${localGoal.name}|${localGoal.targetAmount}`;
      const existingId = existingGoalMap.get(goalKey);
      
      if (existingId) {
        console.log('[Migration] Goal already exists, mapping to existing:', localGoal.name);
        goalIdMapping[localGoal.id] = existingId;
        continue;
      }

      const { data: newGoal, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          name: localGoal.name,
          icon_key: localGoal.iconKey,
          icon_color: localGoal.iconColor,
          icon_bg_color: localGoal.iconBgColor,
          target_amount: localGoal.targetAmount,
          current_amount: localGoal.currentAmount,
          status: localGoal.status,
          is_primary: localGoal.isPrimary,
          order_index: localGoal.orderIndex,
          allocation_percentage: localGoal.allocationPercentage,
          completed_at: localGoal.completedAt,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Migration] Error migrating goal:', error);
        continue;
      }

      if (newGoal) {
        goalIdMapping[localGoal.id] = newGoal.id;
        result.migratedGoals++;
      }
    }

    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('id, scheduled_date, shift_type, operation_type')
      .eq('user_id', userId);
    
    const existingShiftMap = new Map<string, string>();
    for (const s of existingShifts || []) {
      existingShiftMap.set(`${s.scheduled_date}|${s.shift_type}|${s.operation_type}`, s.id);
    }

    const shiftIdMapping: Record<string, string> = {};

    for (const localShift of localData.shifts) {
      const shiftKey = `${localShift.scheduledDate}|${localShift.shiftType}|${localShift.operationType}`;
      const existingId = existingShiftMap.get(shiftKey);
      
      if (existingId) {
        console.log('[Migration] Shift already exists, mapping to existing:', shiftKey);
        shiftIdMapping[localShift.id] = existingId;
        continue;
      }

      const { data: newShift, error } = await supabase
        .from('shifts')
        .insert({
          user_id: userId,
          operation_type: localShift.operationType,
          shift_type: localShift.shiftType,
          scheduled_date: localShift.scheduledDate,
          scheduled_start: localShift.scheduledStart,
          scheduled_end: localShift.scheduledEnd,
          status: localShift.status,
          earnings: localShift.earnings,
          earnings_recorded_at: localShift.earningsRecordedAt,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Migration] Error migrating shift:', error);
        continue;
      }

      if (newShift) {
        shiftIdMapping[localShift.id] = newShift.id;
        result.migratedShifts++;
      }
    }

    for (const localAllocation of localData.allocations) {
      const newShiftId = shiftIdMapping[localAllocation.shiftId];
      const newGoalId = goalIdMapping[localAllocation.goalId];

      if (!newShiftId || !newGoalId) {
        console.warn('[Migration] Skipping allocation - missing mapping for shift or goal');
        continue;
      }

      const { data: existingAlloc } = await supabase
        .from('goal_allocations')
        .select('id')
        .eq('shift_id', newShiftId)
        .eq('goal_id', newGoalId)
        .single();

      if (existingAlloc) {
        console.log('[Migration] Allocation already exists, skipping');
        continue;
      }

      const { error } = await supabase
        .from('goal_allocations')
        .insert({
          shift_id: newShiftId,
          goal_id: newGoalId,
          amount: localAllocation.amount,
        });

      if (error) {
        console.error('[Migration] Error migrating allocation:', error);
        continue;
      }

      result.migratedAllocations++;
    }

    const somethingWasMigrated = result.migratedGoals > 0 || result.migratedShifts > 0 || result.migratedAllocations > 0;
    
    if (userExisted && localData.user.balance > 0 && somethingWasMigrated) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
      
      if (currentUser) {
        await supabase
          .from('users')
          .update({ balance: (parseFloat(String(currentUser.balance)) || 0) + localData.user.balance })
          .eq('id', userId);
        console.log('[Migration] Updated user balance:', localData.user.balance);
      }
    }

    await localStorageService.clearAllLocalData();

    result.success = true;
    console.log('[Migration] Migration completed successfully:', result);
    
    return result;
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

export async function checkAndPromptMigration(): Promise<boolean> {
  return await localStorageService.hasLocalData();
}
