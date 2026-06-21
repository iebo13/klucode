// ─── Capabilities (§8) ─────────────────────────────────────────────────────
// The SINGLE source of truth in code for who can do what. The UI hides what the
// data layer forbids — but these are courtesy guards; the real lock is the RLS
// and RPCs in supabase/migrations/0002_rls.sql, which mirror this table.

export type Role = 'owner' | 'manager' | 'employee';

export const ROLES: readonly Role[] = ['owner', 'manager', 'employee'] as const;

export const can = {
  recordEntry: (_role: Role) => true,
  addCustomer: (_role: Role) => true,
  seeReports: (role: Role) => role !== 'employee',
  voidRecord: (role: Role) => role === 'owner',
  exportData: (role: Role) => role === 'owner',
  manageTeam: (role: Role) => role === 'owner',
} as const;

export type Capability = keyof typeof can;

/** Human label for a role, for the Team screen and badges. */
export function roleLabel(role: Role): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'employee':
      return 'Employee';
  }
}
