import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { RecordPaymentForm } from '@/components/record-payment-form';
import { deriveBalanceCents } from '@/domain/balances';
import { getCustomerById } from '@/lib/data/customers';
import { listEventsForCustomer } from '@/lib/data/events';

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, events] = await Promise.all([getCustomerById(id), listEventsForCustomer(id)]);
  if (!customer) notFound();

  const balanceCents = deriveBalanceCents(events);

  return (
    <div>
      <PageHeader title="Record a payment" subtitle={customer.name} />
      <div className="card p-5">
        <RecordPaymentForm customerId={id} balanceCents={balanceCents} />
      </div>
      <Link
        href={`/customers/${id}`}
        className="mt-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Back to {customer.name}
      </Link>
    </div>
  );
}
