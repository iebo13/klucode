import { type Cents, cents } from '@/lib/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface TodayTotals {
  collectedTodayCents: Cents;
  chargedTodayCents: Cents;
}

/**
 * Today's collected vs new debt, computed server-side in the café's time zone
 * (the today_totals RPC). Derived from events — nothing stored.
 */
export async function getTodayTotals(): Promise<TodayTotals> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('today_totals');
  if (error) throw error;
  const row = data.at(0);
  return {
    collectedTodayCents: cents(row?.collected_today_cents ?? 0),
    chargedTodayCents: cents(row?.charged_today_cents ?? 0),
  };
}
