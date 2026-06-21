import Link from 'next/link';

import { type CustomerWithBalance } from '@/domain/customers';

import { Balance, StatusPill } from './balance';

/** One line in the address book: name, phone, and the hero — their balance. */
export function CustomerRow({
  customer,
  attention,
}: {
  customer: CustomerWithBalance;
  attention: boolean;
}) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-paper"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{customer.name}</p>
        <p className="truncate text-sm text-ink-faint">{customer.phone ?? 'No phone'}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Balance balanceCents={customer.balanceCents} />
        <StatusPill balanceCents={customer.balanceCents} attention={attention} />
      </div>
    </Link>
  );
}
