'use client';

import { useActionState, useState } from 'react';

import { recordCharge } from '@/app/actions/record-event';
import { idleFormState } from '@/lib/forms';
import { cents, formatCents } from '@/lib/money';

import { FormFeedback } from './form-feedback';
import { Keypad } from './keypad';
import { SubmitButton } from './submit-button';

// A few common item prices so the fast path is even faster (§9 screen 5).
const PRESETS: ReadonlyArray<{ label: string; cents: number }> = [
  { label: 'Espresso', cents: 150 },
  { label: 'Flat white', cents: 320 },
  { label: 'Sandwich', cents: 650 },
  { label: 'Lunch menu', cents: 1250 },
];

export function RecordChargeForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState(recordCharge, idleFormState);
  const [amountCents, setAmountCents] = useState(0);
  const [label, setLabel] = useState('');

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="amountCents" value={amountCents} />

      <Keypad cents={amountCents} onChange={setAmountCents} />

      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setAmountCents(preset.cents);
              setLabel(preset.label);
            }}
            className="btn-secondary justify-between"
          >
            <span>{preset.label}</span>
            <span className="tabular-nums text-ink-muted">{formatCents(cents(preset.cents))}</span>
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="label">
          Note (optional)
        </label>
        <input
          id="label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input"
          placeholder="What was it for?"
          maxLength={120}
        />
      </div>

      <FormFeedback state={state} />

      <SubmitButton className="w-full" pendingText="Recording…" disabled={amountCents === 0}>
        Add {formatCents(cents(amountCents))} to tab
      </SubmitButton>
    </form>
  );
}
