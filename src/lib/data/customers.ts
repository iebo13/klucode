import { type Customer, type CustomerWithBalance } from '@/domain/customers';
import { cents } from '@/lib/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const CUSTOMER_COLUMNS = 'id, name, phone, created_by, created_at';

/**
 * Every customer with their derived current balance (§3), sorted by name. The
 * balance comes from the customer_balances view — a SUM over events, never a
 * stored column. The café's roster is small, so filtering/searching happens in
 * the UI on this one list (KISS) rather than per-keystroke round-trips.
 */
export async function listCustomersWithBalances(): Promise<CustomerWithBalance[]> {
  const supabase = await createSupabaseServerClient();

  const [customersResult, balancesResult] = await Promise.all([
    supabase.from('customers').select(CUSTOMER_COLUMNS).order('name', { ascending: true }),
    supabase.from('customer_balances').select('customer_id, balance_cents'),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (balancesResult.error) throw balancesResult.error;

  const balanceByCustomer = new Map(
    balancesResult.data.map((row) => [row.customer_id, row.balance_cents ?? 0]),
  );

  return customersResult.data.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    createdBy: c.created_by,
    createdAt: c.created_at,
    balanceCents: cents(balanceByCustomer.get(c.id) ?? 0),
  }));
}

/** A single customer (the detail page derives the balance from their events). */
export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}
