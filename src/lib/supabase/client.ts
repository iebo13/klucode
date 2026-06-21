import { createBrowserClient } from '@supabase/ssr';

import { type Database } from './database.types';
import { publicSupabaseEnv } from './env';

/**
 * Browser Supabase client. Used by sign-in and by the small Realtime client
 * components (§13). Carries only the anon key; RLS does the gating.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
