import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { RecordChargeForm } from '@/components/record-charge-form';
import { getCustomerById } from '@/lib/data/customers';

export default async function ChargePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title="Record a charge" subtitle={customer.name} />
      <div className="card p-5">
        <RecordChargeForm customerId={id} />
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
