import { type Cents, formatCents } from '@/lib/money';
import { cn } from '@/lib/cn';

/** Money, always rendered with tabular figures so columns line up (§9). */
export function Amount({ cents, className }: { cents: Cents; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatCents(cents)}</span>;
}
