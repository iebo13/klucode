import { type AppEvent, type EventType, type PaymentMethod } from '@/domain/events';
import { cents } from '@/lib/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// One round-trip per timeline: the event rows plus the names of who recorded
// and who voided them, via the named foreign keys (PostgREST embeds).
const EVENT_SELECT =
  'id, customer_id, type, amount_cents, label, method, created_by, created_at, voided_by, voided_at, ' +
  'recorded_by:staff!events_created_by_fkey(name), ' +
  'voided_staff:staff!events_voided_by_fkey(name)';

interface EventRow {
  id: string;
  customer_id: string;
  type: EventType;
  amount_cents: number;
  label: string | null;
  method: string | null;
  created_by: string;
  created_at: string;
  voided_by: string | null;
  voided_at: string | null;
  recorded_by: { name: string } | null;
  voided_staff: { name: string } | null;
}

// `method` is free text in the DB but constrained to these values for payments.
// Narrow it without a cast so the domain type stays honest.
function toPaymentMethod(value: string | null): PaymentMethod | null {
  return value === 'cash' || value === 'card' || value === 'transfer' ? value : null;
}

function toAppEvent(row: EventRow): AppEvent {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    amountCents: cents(row.amount_cents),
    label: row.label,
    method: toPaymentMethod(row.method),
    createdBy: row.created_by,
    recordedByName: row.recorded_by?.name ?? 'Unknown',
    createdAt: row.created_at,
    voidedBy: row.voided_by,
    voidedByName: row.voided_staff?.name ?? null,
    voidedAt: row.voided_at,
  };
}

/** A customer's full history, oldest first (so a running balance can build up). */
export async function listEventsForCustomer(customerId: string): Promise<AppEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })
    .returns<EventRow[]>();
  if (error) throw error;
  return data.map(toAppEvent);
}
