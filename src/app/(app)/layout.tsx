import { type ReactNode } from 'react';

import { signOut } from '@/app/actions/auth';
import { AppNav } from '@/components/nav';
import { getCafeSettings } from '@/lib/data/settings';
import { getSessionStaff } from '@/lib/data/staff';

/**
 * Auth guard + nav shell for the whole app. Signed-out users never reach here
 * (middleware redirects). A valid session with no staff profile shouldn't be
 * possible (handle_new_user provisions one), but if it ever happens we show a
 * recovery screen rather than bouncing against /login forever.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const staff = await getSessionStaff();
  if (!staff) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="card max-w-sm p-6">
          <h1 className="text-lg font-semibold text-ink">Account not set up</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your sign-in has no staff profile yet. Sign out and ask the owner to add you.
          </p>
          <form action={signOut} className="mt-4">
            <button type="submit" className="btn-secondary w-full">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  const settings = await getCafeSettings();

  return (
    <div className="min-h-screen">
      <AppNav staff={{ name: staff.name, role: staff.role }} cafeName={settings.cafeName} />
      <div className="md:pl-60">
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 md:pb-12 md:pt-10">{children}</main>
      </div>
    </div>
  );
}
