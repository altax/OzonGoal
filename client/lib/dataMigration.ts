import { supabase } from './supabase';
import { localStorageService, LocalGoal, LocalShift, LocalGoalAllocation } from './localStorage';

export interface MigrationResult {
  success: boolean;
  migratedGoals: number;
  migratedShifts: number;
  migratedAllocations: number;
  error?: string;
}

export async function migrateLocalDataToCloud(userId: string): Promise<MigrationResult> {
  console.log('[Migration] Starting migration for user:', userId);
  
  const result: MigrationResult = {
    success: false,
    migratedGoals: 0,
    migratedShifts: 0,
    migratedAllocations: 0,
  };

  try {
    const hasData = await localStorageService.hasLocalData();
    if (!hasData) {
      console.log('[Migration] No local data to migrate');
      result.success = true;
      return result;
    }

    const localData = await localStorageService.getAllLocalData();
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

    if (!existingUser) {
      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        username: localData.user.username || 'user',
        password: '',
        balance: localData.user.balance,
      });
      if (userError) {
        console.error('[Migration] Error creating user:', userError);
      }
    } else if (localData.user.balance > 0) {
      await supabase
        .from('users')
        .update({ balance: (parseFloat(String(existingUser.balance)) || 0) + localData.user.balance })
        .eq('id', userId);
    }

    const goalIdMapping: Record<string, string> = {};
    
    for (const localGoal of localData.goals) {
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

    const shiftIdMapping: Record<string, string> = {};

    for (const localShift of localData.shifts) {
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
        console.warn('[Migration] Skipping allocation - missing mapping');
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
