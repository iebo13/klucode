'use client';

import { cents, formatCents } from '@/lib/money';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const MAX_CENTS = 9_999_999; // caps entry at €99,999.99

/**
 * A controlled numeric keypad that builds an integer number of cents, the way a
 * card terminal does: pressing 1,2,5,0 makes €12.50. Optimised for one-handed
 * use at the counter (§9 screen 5) — big hit targets, no decimal fiddling.
 */
export function Keypad({
  cents: value,
  onChange,
}: {
  cents: number;
  onChange: (next: number) => void;
}) {
  const press = (digit: number) => onChange(Math.min(value * 10 + digit, MAX_CENTS));
  const backspace = () => onChange(Math.floor(value / 10));
  const clear = () => onChange(0);

  return (
    <div>
      <div className="card mb-3 px-4 py-6 text-center">
        <span className="text-5xl font-semibold tabular-nums text-ink">
          {formatCents(cents(value))}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(Number(digit))}
            className="btn-secondary text-xl"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="btn-secondary text-xl"
          aria-label="Clear amount"
        >
          C
        </button>
        <button type="button" onClick={() => press(0)} className="btn-secondary text-xl">
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          className="btn-secondary text-xl"
          aria-label="Delete last digit"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
