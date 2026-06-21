import { type TimelineEntry } from '@/domain/balances';
import { isVoided } from '@/domain/events';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/dates';
import { formatCents, formatCentsAbs } from '@/lib/money';

import { VoidButton } from './void-button';

/**
 * One person's full story as a timeline (§9 screen 4): every charge and payment,
 * a running balance per row, and voided rows kept visible — struck through,
 * attributed to whoever voided them. Pass entries newest-first.
 */
export function Timeline({ entries, canVoid }: { entries: TimelineEntry[]; canVoid: boolean }) {
  if (entries.length === 0) {
    return <p className="card p-6 text-center text-ink-muted">No charges or payments yet.</p>;
  }

  return (
    <ol className="card divide-y divide-line">
      {entries.map(({ event, runningBalanceCents }) => {
        const voided = isVoided(event);
        const isCharge = event.type === 'charge';
        return (
          <li key={event.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">
                    {event.label ?? (isCharge ? 'Charge' : 'Payment')}
                  </span>
                  {voided ? <span className="pill bg-line/60 text-ink-muted">Voided</span> : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-faint">
                  {formatDateTime(event.createdAt)} · by {event.recordedByName}
                  {event.method ? ` · ${event.method}` : ''}
                </p>
                {voided && event.voidedAt ? (
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Voided by {event.voidedByName ?? 'owner'} on {formatDateTime(event.voidedAt)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    'font-semibold tabular-nums',
                    voided
                      ? 'text-ink-faint line-through'
                      : isCharge
                        ? 'text-debt'
                        : 'text-settled',
                  )}
                >
                  {isCharge ? '+' : '−'}
                  {formatCentsAbs(event.amountCents)}
                </p>
                <p className="text-xs tabular-nums text-ink-faint">
                  balance {formatCents(runningBalanceCents)}
                </p>
                {canVoid && !voided ? (
                  <div className="mt-1.5">
                    <VoidButton eventId={event.id} />
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
