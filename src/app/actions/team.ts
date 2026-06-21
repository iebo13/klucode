'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getActingStaff } from '@/lib/data/staff';
import { type FormState, fieldErrorsFrom } from '@/lib/forms';
import { can } from '@/lib/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const changeRoleSchema = z.object({
  staffId: z.string().uuid(),
  role: z.enum(['owner', 'manager', 'employee']),
});

const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  name: z.string().trim().min(1, 'A name is required').max(80),
});

export async function changeRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = changeRoleSchema.safeParse({
    staffId: formData.get('staffId'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Invalid request.' };
  }

  const supabase = await createSupabaseServerClient();
  const staff = await getActingStaff(supabase);
  if (!staff) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' };
  }
  if (!can.manageTeam(staff.role)) {
    return { status: 'error', message: 'Only the owner can manage the team.' };
  }

  // Integrity guard the DB can't easily express: never demote the last owner.
  if (parsed.data.role !== 'owner') {
    const { data: target } = await supabase
      .from('staff')
      .select('role')
      .eq('id', parsed.data.staffId)
      .maybeSingle();
    if (target?.role === 'owner') {
      const { count } = await supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner');
      if ((count ?? 0) <= 1) {
        return { status: 'error', message: 'There must always be at least one owner.' };
      }
    }
  }

  const { data, error } = await supabase
    .from('staff')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.staffId)
    .select('id');
  if (error) {
    return { status: 'error', message: 'Could not change the role — nothing was saved.' };
  }
  if (data.length === 0) {
    return { status: 'error', message: 'That change was not permitted.' };
  }

  revalidatePath('/team');
  return { status: 'success', message: 'Role updated.' };
}

export async function inviteColleague(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
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
  if (!can.manageTeam(staff.role)) {
    return { status: 'error', message: 'Only the owner can invite colleagues.' };
  }

  // Inviting needs the service role. Degrade honestly when it isn't configured:
  // a colleague can simply sign up and be promoted from here.
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      status: 'error',
      message:
        'Email invites need the service-role key. Until it is set, ask your colleague to sign up on the login page — they will appear here as an employee for you to promote.',
    };
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { name: parsed.data.name },
  });
  if (error) {
    return { status: 'error', message: error.message };
  }

  revalidatePath('/team');
  return { status: 'success', message: `Invitation sent to ${parsed.data.email}.` };
}
