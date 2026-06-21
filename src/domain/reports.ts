import { type Cents } from '@/lib/money';

/** One day's totals for the Reports bar chart (§9 screen 7). */
export interface ReportDay {
  day: string; // yyyy-mm-dd
  chargedCents: Cents;
  collectedCents: Cents;
}

/** A flat, exportable row of the financial history (owner CSV export). */
export interface ExportRow {
  eventId: string;
  customerName: string;
  type: string;
  amountCents: Cents;
  label: string | null;
  method: string | null;
  recordedBy: string;
  recordedAt: string;
  voidedBy: string | null;
  voidedAt: string | null;
}
