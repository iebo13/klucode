'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { addCustomerSchema } from '@/domain/customers';
import { getActingStaff } from '@/lib/data/staff';
import { type FormState, fieldErrorsFrom } from '@/lib/forms';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function addCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = addCustomerSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the details.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const staff = await getActingStaff(supabase);
  if (!staff) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' };
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ name: parsed.data.name, phone: parsed.data.phone, created_by: staff.id })
    .select('id')
    .single();
  if (error || !data) {
    return { status: 'error', message: 'Could not add the customer — nothing was saved.' };
  }

  revalidatePath('/customers');
  revalidatePath('/dashboard');
  redirect(`/customers/${data.id}`);
}
