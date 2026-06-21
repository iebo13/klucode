import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Amount } from '@/components/amount';
import { CustomerRow } from '@/components/customer-row';
import { PageHeader } from '@/components/page-header';
import { RealtimeRefresher } from '@/components/realtime-refresher';
import { StatCard } from '@/components/stat-card';
import { listCustomersWithBalances } from '@/lib/data/customers';
import { getTodayTotals } from '@/lib/data/dashboard';
import { getCafeSettings } from '@/lib/data/settings';
import { getSessionStaff } from '@/lib/data/staff';
import { cents } from '@/lib/money';
import { can } from '@/lib/permissions';

export default async function DashboardPage() {
  const staff = await getSessionStaff();
  if (!staff) redirect('/login');

  const [customers, today, settings] = await Promise.all([
    listCustomersWithBalances(),
    getTodayTotals(),
    getCafeSettings(),
  ]);

  // Total outstanding sums only what is owed — a customer in credit doesn't
  // cancel out another's debt.
  const outstanding = cents(
    customers.reduce<number>((sum, c) => sum + Math.max(c.balanceCents, 0), 0),
  );
  const debtors = customers
    .filter((c) => c.balanceCents > 0)
    .sort((a, b) => b.balanceCents - a.balanceCents)
    .slice(0, 5);

  return (
    <div>
      <RealtimeRefresher table="events" />
      <PageHeader
        title={`Good day, ${staff.name.split(' ')[0] ?? staff.name}`}
        subtitle="The morning glance."
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total outstanding" tone="debt" hero hint="Owed to the café right now">
          <Amount cents={outstanding} />
        </StatCard>
        <StatCard label="Collected today" tone="settled">
          <Amount cents={today.collectedTodayCents} />
        </StatCard>
        <StatCard label="New debt today" tone="debt">
          <Amount cents={today.chargedTodayCents} />
        </StatCard>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Biggest debtors</h2>
          <Link href="/customers" className="text-sm font-medium text-ink-muted hover:text-ink">
            All customers
          </Link>
        </div>
        {debtors.length === 0 ? (
          <p className="card p-6 text-center text-ink-muted">
            No outstanding tabs. Everyone is settled.
          </p>
        ) : (
          <div className="card divide-y divide-line">
            {debtors.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                attention={
                  settings.alertEnabled && customer.balanceCents > settings.alertThresholdCents
                }
              />
            ))}
          </div>
        )}
      </section>

      {can.seeReports(staff.role) ? (
        <section className="mt-8">
          <Link
            href="/reports"
            className="card flex items-center justify-between p-5 transition-colors hover:bg-paper"
          >
            <div>
              <p className="font-semibold text-ink">Reports</p>
              <p className="text-sm text-ink-muted">Charged vs collected over the week</p>
            </div>
            <span aria-hidden className="text-ink-faint">
              →
            </span>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
