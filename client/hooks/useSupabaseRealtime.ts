import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'goals' | 'shifts' | 'goal_allocations' | 'users';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE';

interface RealtimeConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  debounceMs: number;
}

const DEFAULT_CONFIG: RealtimeConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  debounceMs: 100,
};

const TABLE_QUERY_MAP: Record<TableName, string[]> = {
  goals: ['goals', 'earnings', 'user'],
  shifts: ['shifts', 'earnings', 'user'],
  goal_allocations: ['goals', 'earnings', 'balance'],
  users: ['user'],
};

export function useSupabaseRealtime(config: Partial<RealtimeConfig> = {}) {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const { user } = useAuth();
  const userId = user?.id;
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceMapRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isReadyRef = useRef(false);

  const { maxRetries, baseDelay, maxDelay, debounceMs } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const calculateBackoff = useCallback((attempt: number): number => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }, [baseDelay, maxDelay]);

  const invalidateWithDebounce = useCallback((queryKeys: string[]) => {
    queryKeys.forEach((key) => {
      const existingTimeout = debounceMapRef.current.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [key] });
        debounceMapRef.current.delete(key);
      }, debounceMs);

      debounceMapRef.current.set(key, timeout);
    });
  }, [queryClient, debounceMs]);

  const handleChange = useCallback(
    (table: TableName, event: EventType, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const queryKeys = TABLE_QUERY_MAP[table];
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Realtime] ${event} on ${table}`, payload);
      }

      invalidateWithDebounce(queryKeys);
    },
    [invalidateWithDebounce]
  );

  const setupChannel = useCallback(() => {
    if (!userId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Realtime] No user ID, skipping channel setup');
      }
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('db-changes', {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleChange('goals', 'INSERT', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleChange('goals', 'UPDATE', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleChange('goals', 'DELETE', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shifts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleChange('shifts', 'INSERT', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shifts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleChange('shifts', 'UPDATE', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'shifts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handleChange('shifts', 'DELETE', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goal_allocations',
        },
        (payload) => handleChange('goal_allocations', 'INSERT', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'goal_allocations',
        },
        (payload) => handleChange('goal_allocations', 'UPDATE', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'goal_allocations',
        },
        (payload) => handleChange('goal_allocations', 'DELETE', payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => handleChange('users', 'UPDATE', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] Connected successfully');
          }
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] Connection issue, will retry:', status);
          }
          scheduleReconnect();
        } else if (status === 'CLOSED') {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] Channel closed');
          }
          scheduleReconnect();
        }
      });

    channelRef.current = channel;
  }, [handleChange, userId]);

  const scheduleReconnect = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Realtime] Max retries reached, will use regular API calls');
      }
      return;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const delay = calculateBackoff(retryCountRef.current);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Realtime] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
    }

    retryTimeoutRef.current = setTimeout(() => {
      retryCountRef.current++;
      setupChannel();
    }, delay);
  }, [calculateBackoff, maxRetries, setupChannel]);

  useEffect(() => {
    if (isFetching === 0 && !isReadyRef.current && userId) {
      isReadyRef.current = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('[Realtime] Initial queries loaded, connecting...');
      }
      setupChannel();
    }
  }, [isFetching, setupChannel, userId]);

  useEffect(() => {
    if (userId && isReadyRef.current) {
      setupChannel();
    }
  }, [userId, setupChannel]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      debounceMapRef.current.forEach((timeout) => clearTimeout(timeout));
      debounceMapRef.current.clear();
    };
  }, []);
}
