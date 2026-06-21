import { type Role } from '@/lib/permissions';

/** A member of the café team. One row per auth user. */
export interface Staff {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
}
