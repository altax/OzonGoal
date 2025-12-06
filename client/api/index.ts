import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Goal, Shift, User } from "@shared/schema";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN 
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` 
  : "";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }
  
  return response.json();
}

export function useUser() {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: () => fetchApi("/user"),
  });
}

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => fetchApi("/goals"),
  });
}

export function useGoalsSummary() {
  return useQuery<{ count: number; totalTarget: number; totalCurrent: number }>({
    queryKey: ["goals", "summary"],
    queryFn: () => fetchApi("/goals/summary"),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      name: string;
      targetAmount: string;
      iconKey?: string;
      iconColor?: string;
      iconBgColor?: string;
    }) => fetchApi<Goal>("/goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Goal>) =>
      fetchApi<Goal>(`/goals/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useReorderGoals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (goalIds: string[]) =>
      fetchApi("/goals/reorder", {
        method: "POST",
        body: JSON.stringify({ goalIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useSetPrimaryGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (goalId: string) =>
      fetchApi(`/goals/${goalId}/primary`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: () => fetchApi("/shifts"),
  });
}

export function useShiftsSummary() {
  return useQuery<{ past: number; scheduled: number; current: Shift | null }>({
    queryKey: ["shifts", "summary"],
    queryFn: () => fetchApi("/shifts/summary"),
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      operationType: "returns" | "receiving";
      shiftType: "day" | "night";
      scheduledDate: string;
    }) => fetchApi<Shift>("/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<Shift>(`/shifts/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<Shift>(`/shifts/${id}/no-show`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useRecordEarnings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      shiftId: string;
      totalEarnings: string;
      allocations: { goalId: string; amount: string }[];
    }) => fetchApi<Shift>(`/shifts/${data.shiftId}/earnings`, {
      method: "POST",
      body: JSON.stringify({
        totalEarnings: data.totalEarnings,
        allocations: data.allocations,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
