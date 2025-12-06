import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DEFAULT_USER_ID, toClientGoal, toClientShift, toClientUser, type Goal as SupabaseGoal, type Shift as SupabaseShift, type User as SupabaseUser } from "../lib/supabase";

type Goal = ReturnType<typeof toClientGoal>;
type Shift = ReturnType<typeof toClientShift>;
type User = ReturnType<typeof toClientUser>;

async function ensureDefaultUser() {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', DEFAULT_USER_ID)
    .single();

  if (!existingUser) {
    await supabase.from('users').insert({
      id: DEFAULT_USER_ID,
      username: 'default',
      password: 'default',
      balance: 0,
    });
  }
}

export function useUser() {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      await ensureDefaultUser();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', DEFAULT_USER_ID)
        .single();
      
      if (error) throw new Error(error.message);
      return toClientUser(data as SupabaseUser);
    },
  });
}

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', DEFAULT_USER_ID)
        .order('is_primary', { ascending: false })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return (data as SupabaseGoal[]).map(toClientGoal);
    },
  });
}

export function useGoalsSummary() {
  return useQuery<{ count: number; totalTarget: number; totalCurrent: number }>({
    queryKey: ["goals", "summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('target_amount, current_amount')
        .eq('user_id', DEFAULT_USER_ID)
        .eq('status', 'active');
      
      if (error) throw new Error(error.message);
      
      const goals = data || [];
      return {
        count: goals.length,
        totalTarget: goals.reduce((sum, g) => sum + parseFloat(g.target_amount || '0'), 0),
        totalCurrent: goals.reduce((sum, g) => sum + parseFloat(g.current_amount || '0'), 0),
      };
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      targetAmount: string;
      iconKey?: string;
      iconColor?: string;
      iconBgColor?: string;
    }) => {
      const { data: maxOrderData } = await supabase
        .from('goals')
        .select('order_index')
        .eq('user_id', DEFAULT_USER_ID)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const maxOrder = maxOrderData?.[0]?.order_index || 0;
      
      const { data: newGoal, error } = await supabase
        .from('goals')
        .insert({
          user_id: DEFAULT_USER_ID,
          name: data.name,
          target_amount: parseFloat(data.targetAmount),
          icon_key: data.iconKey || 'target',
          icon_color: data.iconColor || '#3B82F6',
          icon_bg_color: data.iconBgColor || '#E0E7FF',
          order_index: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientGoal(newGoal as SupabaseGoal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      name: string;
      targetAmount: string;
      currentAmount: string;
      iconKey: string;
      iconColor: string;
      iconBgColor: string;
      status: 'active' | 'completed';
      isPrimary: boolean;
      orderIndex: number;
    }>) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.targetAmount !== undefined) updateData.target_amount = parseFloat(data.targetAmount);
      if (data.currentAmount !== undefined) updateData.current_amount = parseFloat(data.currentAmount);
      if (data.iconKey !== undefined) updateData.icon_key = data.iconKey;
      if (data.iconColor !== undefined) updateData.icon_color = data.iconColor;
      if (data.iconBgColor !== undefined) updateData.icon_bg_color = data.iconBgColor;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (data.isPrimary !== undefined) updateData.is_primary = data.isPrimary;
      if (data.orderIndex !== undefined) updateData.order_index = data.orderIndex;
      
      const { data: updatedGoal, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientGoal(updatedGoal as SupabaseGoal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useReorderGoals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalIds: string[]) => {
      for (let i = 0; i < goalIds.length; i++) {
        await supabase
          .from('goals')
          .update({ order_index: i })
          .eq('id', goalIds[i])
          .eq('user_id', DEFAULT_USER_ID);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useSetPrimaryGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      await supabase
        .from('goals')
        .update({ is_primary: false })
        .eq('user_id', DEFAULT_USER_ID);
      
      await supabase
        .from('goals')
        .update({ is_primary: true })
        .eq('id', goalId)
        .eq('user_id', DEFAULT_USER_ID);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', DEFAULT_USER_ID)
        .order('scheduled_start', { ascending: false });
      
      if (error) throw new Error(error.message);
      return (data as SupabaseShift[]).map(toClientShift);
    },
  });
}

export function useShiftsSummary() {
  return useQuery<{ past: number; scheduled: number; current: Shift | null }>({
    queryKey: ["shifts", "summary"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data: pastData } = await supabase
        .from('shifts')
        .select('id', { count: 'exact' })
        .eq('user_id', DEFAULT_USER_ID)
        .eq('status', 'completed');
      
      const { data: scheduledData } = await supabase
        .from('shifts')
        .select('id', { count: 'exact' })
        .eq('user_id', DEFAULT_USER_ID)
        .eq('status', 'scheduled')
        .gte('scheduled_start', now);
      
      const { data: currentData } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', DEFAULT_USER_ID)
        .eq('status', 'in_progress')
        .limit(1);
      
      return {
        past: pastData?.length || 0,
        scheduled: scheduledData?.length || 0,
        current: currentData?.[0] ? toClientShift(currentData[0] as SupabaseShift) : null,
      };
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      operationType: "returns" | "receiving";
      shiftType: "day" | "night";
      scheduledDate: string;
    }) => {
      const date = new Date(data.scheduledDate);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: existingShifts, error: conflictError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', DEFAULT_USER_ID)
        .eq('shift_type', data.shiftType)
        .neq('status', 'canceled')
        .gte('scheduled_date', `${dateStr}T00:00:00`)
        .lt('scheduled_date', `${dateStr}T23:59:59`);
      
      if (conflictError) throw new Error(conflictError.message);
      if (existingShifts && existingShifts.length > 0) {
        throw new Error("Смена на этот день и время уже существует");
      }
      
      let scheduledStart: Date;
      let scheduledEnd: Date;
      
      if (data.shiftType === "day") {
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
      const status = scheduledStart <= now && now < scheduledEnd ? "in_progress" : "scheduled";
      
      const { data: newShift, error } = await supabase
        .from('shifts')
        .insert({
          user_id: DEFAULT_USER_ID,
          operation_type: data.operationType,
          shift_type: data.shiftType,
          scheduled_date: date.toISOString(),
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          status,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientShift(newShift as SupabaseShift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('shifts')
        .update({ status: 'canceled' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientShift(data as SupabaseShift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, scheduledDate }: { id: string; scheduledDate: string }) => {
      const date = new Date(scheduledDate);
      
      const { data: shift } = await supabase
        .from('shifts')
        .select('shift_type')
        .eq('id', id)
        .single();
      
      if (!shift) throw new Error('Shift not found');
      
      let scheduledStart: Date;
      let scheduledEnd: Date;
      
      if (shift.shift_type === "day") {
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
      
      const { data, error } = await supabase
        .from('shifts')
        .update({
          scheduled_date: date.toISOString(),
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientShift(data as SupabaseShift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('shifts')
        .update({ status: 'no_show' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return toClientShift(data as SupabaseShift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useBalanceHistory() {
  return useQuery<{ 
    id: string;
    type: 'earning' | 'allocation';
    amount: number;
    date: string;
    description: string;
    goalName?: string;
  }[]>({
    queryKey: ["balance", "history"],
    queryFn: async () => {
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, earnings, earnings_recorded_at, shift_type, operation_type')
        .eq('user_id', DEFAULT_USER_ID)
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
