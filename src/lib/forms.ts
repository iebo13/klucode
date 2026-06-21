import { type ZodError } from 'zod';

// Shared shape for Server Action results consumed by useActionState. Actions
// that redirect on success simply never return the success branch.
export type FormState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'success'; message?: string };

export const idleFormState: FormState = { status: 'idle' };

/** First error message per field, for inline form feedback. */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
