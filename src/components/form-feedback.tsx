import { type FormState } from '@/lib/forms';
import { cn } from '@/lib/cn';

/** Honest, visible result of a write — never implies a save that didn't happen (§12). */
export function FormFeedback({ state }: { state: FormState }) {
  if (state.status === 'idle') return null;
  const isError = state.status === 'error';
  if (!isError && !state.message) return null;

  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={cn(
        'rounded-lg px-3 py-2 text-sm',
        isError ? 'bg-debt-soft text-debt' : 'bg-settled-soft text-settled',
      )}
    >
      {state.message}
    </p>
  );
}

/** Inline, field-level validation message. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-debt">{message}</p>;
}
