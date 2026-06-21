import { type AppEvent } from './events';
import { type Cents, cents } from '@/lib/money';

/**
 * §3 expressed in code: the balance is a SUM over surviving events, never a
 * stored number. This is the SINGLE implementation — the SQL view
 * `customer_balances` applies the identical rule, so the two never disagree.
 * Do not reimplement this sum anywhere else (§11 DRY).
 */
export function deriveBalanceCents(events: readonly AppEvent[]): Cents {
  let total = 0;
  for (const event of events) {
    if (event.voidedAt !== null) continue; // voided rows count for nothing
    total += event.type === 'charge' ? event.amountCents : -event.amountCents;
  }
  return cents(total);
}

export interface BalanceBreakdown {
  chargedCents: Cents;
  paidCents: Cents;
  balanceCents: Cents;
}

/**
 * The balance split into its parts so the detail page can show "how it was
 * reached" (§9 screen 4): total charged − total paid = current balance. Voided
 * events are excluded, exactly as in deriveBalanceCents.
 */
export function summariseBalance(events: readonly AppEvent[]): BalanceBreakdown {
  let charged = 0;
  let paid = 0;
  for (const event of events) {
    if (event.voidedAt !== null) continue;
    if (event.type === 'charge') charged += event.amountCents;
    else paid += event.amountCents;
  }
  return {
    chargedCents: cents(charged),
    paidCents: cents(paid),
    balanceCents: cents(charged - paid),
  };
}

export type BalanceStatus = 'owing' | 'settled' | 'credit';

export function balanceStatus(balanceCents: Cents): BalanceStatus {
  if (balanceCents > 0) return 'owing';
  if (balanceCents < 0) return 'credit';
  return 'settled';
}

export interface TimelineEntry {
  event: AppEvent;
  /** Running balance after this event, in chronological order. */
  runningBalanceCents: Cents;
}

/**
 * Attach a running balance to each event so the customer timeline can show
 * "how the current number was reached" (§9 screen 4). Voided events keep their
 * place but do not move the running total.
 */
export function withRunningBalance(eventsOldestFirst: readonly AppEvent[]): TimelineEntry[] {
  let total = 0;
  return eventsOldestFirst.map((event) => {
    if (event.voidedAt === null) {
      total += event.type === 'charge' ? event.amountCents : -event.amountCents;
    }
    return { event, runningBalanceCents: cents(total) };
  });
}
