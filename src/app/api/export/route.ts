import { NextResponse } from 'next/server';

import { getExportRows } from '@/lib/data/reports';
import { getSessionStaff } from '@/lib/data/staff';
import { toCsv } from '@/lib/csv';
import { formatCents } from '@/lib/money';
import { can } from '@/lib/permissions';

/**
 * Owner-only CSV export of the full event history. Gated here AND by the
 * export_events RPC (which raises for non-owners), so the lock is real, not
 * just a hidden button (§8).
 */
export async function GET() {
  const staff = await getSessionStaff();
  if (!staff) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (!can.exportData(staff.role)) {
    return NextResponse.json({ error: 'Export is owner-only' }, { status: 403 });
  }

  const rows = await getExportRows();
  const headers = [
    'Event ID',
    'Customer',
    'Type',
    'Amount',
    'Amount (cents)',
    'Note',
    'Method',
    'Recorded by',
    'Recorded at',
    'Voided by',
    'Voided at',
  ];
  const body = rows.map((r) => [
    r.eventId,
    r.customerName,
    r.type,
    formatCents(r.amountCents),
    String(r.amountCents),
    r.label ?? '',
    r.method ?? '',
    r.recordedBy,
    r.recordedAt,
    r.voidedBy ?? '',
    r.voidedAt ?? '',
  ]);

  const csv = toCsv(headers, body);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cafetab-export-${today}.csv"`,
    },
  });
}
