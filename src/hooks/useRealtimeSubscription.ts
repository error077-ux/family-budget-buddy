import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'transactions' | 'loans' | 'banks' | 'bank_ledger' | 'credit_cards' | 'persons' | 'notifications';

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  onUpdate: () => void;
}

export function useRealtimeSubscription({ tables, onUpdate }: UseRealtimeSubscriptionOptions) {
  useEffect(() => {
    const channels = tables.map((table) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          (payload) => {
            console.log(`Realtime update on ${table}:`, payload);
            onUpdate();
          }
        )
        .subscribe();
      
      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, onUpdate]);
}
