'use server';

import { revalidatePath } from 'next/cache';

import { updateSettingsSchema } from '@/domain/settings';
import { getActingStaff } from '@/lib/data/staff';
import { type FormState, fieldErrorsFrom } from '@/lib/forms';
import { can } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const euros = Number(formData.get('alertThresholdEuros'));
  const parsed = updateSettingsSchema.safeParse({
    cafeName: formData.get('cafeName'),
    timeZone: formData.get('timeZone'),
    alertEnabled: formData.get('alertEnabled') === 'on',
    alertThresholdCents: Number.isFinite(euros) ? Math.round(euros * 100) : Number.NaN,
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the settings.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const staff = await getActingStaff(supabase);
  if (!staff) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' };
  }
  if (!can.manageTeam(staff.role)) {
    return { status: 'error', message: 'Only the owner can change settings.' };
  }

  const { data, error } = await supabase
    .from('cafe_settings')
    .update({
      cafe_name: parsed.data.cafeName,
      time_zone: parsed.data.timeZone,
      alert_enabled: parsed.data.alertEnabled,
      alert_threshold_cents: parsed.data.alertThresholdCents,
    })
    .eq('id', true)
    .select('id');
  if (error) {
    return { status: 'error', message: 'Could not save settings — nothing changed.' };
  }
  if (data.length === 0) {
    return { status: 'error', message: 'That change was not permitted.' };
  }

  revalidatePath('/settings');
  revalidatePath('/', 'layout'); // the nav shows the café name
  return { status: 'success', message: 'Settings saved.' };
}
