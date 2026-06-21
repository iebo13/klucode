import { type ReportDay } from '@/domain/reports';
import { cn } from '@/lib/cn';
import { formatWeekday } from '@/lib/dates';
import { type Cents, cents, formatCents } from '@/lib/money';

function Bar({ value, max, tone }: { value: Cents; max: number; tone: 'debt' | 'settled' }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/50">
        <div
          className={cn('h-full rounded-full', tone === 'debt' ? 'bg-debt' : 'bg-settled')}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-muted">
        {formatCents(value)}
      </span>
    </div>
  );
}

/** Charged vs collected over the reporting window, with totals and net (§9.7). */
export function ReportsChart({ days }: { days: ReportDay[] }) {
  const totalCharged = cents(days.reduce<number>((sum, d) => sum + d.chargedCents, 0));
  const totalCollected = cents(days.reduce<number>((sum, d) => sum + d.collectedCents, 0));
  const net = cents(totalCollected - totalCharged);
  const max = Math.max(1, ...days.map((d) => Math.max(d.chargedCents, d.collectedCents)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-muted">New debt</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-debt">
            {formatCents(totalCharged)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-muted">Collected</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-settled">
            {formatCents(totalCollected)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-muted">Net to tabs</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCents(net)}</p>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="card p-6 text-center text-ink-muted">No activity in this period.</p>
      ) : (
        <div className="card divide-y divide-line">
          {days.map((day) => (
            <div key={day.day} className="px-4 py-3">
              <p className="mb-2 text-sm font-medium text-ink">{formatWeekday(day.day)}</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-ink-faint">charged</span>
                  <Bar value={day.chargedCents} max={max} tone="debt" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-ink-faint">collected</span>
                  <Bar value={day.collectedCents} max={max} tone="settled" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
