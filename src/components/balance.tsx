import { balanceStatus } from '@/domain/balances';
import { type Cents, formatCents, formatCentsAbs } from '@/lib/money';
import { cn } from '@/lib/cn';

// Outstanding balances are the visual hero (§9): debt is red, settled is calm,
// credit (we owe them) is green. Color carries meaning, never decoration.
function colorFor(balanceCents: Cents): string {
  const status = balanceStatus(balanceCents);
  if (status === 'owing') return 'text-debt';
  if (status === 'credit') return 'text-settled';
  return 'text-ink-faint';
}

/** The balance as a number, colored by what it means. */
export function Balance({ balanceCents, className }: { balanceCents: Cents; className?: string }) {
  return (
    <span className={cn('font-semibold tabular-nums', colorFor(balanceCents), className)}>
      {balanceStatus(balanceCents) === 'credit'
        ? `${formatCentsAbs(balanceCents)} cr`
        : formatCents(balanceCents)}
    </span>
  );
}

/** A small status pill: Owes / Settled / In credit, plus an "Over limit" flag. */
export function StatusPill({
  balanceCents,
  attention = false,
}: {
  balanceCents: Cents;
  attention?: boolean;
}) {
  const status = balanceStatus(balanceCents);
  const styles =
    status === 'owing'
      ? 'bg-debt-soft text-debt'
      : status === 'credit'
        ? 'bg-settled-soft text-settled'
        : 'bg-line/60 text-ink-muted';
  const label = status === 'owing' ? 'Owes' : status === 'credit' ? 'In credit' : 'Settled';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('pill', styles)}>{label}</span>
      {attention && status === 'owing' ? (
        <span className="pill bg-attention-soft text-attention">Over limit</span>
      ) : null}
    </span>
  );
}
