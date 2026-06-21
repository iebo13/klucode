'use client';

import { useMemo, useState } from 'react';

import { type CustomerWithBalance } from '@/domain/customers';

import { CustomerRow } from './customer-row';

/**
 * Client-side search over the (small) café roster — instant, no round-trip per
 * keystroke (§9 screen 3). Findable in seconds.
 */
export function SearchableCustomers({
  customers,
  alertEnabled,
  alertThresholdCents,
}: {
  customers: CustomerWithBalance[];
  alertEnabled: boolean;
  alertThresholdCents: number;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q),
    );
  }, [customers, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input mb-4"
        placeholder="Search by name or phone…"
        aria-label="Search customers"
        type="search"
      />
      {filtered.length === 0 ? (
        <p className="card p-6 text-center text-ink-muted">No customers match your search.</p>
      ) : (
        <div className="card divide-y divide-line">
          {filtered.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              attention={alertEnabled && customer.balanceCents > alertThresholdCents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
