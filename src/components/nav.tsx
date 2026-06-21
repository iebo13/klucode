'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOut } from '@/app/actions/auth';
import { type Role, can, roleLabel } from '@/lib/permissions';
import { cn } from '@/lib/cn';

interface NavLink {
  href: string;
  label: string;
  visible: (role: Role) => boolean;
}

// Links are gated by the same capability map as the data layer (§8). Hiding a
// link is a courtesy; RLS is the lock.
const LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Home', visible: () => true },
  { href: '/customers', label: 'Customers', visible: () => true },
  { href: '/reports', label: 'Reports', visible: can.seeReports },
  { href: '/team', label: 'Team', visible: can.manageTeam },
  { href: '/settings', label: 'Settings', visible: () => true },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ cafeName, compact = false }: { cafeName: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-bold text-white">
        ₵
      </span>
      <span
        className={cn('font-semibold tracking-tight text-ink', compact ? 'text-base' : 'text-lg')}
      >
        {cafeName}
      </span>
    </div>
  );
}

function SignOut() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm font-medium text-ink-muted hover:text-ink">
        Sign out
      </button>
    </form>
  );
}

export function AppNav({
  staff,
  cafeName,
}: {
  staff: { name: string; role: Role };
  cafeName: string;
}) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => link.visible(staff.role));

  return (
    <>
      {/* Desktop: left sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-line md:bg-white md:px-4 md:py-5">
        <Brand cafeName={cafeName} />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(pathname, link.href)
                  ? 'bg-ink text-white'
                  : 'text-ink-muted hover:bg-line/50 hover:text-ink',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-4">
          <p className="truncate text-sm font-medium text-ink">{staff.name}</p>
          <p className="mb-2 text-xs text-ink-faint">{roleLabel(staff.role)}</p>
          <SignOut />
        </div>
      </aside>

      {/* Mobile: top bar */}
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-white px-4 md:hidden">
        <Brand cafeName={cafeName} compact />
        <SignOut />
      </header>

      {/* Mobile: bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-line bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex min-h-[56px] flex-col items-center justify-center px-1 py-2 text-xs',
              isActive(pathname, link.href) ? 'font-semibold text-ink' : 'text-ink-muted',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
