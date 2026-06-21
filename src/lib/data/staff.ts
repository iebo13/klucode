import { cache } from 'react';

import { type Staff } from '@/domain/staff';
import { createSupabaseServerClient, type SupabaseServerClient } from '@/lib/supabase/server';

const STAFF_COLUMNS = 'id, name, role, created_at';

async function readStaffRow(supabase: SupabaseServerClient, id: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select(STAFF_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, name: data.name, role: data.role, createdAt: data.created_at };
}

/**
 * The signed-in staff member (identity → role → capabilities), or null when
 * not signed in. Cached per request so the layout and pages share one lookup.
 */
export const getSessionStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return readStaffRow(supabase, user.id);
});

/** For Server Actions that already hold a client: the acting staff member. */
export async function getActingStaff(supabase: SupabaseServerClient): Promise<Staff | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return readStaffRow(supabase, user.id);
}

/** The whole team, oldest member first (Team screen). */
export async function listStaff(): Promise<Staff[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff')
    .select(STAFF_COLUMNS)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((s) => ({ id: s.id, name: s.name, role: s.role, createdAt: s.created_at }));
}
