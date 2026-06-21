import { cache } from 'react';

import { type CafeSettings } from '@/domain/settings';
import { cents } from '@/lib/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** The single café-settings row. Always present (seeded by the migration). */
export const getCafeSettings = cache(async (): Promise<CafeSettings> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cafe_settings')
    .select('cafe_name, currency, time_zone, alert_enabled, alert_threshold_cents')
    .limit(1)
    .single();
  if (error) throw error;
  return {
    cafeName: data.cafe_name,
    currency: data.currency,
    timeZone: data.time_zone,
    alertEnabled: data.alert_enabled,
    alertThresholdCents: cents(data.alert_threshold_cents),
  };
});
