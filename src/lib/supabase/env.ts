// Public Supabase config. These are NEXT_PUBLIC_ and safe in the browser — all
// access is gated by RLS (§7). Fail fast and clearly if they are missing.
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill them in.',
    );
  }
  return { url, anonKey };
}
