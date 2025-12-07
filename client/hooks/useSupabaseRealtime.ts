import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, DEFAULT_USER_ID } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useSupabaseRealtime() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [queryClient]);
}
