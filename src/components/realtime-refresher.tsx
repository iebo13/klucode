'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Subscribes to a table via Supabase Realtime and re-runs the server render on
 * any change, so balances and timelines re-derive with no manual refresh — "everyone
 * sees the same thing, now" (§9). A small debounce coalesces bursts of events.
 */
export function RealtimeRefresher({
  table,
  filter,
}: {
  table: 'events' | 'customers';
  filter?: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 150);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [table, filter, router]);

  return null;
}
