import { z } from 'zod';

import { type Cents } from '@/lib/money';

export type EventType = 'charge' | 'payment';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'transfer'] as const;

/**
 * One immutable fact in a customer's financial history (§3). `amountCents` is
 * always positive; `type` carries the sign. A voided event keeps its row and
 * its place in the timeline — it simply stops counting toward the balance.
 */
export interface AppEvent {
  id: string;
  customerId: string;
  type: EventType;
  amountCents: Cents;
  label: string | null;
  method: PaymentMethod | null;
  createdBy: string;
  recordedByName: string;
  createdAt: string;
  voidedBy: string | null;
  voidedByName: string | null;
  voidedAt: string | null;
}

export function isVoided(event: AppEvent): boolean {
  return event.voidedAt !== null;
}

const labelField = z
  .string()
  .trim()
  .max(120, 'Keep the note under 120 characters')
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// ─── Validation at the trust boundary (§12) ───────────────────────────────
// Defined once here; imported by both the Server Actions and the forms.

export const recordChargeSchema = z.object({
  customerId: z.string().uuid(),
  amountCents: z.coerce.number().int().positive('Enter an amount greater than zero'),
  label: labelField,
});

export const recordPaymentSchema = z.object({
  customerId: z.string().uuid(),
  amountCents: z.coerce.number().int().positive('Enter an amount greater than zero'),
  method: z.enum(['cash', 'card', 'transfer'], { message: 'Choose a payment method' }),
  label: labelField,
});

export const voidEventSchema = z.object({
  eventId: z.string().uuid(),
});

export type RecordChargeInput = z.infer<typeof recordChargeSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type VoidEventInput = z.infer<typeof voidEventSchema>;
