import { describe, expect, it } from 'vitest';

import { deriveBalanceCents, summariseBalance, withRunningBalance } from '@/domain/balances';
import { type AppEvent, type EventType, type PaymentMethod } from '@/domain/events';
import { type Cents, cents, formatCents, formatCentsAbs, parseAmountToCents } from '@/lib/money';

// A small factory so each test states only what matters. `extra` deliberately
// excludes amountCents to keep the Cents brand the factory's responsibility.
interface EventExtra {
  label?: string | null;
  method?: PaymentMethod | null;
  voidedBy?: string | null;
  voidedAt?: string | null;
}

let seq = 0;
function event(type: EventType, amount: number, extra: EventExtra = {}): AppEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    customerId: 'c1',
    type,
    amountCents: cents(amount),
    label: extra.label ?? null,
    method: extra.method ?? null,
    createdBy: 's1',
    recordedByName: 'Tester',
    createdAt: `2026-01-0${Math.min(seq, 9)}T10:00:00.000Z`,
    voidedBy: extra.voidedBy ?? null,
    voidedByName: null,
    voidedAt: extra.voidedAt ?? null,
  };
}

const charge = (amount: number, extra: EventExtra = {}) => event('charge', amount, extra);
const payment = (amount: number, extra: EventExtra = {}) =>
  event('payment', amount, { method: 'cash', ...extra });

describe('deriveBalanceCents — §3, the one rule', () => {
  it('is zero for no events', () => {
    expect(deriveBalanceCents([])).toBe(0);
  });

  it('adds charges and subtracts payments', () => {
    const balance = deriveBalanceCents([charge(1200), charge(300), payment(500)]);
    expect(balance).toBe(1000);
  });

  it('settles to exactly zero when paid in full', () => {
    expect(deriveBalanceCents([charge(1500), payment(1500)])).toBe(0);
  });

  it('excludes voided events entirely', () => {
    const events = [
      charge(1000),
      charge(9999, { voidedAt: '2026-01-02T10:00:00.000Z', voidedBy: 's1' }),
    ];
    expect(deriveBalanceCents(events)).toBe(1000);
  });

  it('can go into credit (negative) on overpayment', () => {
    expect(deriveBalanceCents([charge(500), payment(800)])).toBe(-300);
  });
});

describe('withRunningBalance', () => {
  it('builds a running total in order, untouched by voided rows', () => {
    const events = [
      charge(1000),
      charge(500, { voidedAt: '2026-01-09T10:00:00.000Z', voidedBy: 's1' }),
      payment(400),
    ];
    const running = withRunningBalance(events).map((e) => e.runningBalanceCents);
    expect(running).toEqual([1000, 1000, 600]);
  });
});

describe('summariseBalance — "how it was reached"', () => {
  it('splits charged and paid, excluding voids', () => {
    const events = [
      charge(1200),
      payment(500),
      charge(999, { voidedAt: '2026-01-09T10:00:00.000Z', voidedBy: 's1' }),
    ];
    const { chargedCents, paidCents, balanceCents } = summariseBalance(events);
    expect(chargedCents).toBe(1200);
    expect(paidCents).toBe(500);
    expect(balanceCents).toBe(700);
  });
});

describe('money', () => {
  it('formats cents as €1,234.56', () => {
    expect(formatCents(cents(123456))).toBe('€1,234.56');
    expect(formatCents(cents(0))).toBe('€0.00');
    expect(formatCents(cents(-300))).toBe('-€3.00');
  });

  it('formats absolute magnitude without a sign', () => {
    expect(formatCentsAbs(cents(-300))).toBe('€3.00');
  });

  it('parses euro strings into positive cents', () => {
    expect(parseAmountToCents('12.50')).toBe(1250);
    expect(parseAmountToCents('12,5')).toBe(1250);
    expect(parseAmountToCents('7')).toBe(700);
    expect(parseAmountToCents('€3.05')).toBe(305);
  });

  it('rejects zero, negatives, and nonsense', () => {
    expect(parseAmountToCents('0')).toBeNull();
    expect(parseAmountToCents('-5')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('1.234')).toBeNull();
  });

  it('refuses to brand a non-integer as Cents', () => {
    expect(() => cents(1.5)).toThrow();
  });

  it('keeps the Cents brand through sums', () => {
    const total: Cents = deriveBalanceCents([charge(100), charge(250)]);
    expect(total).toBe(350);
  });
});
