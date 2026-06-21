import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { SettingsForm } from '@/components/settings-form';
import { getCafeSettings } from '@/lib/data/settings';
import { getSessionStaff } from '@/lib/data/staff';
import { can } from '@/lib/permissions';

export default async function SettingsPage() {
  const staff = await getSessionStaff();
  if (!staff) redirect('/login');

  const settings = await getCafeSettings();

  return (
    <div>
      <PageHeader title="Settings" subtitle="How this café keeps its tab." />
      <div className="card max-w-lg p-6">
        <SettingsForm settings={settings} canEdit={can.manageTeam(staff.role)} />
      </div>
    </div>
  );
}
