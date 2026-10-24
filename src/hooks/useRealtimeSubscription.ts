import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useRealtimeSubscription(
  table: string,
  queryKey: unknown[],
  filter?: string,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();
  const keySig = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `${table}-${filter ?? 'all'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        (payload) => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled, keySig]);
}
