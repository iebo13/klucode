import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Amount } from '@/components/amount';
import { Balance, StatusPill } from '@/components/balance';
import { PageHeader } from '@/components/page-header';
import { RealtimeRefresher } from '@/components/realtime-refresher';
import { Timeline } from '@/components/timeline';
import { summariseBalance, withRunningBalance } from '@/domain/balances';
import { getCustomerById } from '@/lib/data/customers';
import { listEventsForCustomer } from '@/lib/data/events';
import { getCafeSettings } from '@/lib/data/settings';
import { getSessionStaff } from '@/lib/data/staff';
import { can } from '@/lib/permissions';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await getSessionStaff();
  if (!staff) redirect('/login');

  const [customer, events, settings] = await Promise.all([
    getCustomerById(id),
    listEventsForCustomer(id),
    getCafeSettings(),
  ]);
  if (!customer) notFound();

  const { chargedCents, paidCents, balanceCents } = summariseBalance(events);
  const timeline = withRunningBalance(events).reverse(); // newest first for display
  const overLimit = settings.alertEnabled && balanceCents > settings.alertThresholdCents;

  return (
    <div>
      <RealtimeRefresher table="events" filter={`customer_id=eq.${id}`} />
      <PageHeader title={customer.name} subtitle={customer.phone ?? 'No phone on file'} />

      {/* The hero: the current balance, and exactly how it was reached (§3). */}
      <div className="card p-6">
        <p className="text-sm font-medium text-ink-muted">Current balance</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <Balance balanceCents={balanceCents} className="text-4xl sm:text-5xl" />
          <StatusPill balanceCents={balanceCents} attention={overLimit} />
        </div>
        <p className="mt-3 text-sm text-ink-faint">
          <Amount cents={chargedCents} /> charged − <Amount cents={paidCents} /> paid ={' '}
          <Amount cents={balanceCents} className="font-medium text-ink-muted" />
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href={`/customers/${id}/charge`} className="btn-primary">
          Record charge
        </Link>
        <Link
          href={`/customers/${id}/pay`}
          className="btn inline-flex bg-settled text-white hover:bg-settled/90"
        >
          Record payment
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">History</h2>
        <Timeline entries={timeline} canVoid={can.voidRecord(staff.role)} />
      </section>
    </div>
  );
}
