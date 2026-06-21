'use server';

import { revalidatePath } from 'next/cache';

import { voidEventSchema } from '@/domain/events';
import { getActingStaff } from '@/lib/data/staff';
import { type FormState } from '@/lib/forms';
import { can } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Void (not delete) an event — the only correction §3 permits. The row stays,
 * struck through, attributed to the voider. Owner-only here AND in RLS + the
 * append-only trigger, so the courtesy guard and the real lock agree.
 */
export async function voidEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = voidEventSchema.safeParse({ eventId: formData.get('eventId') });
  if (!parsed.success) {
    return { status: 'error', message: 'Invalid request.' };
  }

  const supabase = await createSupabaseServerClient();
  const staff = await getActingStaff(supabase);
  if (!staff) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' };
  }
  if (!can.voidRecord(staff.role)) {
    return { status: 'error', message: 'Only the owner can void a record.' };
  }

  const { data, error } = await supabase
    .from('events')
    .update({ voided_by: staff.id, voided_at: new Date().toISOString() })
    .eq('id', parsed.data.eventId)
    .is('voided_at', null)
    .select('customer_id');

  if (error) {
    return { status: 'error', message: 'Could not void this entry — nothing changed.' };
  }
  const customerId = data.at(0)?.customer_id;
  if (!customerId) {
    return { status: 'error', message: 'This entry was already voided.' };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  return { status: 'success', message: 'Entry voided. It stays on the record, struck through.' };
}
