import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { publicSupabaseEnv } from '@/lib/supabase/env';

/**
 * Refreshes the Supabase session on every request and redirects signed-out
 * users to /login (§13). A single middleware keeps the session cookie fresh so
 * Server Components can read it.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = publicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/login';

  if (!user && !isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }
  if (user && isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Run on everything except static assets and the export download.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/export|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
