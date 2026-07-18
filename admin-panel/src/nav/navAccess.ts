import { staffHasPermission, type StaffSession } from '../api/client';
import type { AdminNavItem } from './adminNav';
import { sectionsForBackendRole } from '../api/staff';
import type { SectionKey } from '../data/mockStaff';

const RECEPTIONIST_NAV = new Set(['dashboard', 'applications', 'receptionist']);

export function isNavItemVisible(
  staff: StaffSession | null | undefined,
  item: AdminNavItem,
  hasPermission: typeof staffHasPermission
): boolean {
  if (!item.enabled) return false;
  if (!staff) return false;
  if (staff.role === 'super_admin') return true;

  if (item.id === 'staff') {
    return hasPermission(staff, 'staff:manage');
  }

  if (staff.role === 'receptionist') {
    return RECEPTIONIST_NAV.has(item.id);
  }

  const sections = sectionsForBackendRole(staff.role);
  const key = item.id as SectionKey;
  if (key in sections) return sections[key];

  return true;
}

export function defaultHomePath(staff: StaffSession | null | undefined): string {
  if (staff?.role === 'receptionist') return '/receptionist';
  return '/applications';
}
