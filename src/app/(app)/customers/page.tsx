import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { RealtimeRefresher } from '@/components/realtime-refresher';
import { SearchableCustomers } from '@/components/searchable-customers';
import { listCustomersWithBalances } from '@/lib/data/customers';
import { getCafeSettings } from '@/lib/data/settings';

export default async function CustomersPage() {
  const [customers, settings] = await Promise.all([listCustomersWithBalances(), getCafeSettings()]);

  return (
    <div>
      <RealtimeRefresher table="events" />
      <RealtimeRefresher table="customers" />
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} on the books`}
        action={
          <Link href="/customers/new" className="btn-primary">
            Add customer
          </Link>
        }
      />
      <SearchableCustomers
        customers={customers}
        alertEnabled={settings.alertEnabled}
        alertThresholdCents={settings.alertThresholdCents}
      />
    </div>
  );
}
