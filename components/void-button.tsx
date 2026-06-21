'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { voidEvent } from '@/app/actions/void-event';
import { idleFormState } from '@/lib/forms';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-danger min-h-0 px-3 py-1.5 text-xs">
      {pending ? 'Voiding…' : 'Confirm void'}
    </button>
  );
}

/**
 * Voiding carries real weight, so it takes an explicit confirm step (§9). It
 * records a correction — it never deletes the original row.
 */
export function VoidButton({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(voidEvent, idleFormState);
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="btn-secondary min-h-0 px-3 py-1.5 text-xs"
      >
        Void
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center justify-end gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <ConfirmButton />
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-xs text-ink-muted underline"
      >
        Cancel
      </button>
      {state.status === 'error' ? <span className="text-xs text-debt">{state.message}</span> : null}
    </form>
  );
}
