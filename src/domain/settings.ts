import { z } from 'zod';

import { type Cents } from '@/lib/money';

export interface CafeSettings {
  cafeName: string;
  currency: string;
  timeZone: string;
  alertEnabled: boolean;
  alertThresholdCents: Cents;
}

// Currency is fixed to EUR (§6), so it is not part of the editable form.
export const updateSettingsSchema = z.object({
  cafeName: z.string().trim().min(1, 'A café name is required').max(80),
  timeZone: z.string().trim().min(1, 'A time zone is required').max(64),
  alertEnabled: z.boolean(),
  alertThresholdCents: z.coerce.number().int().nonnegative('Threshold cannot be negative'),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
