import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { type Database } from './database.types';

/**
 * Service-role client. Bypasses RLS, so it is `server-only` — importing it into
 * any client bundle is a build error. Used solely for the two privileged paths
 * that need it: inviting a colleague (Team) and the append-only e2e fixtures.
 * Returns null when the key isn't configured, so callers degrade gracefully.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
