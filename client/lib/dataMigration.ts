import { supabase } from './supabase';
import { localStorageService, LocalGoal, LocalShift, LocalGoalAllocation } from './localStorage';

const LOG_PREFIX = '[DataMigration]';

export interface MigrationResult {
  success: boolean;
  migratedGoals: number;
  migratedShifts: number;
  migratedAllocations: number;
  error?: string;
}

export interface LocalDataSnapshot {
  user: { balance: number };
  goals: LocalGoal[];
  shifts: LocalShift[];
  allocations: LocalGoalAllocation[];
}

export async function getLocalDataSnapshot(): Promise<LocalDataSnapshot | null> {
  try {
    console.log(`${LOG_PREFIX} Getting local data snapshot`);
    
    const hasData = await localStorageService.hasLocalData();
    if (!hasData) {
      console.log(`${LOG_PREFIX} No local data flag set`);
      return null;
    }
    
    const data = await localStorageService.getAllLocalData();
    
    const hasContent = data.goals.length > 0 || data.shifts.length > 0 || data.user.balance > 0;
    if (!hasContent) {
      console.log(`${LOG_PREFIX} No meaningful local data found`);
      return null;
    }
    
    console.log(`${LOG_PREFIX} Snapshot created:`, {
      goals: data.goals.length,
      shifts: data.shifts.length,
      allocations: data.allocations.length,
      balance: data.user.balance,
    });
    
    return {
      user: { balance: data.user.balance },
      goals: [...data.goals],
      shifts: [...data.shifts],
      allocations: [...data.allocations],
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting snapshot:`, error);
    return null;
  }
}

export async function migrateLocalDataToCloud(
  userId: string,
  snapshot?: LocalDataSnapshot | null
): Promise<MigrationResult> {
  console.log(`${LOG_PREFIX} Starting migration for user:`, userId);
  
  const result: MigrationResult = {
    success: false,
    migratedGoals: 0,
    migratedShifts: 0,
    migratedAllocations: 0,
  };

  try {
    const localData = snapshot || await getLocalDataSnapshot();

    if (!localData) {
      console.log(`${LOG_PREFIX} No local data to migrate`);
      result.success = true;
      return result;
    }

    console.log(`${LOG_PREFIX} Processing migration:`, {
      goals: localData.goals.length,
      shifts: localData.shifts.length,
      allocations: localData.allocations.length,
      balance: localData.user.balance,
    });

    const userResult = await ensureUserExists(userId, localData.user.balance);
    if (!userResult.success) {
      throw new Error('Failed to ensure user exists');
    }

    const goalIdMapping = await migrateGoals(userId, localData.goals);
    result.migratedGoals = Object.keys(goalIdMapping).length;

    const shiftIdMapping = await migrateShifts(userId, localData.shifts);
    result.migratedShifts = Object.keys(shiftIdMapping).length;

    result.migratedAllocations = await migrateAllocations(
      localData.allocations,
      goalIdMapping,
      shiftIdMapping
    );

    if (localData.user.balance > 0 && result.migratedGoals + result.migratedShifts > 0) {
      await updateUserBalance(userId, localData.user.balance);
    }

    await localStorageService.clearAllLocalData();
    console.log(`${LOG_PREFIX} Local data cleared after successful migration`);

    result.success = true;
    console.log(`${LOG_PREFIX} Migration completed successfully:`, result);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${LOG_PREFIX} Migration failed:`, errorMessage);
    result.error = errorMessage;
    return result;
  }
}

async function ensureUserExists(userId: string, initialBalance: number): Promise<{ success: boolean }> {
  try {
    console.log(`${LOG_PREFIX} Ensuring user exists:`, userId);
    
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, balance')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error(`${LOG_PREFIX} Error checking user:`, selectError);
    }
    
    if (!existingUser) {
      console.log(`${LOG_PREFIX} Creating new user record`);
      const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        username: 'user',
        password: '',
        balance: initialBalance,
      });
      
      if (insertError) {
        console.error(`${LOG_PREFIX} Error creating user:`, insertError);
        return { success: false };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in ensureUserExists:`, error);
    return { success: false };
  }
}

async function migrateGoals(
  userId: string,
  localGoals: LocalGoal[]
): Promise<Record<string, string>> {
  const goalIdMapping: Record<string, string> = {};
  
  if (localGoals.length === 0) {
    console.log(`${LOG_PREFIX} No goals to migrate`);
    return goalIdMapping;
  }

  console.log(`${LOG_PREFIX} Migrating ${localGoals.length} goals`);

  const { data: existingGoals } = await supabase
    .from('goals')
    .select('id, name, target_amount')
    .eq('user_id', userId);
  
  const existingGoalMap = new Map<string, string>();
  for (const g of existingGoals || []) {
    existingGoalMap.set(`${g.name}|${g.target_amount}`, g.id);
  }

  for (const localGoal of localGoals) {
    try {
      const goalKey = `${localGoal.name}|${localGoal.targetAmount}`;
      const existingId = existingGoalMap.get(goalKey);
      
      if (existingId) {
        console.log(`${LOG_PREFIX} Goal already exists, mapping:`, localGoal.name);
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
          status: localGoal.status === 'hidden' ? 'active' : localGoal.status,
          is_primary: localGoal.isPrimary,
          order_index: localGoal.orderIndex,
          allocation_percentage: localGoal.allocationPercentage || 0,
          completed_at: localGoal.completedAt,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`${LOG_PREFIX} Error migrating goal ${localGoal.name}:`, error);
        continue;
      }

      if (newGoal) {
        goalIdMapping[localGoal.id] = newGoal.id;
        console.log(`${LOG_PREFIX} Migrated goal:`, localGoal.name);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Exception migrating goal:`, error);
    }
  }

  console.log(`${LOG_PREFIX} Goals migration complete:`, Object.keys(goalIdMapping).length);
  return goalIdMapping;
}

