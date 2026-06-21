import Link from 'next/link';

import { AddCustomerForm } from '@/components/add-customer-form';
import { PageHeader } from '@/components/page-header';

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="Add customer" subtitle="A new name on the books." />
      <div className="card max-w-md p-6">
        <AddCustomerForm />
      </div>
      <Link href="/customers" className="mt-4 inline-block text-sm text-ink-muted hover:text-ink">
        ← Back to customers
      </Link>
    </div>
  );
}
