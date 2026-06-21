// ─── Money (§12) ─────────────────────────────────────────────────────────
// Money is integer cents, ALWAYS. Never a float of euros. We brand the type so
// a bare `number` can't be passed where cents are expected, and we format only
// at the view edge. Currency is EUR, displayed as €1,234.56.

declare const centsBrand: unique symbol;

/** A non-negative-or-signed integer number of euro cents. */
export type Cents = number & { readonly [centsBrand]: 'Cents' };

/** Smart-constructor: the single doorway into the `Cents` type. */
export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`Cents must be a whole number, received ${value}`);
  }
  return value as Cents;
}

const EUR = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
});

/** Format cents for display: 123456 → "€1,234.56". */
export function formatCents(value: Cents): string {
  return EUR.format(value / 100);
}

/** Format the magnitude only (no sign), for places that label sign separately. */
export function formatCentsAbs(value: Cents): string {
  return EUR.format(Math.abs(value) / 100);
}

/**
 * Parse a euros string ("12.50", "12,5", "7") into positive Cents, or null if
 * it isn't a valid positive amount. The keypad works in cents directly; this
 * backs any plain text amount field.
 */
export function parseAmountToCents(input: string): Cents | null {
  const cleaned = input.trim().replace(/[€\s]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const dot = cleaned.indexOf('.');
  const whole = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const frac = dot === -1 ? '' : cleaned.slice(dot + 1);
  const total = Number(whole) * 100 + Number((frac + '00').slice(0, 2));

  if (!Number.isFinite(total) || total <= 0) return null;
  return cents(total);
}
