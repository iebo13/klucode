'use client';

import { type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { cn } from '@/lib/cn';

/** A submit button that shows its own pending state via useFormStatus (§13). */
export function SubmitButton({
  children,
  className,
  pendingText = 'Saving…',
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={cn('btn-primary', className)}>
      {pending ? pendingText : children}
    </button>
  );
}
