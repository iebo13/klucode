import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { type Database } from './database.types';
import { publicSupabaseEnv } from './env';

/** The shape returned by createSupabaseServerClient — reused across the data layer. */
export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Server Supabase client bound to the request's cookies. Used by Server
 * Components (reads) and Server Actions (writes). Anon key only — the session
 * cookie identifies the user and RLS enforces their role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies are read-only.
          // middleware.ts refreshes the session cookie, so this is safe to skip.
        }
      },
    },
  });
}
