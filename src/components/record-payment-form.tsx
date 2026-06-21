'use client';

import { useActionState, useState } from 'react';

import { type PaymentMethod, PAYMENT_METHODS } from '@/domain/events';
import { recordPayment } from '@/app/actions/record-event';
import { idleFormState } from '@/lib/forms';
import { cents, formatCents } from '@/lib/money';
import { cn } from '@/lib/cn';

import { FormFeedback } from './form-feedback';
import { Keypad } from './keypad';
import { SubmitButton } from './submit-button';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
};

export function RecordPaymentForm({
  customerId,
  balanceCents,
}: {
  customerId: string;
  balanceCents: number;
}) {
  const [state, action] = useActionState(recordPayment, idleFormState);
  const [amountCents, setAmountCents] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="amountCents" value={amountCents} />
      <input type="hidden" name="method" value={method} />

      <Keypad cents={amountCents} onChange={setAmountCents} />

      {balanceCents > 0 ? (
        <button
          type="button"
          onClick={() => setAmountCents(balanceCents)}
          className="btn-secondary w-full"
        >
          Pay full balance · {formatCents(cents(balanceCents))}
        </button>
      ) : null}

      <fieldset>
        <legend className="label">Method</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              aria-pressed={method === m}
              className={cn(
                'btn',
                method === m
                  ? 'bg-ink text-white'
                  : 'border border-line bg-white text-ink hover:bg-line/50',
              )}
            >
              {METHOD_LABELS[m]}
            </button>
          ))}
        </div>
      </fieldset>

      <FormFeedback state={state} />

      <SubmitButton
        className="w-full bg-settled hover:bg-settled/90"
        pendingText="Recording…"
        disabled={amountCents === 0}
      >
        Record {formatCents(cents(amountCents))} payment
      </SubmitButton>
    </form>
  );
}
