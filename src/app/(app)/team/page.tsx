import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { TeamManager } from '@/components/team-manager';
import { getSessionStaff, listStaff } from '@/lib/data/staff';
import { can } from '@/lib/permissions';

export default async function TeamPage() {
  const staff = await getSessionStaff();
  if (!staff || !can.manageTeam(staff.role)) redirect('/dashboard');

  const members = await listStaff();

  return (
    <div>
      <PageHeader title="Team" subtitle="Who has access, and at what role." />
      <TeamManager currentStaffId={staff.id} members={members} />
    </div>
  );
}
