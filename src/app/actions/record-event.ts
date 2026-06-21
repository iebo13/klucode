'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { recordChargeSchema, recordPaymentSchema } from '@/domain/events';
import { getActingStaff } from '@/lib/data/staff';
import { type FormState, fieldErrorsFrom } from '@/lib/forms';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// After a write, refresh the surfaces that show balances/history. The acting
// user lands on the customer page (re-rendered fresh); other open clients are
// nudged by Realtime.
function revalidateMoneyViews(customerId: string): void {
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/customers');
  revalidatePath('/dashboard');
}

export async function recordCharge(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = recordChargeSchema.safeParse({
    customerId: formData.get('customerId'),
    amountCents: formData.get('amountCents'),
    label: formData.get('label') ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the amount.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const staff = await getActingStaff(supabase);
  if (!staff) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' };
  }

  const { error } = await supabase.from('events').insert({
    customer_id: parsed.data.customerId,
    type: 'charge',
    amount_cents: parsed.data.amountCents,
    label: parsed.data.label,
    method: null,
    created_by: staff.id,
  });
  if (error) {
    return { status: 'error', message: 'Could not record the charge — nothing was saved.' };
  }

  revalidateMoneyViews(parsed.data.customerId);
  redirect(`/customers/${parsed.data.customerId}`);
}

export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = recordPaymentSchema.safeParse({
    customerId: formData.get('customerId'),
    amountCents: formData.get('amountCents'),
    method: formData.get('method'),
    label: formData.get('label') ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the payment.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const staff = await getActingStaff(supabase);
  if (!staff) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' };
  }

  // A payment is its own event — it never edits the original debt (§3).
  const { error } = await supabase.from('events').insert({
    customer_id: parsed.data.customerId,
    type: 'payment',
    amount_cents: parsed.data.amountCents,
    label: parsed.data.label,
    method: parsed.data.method,
    created_by: staff.id,
  });
  if (error) {
    return { status: 'error', message: 'Could not record the payment — nothing was saved.' };
  }

  revalidateMoneyViews(parsed.data.customerId);
  redirect(`/customers/${parsed.data.customerId}`);
}
