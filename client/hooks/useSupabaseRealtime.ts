import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, DEFAULT_USER_ID } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useSupabaseRealtime() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [shouldConnect, setShouldConnect] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldConnect(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldConnect) return;

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${DEFAULT_USER_ID}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          queryClient.invalidateQueries({ queryKey: ['earnings', 'stats'] });
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
          filter: `user_id=eq.${DEFAULT_USER_ID}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shifts'] });
          queryClient.invalidateQueries({ queryKey: ['earnings', 'stats'] });
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goal_allocations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          queryClient.invalidateQueries({ queryKey: ['earnings', 'stats'] });
          queryClient.invalidateQueries({ queryKey: ['balance', 'history'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${DEFAULT_USER_ID}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to Supabase Realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error - check Supabase Realtime configuration');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Connection timed out');
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [queryClient, shouldConnect]);
}