async function migrateShifts(
  userId: string,
  localShifts: LocalShift[]
): Promise<Record<string, string>> {
  const shiftIdMapping: Record<string, string> = {};
  
  if (localShifts.length === 0) {
    console.log(`${LOG_PREFIX} No shifts to migrate`);
    return shiftIdMapping;
  }

  console.log(`${LOG_PREFIX} Migrating ${localShifts.length} shifts`);

  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('id, scheduled_date, shift_type, operation_type')
    .eq('user_id', userId);
  
  const existingShiftMap = new Map<string, string>();
  for (const s of existingShifts || []) {
    const dateKey = new Date(s.scheduled_date).toISOString().split('T')[0];
    existingShiftMap.set(`${dateKey}|${s.shift_type}|${s.operation_type}`, s.id);
  }

  for (const localShift of localShifts) {
    try {
      const dateKey = new Date(localShift.scheduledDate).toISOString().split('T')[0];
      const shiftKey = `${dateKey}|${localShift.shiftType}|${localShift.operationType}`;
      const existingId = existingShiftMap.get(shiftKey);
      
      if (existingId) {
        console.log(`${LOG_PREFIX} Shift already exists, mapping:`, shiftKey);
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
        console.error(`${LOG_PREFIX} Error migrating shift:`, error);
        continue;
      }

      if (newShift) {
        shiftIdMapping[localShift.id] = newShift.id;
        console.log(`${LOG_PREFIX} Migrated shift:`, shiftKey);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Exception migrating shift:`, error);
    }
  }

  console.log(`${LOG_PREFIX} Shifts migration complete:`, Object.keys(shiftIdMapping).length);
  return shiftIdMapping;
}

async function migrateAllocations(
  localAllocations: LocalGoalAllocation[],
  goalIdMapping: Record<string, string>,
  shiftIdMapping: Record<string, string>
): Promise<number> {
  let migratedCount = 0;
  
  if (localAllocations.length === 0) {
    console.log(`${LOG_PREFIX} No allocations to migrate`);
    return migratedCount;
  }

  console.log(`${LOG_PREFIX} Migrating ${localAllocations.length} allocations`);

  for (const allocation of localAllocations) {
    try {
      const newShiftId = shiftIdMapping[allocation.shiftId];
      const newGoalId = goalIdMapping[allocation.goalId];

      if (!newShiftId || !newGoalId) {
        console.warn(`${LOG_PREFIX} Skipping allocation - missing mapping`);
        continue;
      }

      const { data: existingAlloc } = await supabase
        .from('goal_allocations')
        .select('id')
        .eq('shift_id', newShiftId)
        .eq('goal_id', newGoalId)
        .single();

      if (existingAlloc) {
        console.log(`${LOG_PREFIX} Allocation already exists, skipping`);
        continue;
      }

      const { error } = await supabase
        .from('goal_allocations')
        .insert({
          shift_id: newShiftId,
          goal_id: newGoalId,
          amount: allocation.amount,
        });

      if (error) {
        console.error(`${LOG_PREFIX} Error migrating allocation:`, error);
        continue;
      }

      migratedCount++;
    } catch (error) {
      console.error(`${LOG_PREFIX} Exception migrating allocation:`, error);
    }
  }

  console.log(`${LOG_PREFIX} Allocations migration complete:`, migratedCount);
  return migratedCount;
}

async function updateUserBalance(userId: string, additionalBalance: number): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Updating user balance by:`, additionalBalance);
    
    const { data: currentUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();
    
    if (currentUser) {
      const newBalance = (parseFloat(String(currentUser.balance)) || 0) + additionalBalance;
      
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);
        
      console.log(`${LOG_PREFIX} User balance updated to:`, newBalance);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating balance:`, error);
  }
}

export async function checkAndPromptMigration(): Promise<boolean> {
  return await localStorageService.hasLocalData();
}
