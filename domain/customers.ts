import { z } from 'zod';

import { type Cents } from '@/lib/money';

/** A café customer who is trusted to run a tab. */
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  createdBy: string;
  createdAt: string;
}

/** A customer with their derived current balance attached (§3). */
export interface CustomerWithBalance extends Customer {
  balanceCents: Cents;
}

export const addCustomerSchema = z.object({
  name: z.string().trim().min(1, 'A name is required').max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type AddCustomerInput = z.infer<typeof addCustomerSchema>;
