import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { type Database } from '@/lib/supabase/database.types';

/**
 * Proves §3 against a live Supabase: the events table is append-only. DELETE is
 * rejected for everyone (it removes nothing); a non-void UPDATE is rejected;
 * voiding is allowed exactly once and never erases the row.
 *
 * Requires the migrations + seed (passwords: "password123"). Configure
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY (see README), or the suite skips itself.
 */
const hasEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

test.describe('events are append-only (§3)', () => {
  test('DELETE removes nothing, non-void UPDATE is rejected, void happens once', async () => {
    test.skip(!hasEnv, 'Supabase env not configured — see README.');

    const url = required('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');

    const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

    // Sign in as the seeded owner (the only role that may void at all).
    const owner = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
    const ownerSignIn = await owner.auth.signInWithPassword({
      email: 'owner@cafetab.test',
      password: 'password123',
    });
    expect(ownerSignIn.error).toBeNull();
    const ownerId = ownerSignIn.data.user?.id;
    expect(ownerId).toBeTruthy();

    // Sign in as the seeded employee (may read, may not void/delete).
    const employee = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
    const employeeSignIn = await employee.auth.signInWithPassword({
      email: 'employee@cafetab.test',
      password: 'password123',
    });
    expect(employeeSignIn.error).toBeNull();

    // Fixture: a fresh customer + charge created via the service role.
    const customerInsert = await admin
      .from('customers')
      .insert({ name: `__append_only_test_${Date.now()}`, created_by: ownerId as string })
      .select('id')
      .single();
    expect(customerInsert.error).toBeNull();
    const customerId = customerInsert.data?.id as string;

    const eventInsert = await admin
      .from('events')
      .insert({
        customer_id: customerId,
        type: 'charge',
        amount_cents: 4242,
        created_by: ownerId as string,
      })
      .select('id')
      .single();
    expect(eventInsert.error).toBeNull();
    const eventId = eventInsert.data?.id as string;

    try {
      // 1) Employee DELETE → removes nothing; the row survives.
      await employee.from('events').delete().eq('id', eventId);
      const afterEmployeeDelete = await admin
        .from('events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();
      expect(afterEmployeeDelete.data?.id).toBe(eventId);

      // 2) Owner DELETE → also removes nothing (no DELETE policy exists at all).
      await owner.from('events').delete().eq('id', eventId);
      const afterOwnerDelete = await admin
        .from('events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();
      expect(afterOwnerDelete.data?.id).toBe(eventId);

      // 3) Non-void UPDATE (rewrite the amount) → rejected.
      const rewrite = await owner
        .from('events')
        .update({ amount_cents: 1 })
        .eq('id', eventId)
        .select('id');
      expect(rewrite.error).not.toBeNull();
      const afterRewrite = await admin
        .from('events')
        .select('amount_cents')
        .eq('id', eventId)
        .single();
      expect(afterRewrite.data?.amount_cents).toBe(4242);

      // 4) Employee void → not permitted; row stays un-voided.
      await employee
        .from('events')
        .update({
          voided_by: employeeSignIn.data.user?.id ?? '',
          voided_at: new Date().toISOString(),
        })
        .eq('id', eventId);
      const afterEmployeeVoid = await admin
        .from('events')
        .select('voided_at')
        .eq('id', eventId)
        .single();
      expect(afterEmployeeVoid.data?.voided_at).toBeNull();

      // 5) Owner void → allowed exactly once; the row remains, now struck through.
      const firstVoid = await owner
        .from('events')
        .update({ voided_by: ownerId as string, voided_at: new Date().toISOString() })
        .eq('id', eventId)
        .is('voided_at', null)
        .select('id');
      expect(firstVoid.error).toBeNull();
      expect(firstVoid.data?.length).toBe(1);

      // 6) Re-voiding a voided row → rejected by the trigger.
      const secondVoid = await owner
        .from('events')
        .update({ voided_by: ownerId as string, voided_at: new Date().toISOString() })
        .eq('id', eventId)
        .select('id');
      expect(secondVoid.error).not.toBeNull();
    } finally {
      // Clean up fixtures with the service role (bypasses RLS).
      await admin.from('events').delete().eq('id', eventId);
      await admin.from('customers').delete().eq('id', customerId);
    }
  });
});
