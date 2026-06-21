import { type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** A dashboard tile. `hero` makes the figure the visual hero of the screen. */
export function StatCard({
  label,
  children,
  hint,
  tone = 'neutral',
  hero = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'debt' | 'settled';
  hero?: boolean;
}) {
  const figureTone =
    tone === 'debt' ? 'text-debt' : tone === 'settled' ? 'text-settled' : 'text-ink';

  return (
    <div className={cn('card p-5', hero && 'sm:col-span-2')}>
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 font-semibold tabular-nums',
          hero ? 'text-4xl sm:text-5xl' : 'text-2xl',
          figureTone,
        )}
      >
        {children}
      </p>
      {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}
