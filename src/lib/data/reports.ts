import { type ExportRow, type ReportDay } from '@/domain/reports';
import { cents } from '@/lib/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Charged vs collected per day over the last `days` days. Goes through the
 * report_range RPC, which raises for employees — the lock is in the data layer,
 * not just the route (§7).
 */
export async function getReportRange(days: number): Promise<ReportDay[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('report_range', { days });
  if (error) throw error;
  return data.map((row) => ({
    day: row.day,
    chargedCents: cents(row.charged_cents),
    collectedCents: cents(row.collected_cents),
  }));
}

/**
 * The full event history as flat rows for CSV export. Backed by the
 * export_events RPC, which raises for anyone who is not the owner.
 */
export async function getExportRows(): Promise<ExportRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('export_events');
  if (error) throw error;
  return data.map((row) => ({
    eventId: row.event_id,
    customerName: row.customer_name,
    type: row.type,
    amountCents: cents(row.amount_cents),
    label: row.label,
    method: row.method,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
  }));
}
