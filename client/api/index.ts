import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getCurrentUserId, toClientGoal, toClientShift, toClientUser, type Goal as SupabaseGoal, type Shift as SupabaseShift, type User as SupabaseUser } from "../lib/supabase";
import { dataService, DataMode } from "../lib/dataService";
import { useDataMode } from "../contexts/DataModeContext";

type Goal = ReturnType<typeof toClientGoal>;
type Shift = ReturnType<typeof toClientShift>;
type User = ReturnType<typeof toClientUser>;

async function ensureUser(userId: string) {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!existingUser) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from('users').insert({
      id: userId,
      username: authUser?.email?.split('@')[0] || 'user',
      balance: 0,
    });
  }
}

export function useUser() {
  const { mode } = useDataMode();
  
  return useQuery<User>({
    queryKey: ["user", mode],
    queryFn: async () => {
      return await dataService.getUser(mode);
    },
  });
}

export function useGoals() {
  const { mode } = useDataMode();
  
  return useQuery<Goal[]>({
    queryKey: ["goals", mode],
    queryFn: async () => {
      console.log('[API] Fetching goals, mode:', mode);
      const goals = await dataService.getGoals(mode);
      console.log('[API] Goals fetched:', goals.length);
      return goals;
    },
    refetchInterval: mode === 'cloud' ? 5000 : false,
  });
}

