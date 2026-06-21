import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { RealtimeRefresher } from '@/components/realtime-refresher';
import { ReportsChart } from '@/components/reports-chart';
import { getReportRange } from '@/lib/data/reports';
import { getSessionStaff } from '@/lib/data/staff';
import { can } from '@/lib/permissions';

export default async function ReportsPage() {
  const staff = await getSessionStaff();
  // Routing guard mirrors the RPC lock — employees are turned away here AND by
  // report_range raising in the data layer (§7).
  if (!staff || !can.seeReports(staff.role)) redirect('/dashboard');

  const days = await getReportRange(7);

  return (
    <div>
      <RealtimeRefresher table="events" />
      <PageHeader
        title="Reports"
        subtitle="Charged vs collected, last 7 days"
        action={
          can.exportData(staff.role) ? (
            <a href="/api/export" className="btn-secondary" download>
              Export CSV
            </a>
          ) : undefined
        }
      />
      <ReportsChart days={days} />
    </div>
  );
}