export function useGoalsSummary() {
  const { mode } = useDataMode();
  
  return useQuery<{ count: number; totalTarget: number; totalCurrent: number }>({
    queryKey: ["goals", "summary", mode],
    queryFn: async () => {
      return await dataService.getGoalsSummary(mode);
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      targetAmount: string;
      iconKey?: string;
      iconColor?: string;
      iconBgColor?: string;
      deadline?: string | null;
    }) => {
      return await dataService.createGoal(mode, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
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
      deadline: string | null;
    }>) => {
      return await dataService.updateGoal(mode, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await dataService.deleteGoal(mode, id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useHiddenGoals() {
  const { mode } = useDataMode();
  
  return useQuery<Goal[]>({
    queryKey: ["goals", "hidden", mode],
    queryFn: async () => {
      return await dataService.getHiddenGoals(mode);
    },
  });
}

export function useDeleteAllHiddenGoals() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async () => {
      return await dataService.deleteAllHiddenGoals(mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDeleteAllHiddenShifts() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async () => {
      return await dataService.deleteAllHiddenShifts(mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useDeleteAllData() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async () => {
      return await dataService.deleteAllData(mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["earnings-stats"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function useReorderGoals() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (goalIds: string[]) => {
      return await dataService.reorderGoals(mode, goalIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useSetPrimaryGoal() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      return await dataService.setPrimaryGoal(mode, goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

async function autoUpdateShiftStatuses(userId: string) {
  const now = new Date().toISOString();
  
  const { data: expiredInProgressShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .lt('scheduled_end', now);
  
  if (expiredInProgressShifts && expiredInProgressShifts.length > 0) {
    for (const shift of expiredInProgressShifts) {
      await supabase
        .from('shifts')
        .update({ status: 'completed' })
        .eq('id', shift.id);
    }
  }
  
  const { data: missedScheduledShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .lt('scheduled_end', now);
  
  if (missedScheduledShifts && missedScheduledShifts.length > 0) {
    for (const shift of missedScheduledShifts) {
      await supabase
        .from('shifts')
        .update({ status: 'completed' })
        .eq('id', shift.id);
    }
  }
  
  const { data: startedShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .lte('scheduled_start', now)
    .gt('scheduled_end', now);
  
  if (startedShifts && startedShifts.length > 0) {
    for (const shift of startedShifts) {
      await supabase
        .from('shifts')
        .update({ status: 'in_progress' })
        .eq('id', shift.id);
    }
  }
}

export function useCompleteShift() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await dataService.updateShift(mode, id, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useShifts() {
  const { mode } = useDataMode();
  
  return useQuery<Shift[]>({
    queryKey: ["shifts", mode],
    queryFn: async () => {
      if (mode === 'cloud') {
        const userId = await getCurrentUserId();
        if (userId) {
          await autoUpdateShiftStatuses(userId);
        }
      }
      
      return await dataService.getShifts(mode);
    },
  });
}

export function useShiftsSummary() {
  const { mode } = useDataMode();
  
  return useQuery<{ past: number; scheduled: number; current: Shift | null; next: Shift | null }>({
    queryKey: ["shifts", "summary", mode],
    queryFn: async () => {
      if (mode === 'local') {
        const shifts = await dataService.getShifts(mode);
        const now = new Date();
        
        const scheduledShifts = shifts
          .filter(s => s.status === 'scheduled' && s.scheduledStart > now)
          .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
        
        return {
          past: shifts.filter(s => s.status === 'completed').length,
          scheduled: scheduledShifts.length,
          current: shifts.find(s => s.status === 'in_progress') || null,
          next: scheduledShifts[0] || null,
        };
      }
      
      const userId = await getCurrentUserId();
      if (!userId) {
        return { past: 0, scheduled: 0, current: null, next: null };
      }
      
      await autoUpdateShiftStatuses(userId);
      const now = new Date().toISOString();
      
      const { data: pastData } = await supabase
        .from('shifts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed');
      
      const { data: scheduledData } = await supabase
        .from('shifts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_start', now);
      
      const { data: currentData } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .limit(1);
      
      const { data: nextData } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(1);
      
      return {
        past: pastData?.length || 0,
        scheduled: scheduledData?.length || 0,
        current: currentData?.[0] ? toClientShift(currentData[0] as SupabaseShift) : null,
        next: nextData?.[0] ? toClientShift(nextData[0] as SupabaseShift) : null,
      };
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (data: {
      operationType: "returns" | "receiving";
      shiftType: "day" | "night";
      scheduledDate: string;
    }) => {
      const shift = await dataService.createShift(mode, data);
      if (!shift) throw new Error("Не удалось создать смену");
      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await dataService.cancelShift(mode, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async ({ id, scheduledDate, status }: { id: string; scheduledDate?: string; status?: string }) => {
      const updates: {
        status?: string;
        scheduledDate?: string;
        scheduledStart?: string;
        scheduledEnd?: string;
      } = {};
      
      if (status !== undefined) {
        updates.status = status;
      }
      
      if (scheduledDate !== undefined) {
        const date = new Date(scheduledDate);
        
        const shift = await dataService.getShiftById(mode, id);
        if (!shift) throw new Error('Shift not found');
        
        let scheduledStart: Date;
        let scheduledEnd: Date;
        
        if (shift.shiftType === "day") {
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
        
        updates.scheduledDate = date.toISOString();
        updates.scheduledStart = scheduledStart.toISOString();
        updates.scheduledEnd = scheduledEnd.toISOString();
      }
      
      return await dataService.updateShift(mode, id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  const { mode } = useDataMode();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await dataService.updateShift(mode, id, { status: 'no_show' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useBalanceHistory() {
  const { mode } = useDataMode();
  
  return useQuery<{ 
    id: string;
    type: 'earning' | 'allocation';
    amount: number;
    date: string;
    description: string;
    goalName?: string;
  }[]>({
    queryKey: ["balance", "history", mode],
    queryFn: async () => {
      if (mode === 'local') {
        return [];
      }
      const userId = await getCurrentUserId();
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, earnings, earnings_recorded_at, shift_type, operation_type')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('earnings', 'is', null)
        .order('earnings_recorded_at', { ascending: false })
        .limit(50);
      
      if (shiftsError) throw new Error(shiftsError.message);
      
      const history: { 
        id: string;
        type: 'earning' | 'allocation';
        amount: number;
        date: string;
        description: string;
        goalName?: string;
      }[] = [];
      
      for (const shift of (shifts || [])) {
        const shiftTypeName = shift.shift_type === 'day' ? 'Дневная' : 'Ночная';
        const opTypeName = shift.operation_type === 'returns' ? 'возвраты' : 'приёмка';
        
        history.push({
          id: `shift-${shift.id}`,
          type: 'earning',
          amount: parseFloat(shift.earnings || '0'),
          date: shift.earnings_recorded_at || new Date().toISOString(),
          description: `${shiftTypeName} смена (${opTypeName})`,
        });
        
        const { data: allocations } = await supabase
          .from('goal_allocations')
          .select('id, amount, created_at, goal_id')
          .eq('shift_id', shift.id);
        
        for (const alloc of (allocations || [])) {
          const { data: goal } = await supabase
            .from('goals')
            .select('name')
            .eq('id', alloc.goal_id)
            .single();
          
          history.push({
            id: `alloc-${alloc.id}`,
            type: 'allocation',
            amount: -parseFloat(alloc.amount || '0'),
            date: alloc.created_at || new Date().toISOString(),
            description: 'Пополнение цели',
            goalName: goal?.name || 'Неизвестная цель',
          });
        }
      }
      
      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return history;
    },
  });
}

export function useRecordEarnings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      shiftId: string;
      totalEarnings: string;
      allocations: { goalId: string; amount: string }[];
    }) => {
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', data.shiftId)
        .single();
      
      if (shiftError || !shift) throw new Error('Shift not found');
      
      const { error: updateError } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          earnings: parseFloat(data.totalEarnings),
          earnings_recorded_at: new Date().toISOString(),
        })
        .eq('id', data.shiftId);
      
      if (updateError) throw new Error(updateError.message);
      
      let totalAllocated = 0;
      
      for (const allocation of data.allocations) {
        await supabase.from('goal_allocations').insert({
          shift_id: data.shiftId,
          goal_id: allocation.goalId,
          amount: parseFloat(allocation.amount),
        });
        
        const { data: goal } = await supabase
          .from('goals')
          .select('current_amount, target_amount')
          .eq('id', allocation.goalId)
          .single();
        
        if (goal) {
          const targetAmount = parseFloat(goal.target_amount || '0');
          const currentAmount = parseFloat(goal.current_amount || '0');
          const allocationAmount = parseFloat(allocation.amount);
          const newAmount = Math.min(currentAmount + allocationAmount, targetAmount);
          const updateData: Record<string, unknown> = { current_amount: newAmount };
          
          if (newAmount >= targetAmount) {
            updateData.status = 'completed';
            updateData.completed_at = new Date().toISOString();
          }
          
          await supabase
            .from('goals')
            .update(updateData)
            .eq('id', allocation.goalId);
        }
        
        totalAllocated += parseFloat(allocation.amount);
      }
      
      const remainder = parseFloat(data.totalEarnings) - totalAllocated;
      if (remainder > 0 && shift.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('balance')
          .eq('id', shift.user_id)
          .single();
        
        if (user) {
          await supabase
            .from('users')
            .update({ balance: parseFloat(user.balance || '0') + remainder })
            .eq('id', shift.user_id);
        }
      }
      
      const { data: updatedShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', data.shiftId)
        .single();
      
      return toClientShift(updatedShift as SupabaseShift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export type StatsPeriod = 'week' | 'month' | 'year';

function safeParseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? 0 : num;
}

function getDateRange(period: StatsPeriod): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  
  switch (period) {
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

export type ShiftTypeStats = {
  count: number;
  totalEarnings: number;
  averageEarnings: number;
};

export type GoalForecast = {
  goalId: string;
  goalName: string;
  currentAmount: number;
  targetAmount: number;
  remainingAmount: number;
  estimatedDays: number | null;
  estimatedDate: string | null;
  color: string;
};

export type CombinedShiftStats = {
  count: number;
  totalEarnings: number;
  averageEarnings: number;
};

export type EarningsStats = {
  totalEarnings: number;
  averagePerShift: number;
  completedShiftsCount: number;
  goalsProgressPercent: number;
  freeBalance: number;
  dailyEarningsHistory: { date: string; amount: number }[];
  goalDistribution: { goalId: string; goalName: string; amount: number; color: string }[];
  monthlyTrend: { month: string; amount: number }[];
  shiftsByType: { future: number; current: number; past: number };
  topShifts: { id: string; date: string; earnings: number; type: string }[];
  overdueGoals: { id: string; name: string; progress: number; daysOverdue: number }[];
  streak: number;
  previousPeriodAverage: number;
  daysToGoalForecast: number | null;
  dayShiftStats: ShiftTypeStats;
  nightShiftStats: ShiftTypeStats;
  returnsShiftStats: ShiftTypeStats;
  receivingShiftStats: ShiftTypeStats;
  dayReturnsStats: CombinedShiftStats;
  nightReturnsStats: CombinedShiftStats;
  dayReceivingStats: CombinedShiftStats;
  nightReceivingStats: CombinedShiftStats;
  recordShiftEarnings: number;
  recordShiftDate: string | null;
  recordShiftType: string | null;
  bestWeekEarnings: number;
  bestWeekDate: string | null;
  bestMonthEarnings: number;
  bestMonthDate: string | null;
  goalForecasts: GoalForecast[];
  dailyAverageEarnings: number;
};

export function useEarningsStats(period: StatsPeriod = 'month') {
  const { mode } = useDataMode();
  
  return useQuery<EarningsStats>({
    queryKey: ["earnings", "stats", period, mode],
    queryFn: async () => {
      if (mode === 'local') {
        const emptyStats: ShiftTypeStats = { count: 0, totalEarnings: 0, averageEarnings: 0 };
        const emptyCombinedStats: CombinedShiftStats = { count: 0, totalEarnings: 0, averageEarnings: 0 };
        return {
          totalEarnings: 0,
          averagePerShift: 0,
          completedShiftsCount: 0,
          goalsProgressPercent: 0,
          freeBalance: 0,
          dailyEarningsHistory: [],
          goalDistribution: [],
          monthlyTrend: [],
          shiftsByType: { future: 0, current: 0, past: 0 },
          topShifts: [],
          overdueGoals: [],
          streak: 0,
          previousPeriodAverage: 0,
          daysToGoalForecast: null,
          dayShiftStats: emptyStats,
          nightShiftStats: emptyStats,
          returnsShiftStats: emptyStats,
          receivingShiftStats: emptyStats,
          dayReturnsStats: emptyCombinedStats,
          nightReturnsStats: emptyCombinedStats,
          dayReceivingStats: emptyCombinedStats,
          nightReceivingStats: emptyCombinedStats,
          recordShiftEarnings: 0,
          recordShiftDate: null,
          recordShiftType: null,
          bestWeekEarnings: 0,
          bestWeekDate: null,
          bestMonthEarnings: 0,
          bestMonthDate: null,
          goalForecasts: [],
          dailyAverageEarnings: 0,
        };
      }
      
      const userId = await getCurrentUserId();
      const { start, end } = getDateRange(period);
      
      const { data: completedShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('earnings', 'is', null)
        .gte('earnings_recorded_at', start.toISOString())
        .lte('earnings_recorded_at', end.toISOString())
        .order('earnings_recorded_at', { ascending: true });
      
      if (shiftsError) throw new Error(shiftsError.message);
      
      const shifts = completedShifts || [];
      const totalEarnings = shifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0);
      const averagePerShift = shifts.length > 0 ? totalEarnings / shifts.length : 0;
      
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (goalsError) throw new Error(goalsError.message);
      
      const totalTarget = (goals || []).reduce((sum, g) => sum + safeParseNumber(g.target_amount), 0);
      const totalCurrent = (goals || []).reduce((sum, g) => sum + safeParseNumber(g.current_amount), 0);
      const goalsProgressPercent = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
      
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
      
      const freeBalance = safeParseNumber(user?.balance);
      
      const dailyEarningsMap = new Map<string, number>();
      for (const shift of shifts) {
        const date = new Date(shift.earnings_recorded_at!).toISOString().split('T')[0];
        dailyEarningsMap.set(date, (dailyEarningsMap.get(date) || 0) + safeParseNumber(shift.earnings));
      }
      const dailyEarningsHistory = Array.from(dailyEarningsMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const { data: allocations } = await supabase
        .from('goal_allocations')
        .select('goal_id, amount')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      const goalAllocMap = new Map<string, number>();
      for (const alloc of (allocations || [])) {
        goalAllocMap.set(alloc.goal_id, (goalAllocMap.get(alloc.goal_id) || 0) + safeParseNumber(alloc.amount));
      }
      
      const goalDistribution = (goals || []).map(g => ({
        goalId: g.id,
        goalName: g.name,
        amount: goalAllocMap.get(g.id) || 0,
        color: g.icon_color || '#3B82F6',
      })).filter(g => g.amount > 0);
      
      const monthlyMap = new Map<string, number>();
      for (const shift of shifts) {
        const date = new Date(shift.earnings_recorded_at!);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + safeParseNumber(shift.earnings));
      }
      const monthlyTrend = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
      
      const now = new Date();
      const { data: allShifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'canceled');
      
      const futureShifts = (allShifts || []).filter(s => 
        s.status === 'scheduled' && new Date(s.scheduled_start) > now
      ).length;
      const currentShifts = (allShifts || []).filter(s => s.status === 'in_progress').length;
      const pastShifts = (allShifts || []).filter(s => s.status === 'completed').length;
      
      const topShifts = [...shifts]
        .sort((a, b) => safeParseNumber(b.earnings) - safeParseNumber(a.earnings))
        .slice(0, 3)
        .map(s => ({
          id: s.id,
          date: s.scheduled_date,
          earnings: safeParseNumber(s.earnings),
          type: s.shift_type === 'day' ? 'Дневная' : 'Ночная',
        }));
      
      const overdueGoals = (goals || [])
        .filter(g => {
          const target = safeParseNumber(g.target_amount);
          if (target <= 0) return false;
          const progress = safeParseNumber(g.current_amount) / target;
          return progress < 0.5;
        })
        .map(g => {
          const target = safeParseNumber(g.target_amount) || 1;
          const current = safeParseNumber(g.current_amount);
          return {
            id: g.id,
            name: g.name,
            progress: Math.round((current / target) * 100),
            daysOverdue: 0,
          };
        });
      
      let streak = 0;
      if (shifts.length > 0) {
        const sortedShifts = [...shifts].sort((a, b) => 
          new Date(b.earnings_recorded_at!).getTime() - new Date(a.earnings_recorded_at!).getTime()
        );
        let lastDate: Date | null = null;
        for (const shift of sortedShifts) {
          const shiftDate = new Date(shift.earnings_recorded_at!);
          shiftDate.setHours(0, 0, 0, 0);
          if (!lastDate) {
            streak = 1;
            lastDate = shiftDate;
          } else {
            const diff = (lastDate.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diff <= 2) {
              streak++;
              lastDate = shiftDate;
            } else {
              break;
            }
          }
        }
      }
      
      const previousRange = getDateRange(period);
      const prevStart = new Date(previousRange.start);
      const prevEnd = new Date(previousRange.start);
      switch (period) {
        case 'week':
          prevStart.setDate(prevStart.getDate() - 7);
          break;
        case 'month':
          prevStart.setMonth(prevStart.getMonth() - 1);
          break;
        case 'year':
          prevStart.setFullYear(prevStart.getFullYear() - 1);
          break;
      }
      
      const { data: prevShifts } = await supabase
        .from('shifts')
        .select('earnings')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('earnings', 'is', null)
        .gte('earnings_recorded_at', prevStart.toISOString())
        .lt('earnings_recorded_at', prevEnd.toISOString());
      
      const prevTotal = (prevShifts || []).reduce((sum, s) => sum + parseFloat(s.earnings || '0'), 0);
      const previousPeriodAverage = (prevShifts || []).length > 0 ? prevTotal / (prevShifts || []).length : 0;
      
      const remainingGoalAmount = totalTarget - totalCurrent;
      const dailyAverage = dailyEarningsHistory.length > 0 
        ? totalEarnings / dailyEarningsHistory.length 
        : 0;
      const daysToGoalForecast = dailyAverage > 0 && remainingGoalAmount > 0
        ? Math.ceil(remainingGoalAmount / dailyAverage)
        : null;
      
      const dayShifts = shifts.filter(s => s.shift_type === 'day');
      const nightShifts = shifts.filter(s => s.shift_type === 'night');
      const returnsShifts = shifts.filter(s => s.operation_type === 'returns');
      const receivingShifts = shifts.filter(s => s.operation_type === 'receiving');
      
      const dayShiftStats = {
        count: dayShifts.length,
        totalEarnings: dayShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: dayShifts.length > 0 ? dayShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / dayShifts.length : 0,
      };
      
      const nightShiftStats = {
        count: nightShifts.length,
        totalEarnings: nightShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: nightShifts.length > 0 ? nightShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / nightShifts.length : 0,
      };
      
      const returnsShiftStats = {
        count: returnsShifts.length,
        totalEarnings: returnsShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: returnsShifts.length > 0 ? returnsShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / returnsShifts.length : 0,
      };
      
      const receivingShiftStats = {
        count: receivingShifts.length,
        totalEarnings: receivingShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: receivingShifts.length > 0 ? receivingShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / receivingShifts.length : 0,
      };
      
      const dayReturnsShifts = shifts.filter(s => s.shift_type === 'day' && s.operation_type === 'returns');
      const nightReturnsShifts = shifts.filter(s => s.shift_type === 'night' && s.operation_type === 'returns');
      const dayReceivingShifts = shifts.filter(s => s.shift_type === 'day' && s.operation_type === 'receiving');
      const nightReceivingShifts = shifts.filter(s => s.shift_type === 'night' && s.operation_type === 'receiving');
      
      const dayReturnsStats = {
        count: dayReturnsShifts.length,
        totalEarnings: dayReturnsShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: dayReturnsShifts.length > 0 ? dayReturnsShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / dayReturnsShifts.length : 0,
      };
      
      const nightReturnsStats = {
        count: nightReturnsShifts.length,
        totalEarnings: nightReturnsShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: nightReturnsShifts.length > 0 ? nightReturnsShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / nightReturnsShifts.length : 0,
      };
      
      const dayReceivingStats = {
        count: dayReceivingShifts.length,
        totalEarnings: dayReceivingShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: dayReceivingShifts.length > 0 ? dayReceivingShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / dayReceivingShifts.length : 0,
      };
      
      const nightReceivingStats = {
        count: nightReceivingShifts.length,
        totalEarnings: nightReceivingShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0),
        averageEarnings: nightReceivingShifts.length > 0 ? nightReceivingShifts.reduce((sum, s) => sum + safeParseNumber(s.earnings), 0) / nightReceivingShifts.length : 0,
      };
      
      const { data: allCompletedShifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('earnings', 'is', null)
        .order('earnings', { ascending: false });
      
      const recordShift = allCompletedShifts?.[0];
      const recordShiftEarnings = recordShift ? safeParseNumber(recordShift.earnings) : 0;
      const recordShiftDate = recordShift?.scheduled_date || null;
      const recordShiftType = recordShift ? (recordShift.shift_type === 'day' ? 'Дневная' : 'Ночная') : null;
      
      const weeklyEarningsMap = new Map<string, number>();
      for (const shift of (allCompletedShifts || [])) {
        const date = new Date(shift.earnings_recorded_at!);
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyEarningsMap.set(weekKey, (weeklyEarningsMap.get(weekKey) || 0) + safeParseNumber(shift.earnings));
      }
      
      let bestWeekEarnings = 0;
      let bestWeekDate: string | null = null;
      weeklyEarningsMap.forEach((earnings, weekDate) => {
        if (earnings > bestWeekEarnings) {
          bestWeekEarnings = earnings;
          bestWeekDate = weekDate;
        }
      });
      
      const allMonthlyMap = new Map<string, number>();
      for (const shift of (allCompletedShifts || [])) {
        const date = new Date(shift.earnings_recorded_at!);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        allMonthlyMap.set(monthKey, (allMonthlyMap.get(monthKey) || 0) + safeParseNumber(shift.earnings));
      }
      
      let bestMonthEarnings = 0;
      let bestMonthDate: string | null = null;
      allMonthlyMap.forEach((earnings, monthDate) => {
        if (earnings > bestMonthEarnings) {
          bestMonthEarnings = earnings;
          bestMonthDate = monthDate;
        }
      });
      
      const goalForecasts: GoalForecast[] = (goals || []).map(g => {
        const currentAmount = safeParseNumber(g.current_amount);
        const targetAmount = safeParseNumber(g.target_amount);
        const remainingAmount = Math.max(0, targetAmount - currentAmount);
        const estimatedDays = dailyAverage > 0 && remainingAmount > 0 
          ? Math.ceil(remainingAmount / dailyAverage)
          : null;
        const estimatedDate = estimatedDays !== null 
          ? new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000).toISOString()
          : null;
        
        return {
          goalId: g.id,
          goalName: g.name,
          currentAmount,
          targetAmount,
          remainingAmount,
          estimatedDays,
          estimatedDate,
          color: g.icon_color || '#3B82F6',
        };
      });
      
      return {
        totalEarnings,
        averagePerShift,
        completedShiftsCount: shifts.length,
        goalsProgressPercent,
        freeBalance,
        dailyEarningsHistory,
        goalDistribution,
        monthlyTrend,
        shiftsByType: { future: futureShifts, current: currentShifts, past: pastShifts },
        topShifts,
        overdueGoals,
        streak,
        previousPeriodAverage,
        daysToGoalForecast,
        dayShiftStats,
        nightShiftStats,
        returnsShiftStats,
        receivingShiftStats,
        dayReturnsStats,
        nightReturnsStats,
        dayReceivingStats,
        nightReceivingStats,
        recordShiftEarnings,
        recordShiftDate,
        recordShiftType,
        bestWeekEarnings,
        bestWeekDate,
        bestMonthEarnings,
        bestMonthDate,
        goalForecasts,
        dailyAverageEarnings: dailyAverage,
      };
    },
    refetchInterval: 5000,
  });
}

export function useGoalAllocations(goalId: string) {
  return useQuery({
    queryKey: ["goal", goalId, "allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_allocations')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
